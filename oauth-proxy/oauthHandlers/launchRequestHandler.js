const { hashString } = require("../utils");
const {
  PullDocumentByAccessTokenStrategy,
} = require("./tokenHandlerStrategyClasses/pullDocumentStrategies/pullDocumentByAccessTokenStrategy");

/*
 * Handler for looking up SMART launch context by access_token.
 */
const launchRequestHandler = async (config, logger, dynamo, res, next) => {
  const pullDocumentStrategy = new PullDocumentByAccessTokenStrategy(
    logger,
    dynamo,
    config,
    hashString
  );

  let documentResponse = await pullDocumentStrategy.pullDocumentFromDynamo(
    res.locals.jwt
  );

  if (documentResponse && documentResponse.launch) {
    res.json({ launch: documentResponse.launch });
  } else {
    return res.sendStatus(401);
  }

  return next();
};

module.exports = launchRequestHandler;
