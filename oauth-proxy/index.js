const express = require('express');
const cors = require('cors');
const { Issuer } = require('openid-client');
const process = require('process');
const { URLSearchParams } = require('url');
const bodyParser = require('body-parser');
const request = require('request');
const jwtDecode = require('jwt-decode');
const dynamoClient = require('./dynamo_client');
const { processArgs } = require('./cli');
const { statusCodeFromError } = require('./utils');
const okta = require('@okta/okta-sdk-nodejs');
const morgan = require('morgan');
const requestPromise = require('request-promise-native');
const promBundle = require('express-prom-bundle');
const Sentry = require('@sentry/node');
const { logger, middlewareLogFormat } = require('./logger');

const oauthHandlers = require('./oauthHandlers');
const { configureTokenValidator } = require('./tokenValidation');

const appRoutes = {
  authorize: '/authorization',
  token: '/token',
  userinfo: '/userinfo',
  introspection: '/introspect',
  jwks: '/keys',
  redirect: '/redirect'
};
const openidMetadataWhitelist = [
  "issuer",
  "authorization_endpoint",
  "token_endpoint",
  "userinfo_endpoint",
  "introspection_endpoint",
  "jwks_uri",
  "scopes_supported",
  "response_types_supported",
  "response_modes_supported",
  "grant_types_supported",
  "subject_types_supported",
  "id_token_signing_alg_values_supported",
  "scopes_supported",
  "token_endpoint_auth_methods_supported",
  "claims_supported",
  "code_challenge_methods_supported",
  "introspection_endpoint_auth_methods_supported",
  "request_parameter_supported",
  "request_object_signing_alg_values_supported",
]

const smartMetadataWhitelist = [
  "authorization_endpoint",
  "token_endpoint",
  "introspection_endpoint",
  "scopes_supported",
  "response_types_supported",
]
const smartCapabilities = [
  "launch-standalone",
  "client-confidential-symmetric",
  "context-standalone-patient",
  "permission-offline",
  "permission-patient",
]

async function createIssuer(config) {
  return await Issuer.discover(config.upstream_issuer);
}

function buildMetadataRewriteTable(config, appRoutes) {
  return {
    authorization_endpoint: `${config.host}${config.well_known_base_path}${appRoutes.authorize}`,
    token_endpoint: `${config.host}${config.well_known_base_path}${appRoutes.token}`,
    userinfo_endpoint: `${config.host}${config.well_known_base_path}${appRoutes.userinfo}`,
    introspection_endpoint: `${config.host}${config.well_known_base_path}${appRoutes.introspection}`,
    jwks_uri: `${config.host}${config.well_known_base_path}${appRoutes.jwks}`,
  };
}

function filterProperty(object, property) {
  if (property in object) {
    object[property] = '[Filtered]';
  }
}

