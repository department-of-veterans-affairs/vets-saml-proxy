const { rethrowIfRuntimeError, parseBasicAuth } = require("../utils");
const {
  RefreshTokenStrategy,
} = require("./tokenHandlerStrategyClasses/refreshTokenStrategy");
const {
  AuthorizationCodeStrategy,
} = require("./tokenHandlerStrategyClasses/authorizationCodeStrategy");
const {
  UnsupportedGrantStrategy,
} = require("./tokenHandlerStrategyClasses/unsupportedGrantStrategy");
const {
  TokenHandlerClient,
} = require("./tokenHandlerStrategyClasses/tokenHandlerClient");

const tokenHandler = async (
  config,
  redirect_uri,
  logger,
  issuer,
  dynamo,
  dynamoClient,
  validateToken,
  req,
  res,
  next
) => {
  let clientMetadata;
  try {
    clientMetadata = createClientMetadata();
  } catch (error) {
    rethrowIfRuntimeError(error);
    res.status(401).json({
      error: error.error,
      error_description: error.error_description,
    });
    return next();
  }

  const client = new issuer.Client(clientMetadata);
  let tokenHandlerStrategy = getTokenStrategy(
    redirect_uri,
    client,
    logger,
    dynamo,
    dynamoClient,
    req
  );

  let tokenHandlerClient = new TokenHandlerClient(
    tokenHandlerStrategy,
    config,
    redirect_uri,
    logger,
    issuer,
    dynamo,
    dynamoClient,
    validateToken,
    req,
    res,
    next
  );

  let tokenResponse;
  try {
    tokenResponse = await tokenHandlerClient.handleToken();
  } catch (err) {
    req.query.error = err.error;
    req.query.error_description = err.error_description;
    return next(err);
  }
  res.status(tokenResponse.statusCode).json(tokenResponse.responseBody);
  return next();
};

function createClientMetadata() {
  let clientMetadata = {
    redirect_uris: [this.redirect_uri],
  };

  const basicAuth = parseBasicAuth(this.req);
  if (basicAuth) {
    clientMetadata.client_id = basicAuth.username;
    clientMetadata.client_secret = basicAuth.password;
  } else if (this.req.body.client_id && this.req.body.client_secret) {
    clientMetadata.client_id = this.req.body.client_id;
    clientMetadata.client_secret = this.req.body.client_secret;
    delete this.req.body.client_id;
    delete this.req.body.client_secret;
  } else if (
    this.config.enable_pkce_authorization_flow &&
    this.req.body.client_id
  ) {
    clientMetadata.token_endpoint_auth_method = "none";
    clientMetadata.client_id = this.req.body.client_id;
    delete this.req.body.client_id;
  } else {
    throw {
      error: "invalid_client",
      error_description: "Client authentication failed",
    };
  }
  return clientMetadata;
}

const getTokenStrategy = (
  redirect_uri,
  client,
  logger,
  dynamo,
  dynamoClient,
  req
) => {
  let tokenHandlerStrategy;
  if (req.body.grant_type === "refresh_token") {
    tokenHandlerStrategy = new RefreshTokenStrategy(
      req,
      logger,
      dynamo,
      dynamoClient,
      client
    );
  } else if (req.body.grant_type === "authorization_code") {
    tokenHandlerStrategy = new AuthorizationCodeStrategy(
      req,
      logger,
      dynamo,
      dynamoClient,
      redirect_uri,
      client
    );
  } else {
    tokenHandlerStrategy = new UnsupportedGrantStrategy();
  }
  return tokenHandlerStrategy;
};

module.exports = tokenHandler;
