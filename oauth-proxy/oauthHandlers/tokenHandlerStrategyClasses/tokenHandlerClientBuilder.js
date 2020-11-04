const {
  RefreshTokenStrategy,
} = require("./tokenStrategies/refreshTokenStrategy");
const {
  AuthorizationCodeStrategy,
} = require("./tokenStrategies/authorizationCodeStrategy");
const {
  ClientCredentialsStrategy,
} = require("./tokenStrategies/clientCredentialsStrategy");
const {
  UnsupportedGrantStrategy,
} = require("./tokenStrategies/unsupportedGrantStrategy");
const { TokenHandlerClient } = require("./tokenHandlerClient");
const {
  PullDocumentByCodeStrategy,
} = require("./pullDocumentStrategies/pullDocumentByCodeStrategy");
const {
  PullDocumentByRefreshTokenStrategy,
} = require("./pullDocumentStrategies/pullDocumentByRefreshTokenStrategy");
const {
  PullDocumentNoStrategy,
} = require("./pullDocumentStrategies/pullDocumentNoStrategy");
const {
  SaveDocumentStateStrategy,
} = require("./saveDocumentStrategies/saveDocumentStateStrategy");
const {
  SaveDocumentNoStrategy,
} = require("./saveDocumentStrategies/saveDocumentNoStrategy");
const {
  GetPatientInfoFromValidateEndpointStrategy,
} = require("./getPatientInfoStrategies/getPatientInfoFromValidateEndpointStrategy");
const {
  GetPatientInfoFromLaunchStrategy,
} = require("./getPatientInfoStrategies/getPatientInfoFromLaunchStrategy");

const buildTokenHandlerClient = (
  redirect_uri,
  issuer,
  logger,
  dynamo,
  dynamoClient,
  config,
  req,
  clientMetadata,
  validateToken
) => {
  const strategies = getStrategies(
    redirect_uri,
    issuer,
    logger,
    dynamo,
    dynamoClient,
    config,
    req,
    clientMetadata,
    validateToken
  );
  return new TokenHandlerClient(
    strategies.getTokenResponseStrategy,
    strategies.pullDocumentFromDynamoStrategy,
    strategies.saveDocumentToDynamoStrategy,
    strategies.getPatientInfoStrategy,
    req,
    res,
    next
  );
};

const getStrategies = (
  redirect_uri,
  issuer,
  logger,
  dynamo,
  dynamoClient,
  config,
  req,
  validateToken
) => {
  let strategies;
  if (req.body.grant_type === "refresh_token") {
    strategies = {
      tokenHandlerStrategy: new RefreshTokenStrategy(
        req,
        logger,
        new issuer.Client(clientMetadata)
      ),
      pullDocumentFromDynamoStrategy: new PullDocumentByRefreshTokenStrategy(
        req,
        logger,
        dynamo,
        dynamoClient,
        config
      ),
      saveDocumentToDynamoStrategy: new SaveDocumentStateStrategy(
        req,
        logger,
        dynamo,
        dynamoClient,
        config
      ),
      getPatientInfoStrategy: new GetPatientInfoFromValidateEndpointStrategy(
        validateToken
      ),
    };
  } else if (req.body.grant_type === "authorization_code") {
    strategies = {
      tokenHandlerStrategy: new AuthorizationCodeStrategy(
        req,
        logger,
        redirect_uri,
        new issuer.Client(clientMetadata)
      ),
      pullDocumentFromDynamoStrategy: new PullDocumentByCodeStrategy(
        req,
        logger,
        dynamo,
        dynamoClient,
        config
      ),
      saveDocumentToDynamoStrategy: new SaveDocumentStateStrategy(
        req,
        logger,
        dynamo,
        dynamoClient,
        config
      ),
      getPatientInfoStrategy: new GetPatientInfoFromValidateEndpointStrategy(
        validateToken
      ),
    };
  } else if (req.body.grant_type === "client_credentials") {
    if (
      req.body.client_assertion_type !==
      "urn:ietf:params:oauth:client-assertion-type:jwt-bearer"
    ) {
      throw {
        status: 400,
        error: "invalid_request",
        error_description: "Client assertion type must be jwt-bearer.",
      };
    }
    strategies = {
      tokenHandlerStrategy: new ClientCredentialsStrategy(
        req,
        logger,
        dynamo,
        dynamoClient,
        issuer.token_endpoint
      ),
      pullDocumentFromDynamoStrategy: new PullDocumentNoStrategy(),
      saveDocumentToDynamoStrategy: new SaveDocumentNoStrategy(),
      getPatientInfoStrategy: new GetPatientInfoFromLaunchStrategy(req),
    };
  } else {
    strategies = { tokenHandlerStrategy: new UnsupportedGrantStrategy() };
  }
  return strategies;
};

module.exports = { buildTokenHandlerClient };