function buildApp(config, issuer, oktaClient, dynamo, dynamoClient, validateToken) {
  const useSentry = config.sentry_dsn !== undefined && config.sentry_environment !== undefined;
  if (useSentry) {
    Sentry.init({
      dsn: config.sentry_dsn,
      environment: config.sentry_environment,
      beforeSend(event) {
        if (event.request) {
          filterProperty(event.request, 'cookies');
          filterProperty(event.request.headers, 'cookie');
          filterProperty(event.request.headers, 'authorization');
        }
        return event;
      }
    });
  }
  const { well_known_base_path } = config;
  const redirect_uri = `${config.host}${well_known_base_path}${appRoutes.redirect}`;
  const metadataRewrite = buildMetadataRewriteTable(config, appRoutes);

  const app = express();
  const router = new express.Router();
  // Express needs to know it is being ran behind a trusted proxy. Setting 'trust proxy' to true does a few things
  // but notably sets req.ip = 'X-Forwarded-for'. See http://expressjs.com/en/guide/behind-proxies.html
  app.set('trust proxy', true);
  if (useSentry) {
    app.use(Sentry.Handlers.requestHandler({
      user: false,
    }));
  }
  app.use(morgan(middlewareLogFormat));
  app.use(promBundle({
    includeMethod: true,
    includePath: true,
    customLabels: {app: 'oauth_proxy'},
  }));

  router.use([appRoutes.token], bodyParser.urlencoded({ extended: true }));

  const corsHandler = cors({
    origin: true,
    optionsSuccessStatus: 200,
    preflightContinue: true,
  });
  router.options('/.well-known/*', corsHandler);

  router.get('/.well-known/openid-configuration', corsHandler, (req, res) => {
    const baseMetadata = {...issuer.metadata, ...metadataRewrite }
    const filteredMetadata = openidMetadataWhitelist.reduce((meta, key) => {
      meta[key] = baseMetadata[key];
      return meta;
    }, {});

    res.json(filteredMetadata);
  });

  router.get('/.well-known/smart-configuration.json', corsHandler, (req, res) => {
    const baseMetadata = {...issuer.metadata, ...metadataRewrite }
    const filteredMetadata = smartMetadataWhitelist.reduce((meta, key) => {
      meta[key] = baseMetadata[key];
      return meta;
    }, {});
    filteredMetadata['capabilities'] = smartCapabilities;
    res.json(filteredMetadata);
  });

  router.get(appRoutes.jwks, (req, res) => {
    req.pipe(request(issuer.metadata.jwks_uri)).pipe(res)
  });

  router.get(appRoutes.userinfo, (req, res) => {
    req.pipe(request(issuer.metadata.userinfo_endpoint)).pipe(res)
  });

  router.post(appRoutes.introspection, (req, res) => {
    req.pipe(request(issuer.metadata.introspection_endpoint)).pipe(res)
  });

  router.get(appRoutes.redirect, async (req, res, next) => {
    await oauthHandlers.redirectHandler(logger, dynamo, dynamoClient, req, res, next)
      .catch(next)
  });

  router.get(appRoutes.authorize, async (req, res, next) => {
    await oauthHandlers.authorizeHandler(config, redirect_uri, logger, issuer, dynamo, dynamoClient, oktaClient, req, res, next)
      .catch(next)
  });

  router.post(appRoutes.token, async (req, res, next) => {
    await oauthHandlers.tokenHandler(config, redirect_uri, logger, issuer, dynamo, dynamoClient, validateToken, req, res, next)
      .catch(next)
  });

  app.use(well_known_base_path, router)

  // Error handlers. Keep as last middleware
  // If we have error and description as query params display them, otherwise go to the
  // catchall error handler
  if (useSentry) {
    if (useSentry) {
      app.use(Sentry.Handlers.errorHandler({
        shouldHandleError(error) {
          if (error.status >= 400) {
            return true
          }
          return false
        }
      }));
    }
  }

  app.use(function (err, req, res, next) {
    const { error, error_description } = req.query;
    if (error && error_description) {
      res.status(500).send(`${error}: ${error_description}`);
    } else {
      res.status(500).send('An unknown error has occured');
    }
  });

  return app;
}

function startApp(config, issuer) {
  const oktaClient = new okta.Client({
    orgUrl: config.okta_url,
    token: config.okta_token,
    requestExecutor: new okta.DefaultRequestExecutor()
  });

  const dynamoHandle = dynamoClient.createDynamoHandle(
    Object.assign({},
      { region: config.aws_region },
      config.aws_id === null ? null : { accessKeyId: config.aws_id },
      config.aws_secret === null ? null : { secretAccessKey: config.aws_secret }
    ),
    config.dynamo_local,
    config.dynamo_table_name,
  );

  const validateToken = configureTokenValidator(config.validate_endpoint, config.validate_apiKey);
  const app = buildApp(config, issuer, oktaClient, dynamoHandle, dynamoClient, validateToken);
  const env = app.get('env');
  const server = app.listen(config.port, () => {
    logger.info(`OAuth Proxy listening on port ${config.port} in ${env} mode!`, {
      env,
      port: config.port,
    });
  });
  server.keepAliveTimeout = 75000;
  server.headersTimeout = 75000;
  return null;
}


// Only start the server if this is being run directly. This is to allow the
// test suite to import this module without starting the server. We should be
// able to get rid of this conditional once we break up this module but we
// can't do that until we have more tests in place.
if (require.main === module) {
  (async () => {
    try {
      const config = processArgs();
      const issuer = await createIssuer(config);
      startApp(config, issuer);
    } catch (error) {
      logger.error("Could not start the OAuth proxy", error);
      process.exit(1);
    }
  })();
}

module.exports = {
  buildApp,
  createIssuer,
  startApp,
}
