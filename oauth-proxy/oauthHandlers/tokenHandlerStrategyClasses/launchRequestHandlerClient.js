const { hashString } = require("../../utils");
const jwtDecode = require("jwt-decode");
const { rethrowIfRuntimeError } = require("../../utils");
const { translateTokenSet } = require("../tokenResponse");
const { PullDocumentByAccessTokenStrategy } = require("./pullDocumentStrategies/pullDocumentByAccessTokenStrategy");

class LaunchRequestHandlerClient {
  constructor(
    config,
    logger,
    dynamo,
    dynamoClient,
    req,
    res,
    next
  ) {
    this.pullDocumentFromDynamoStrategy = new PullDocumentByAccessTokenStrategy(
      logger,
      dynamo,
      dynamoClient,
      config,
      hashString
    );
    this.req = req;
    this.res = res;
    this.next = next;
  }
  async handleRequest() {
    const token_index = this.req.headers.authorization.indexOf("Bearer") + "Bearer ".length;
    const access_token = this.req.headers.authorization.substr(token_index);
  
    let launch = await this.pullDocumentFromDynamoStrategy.pullDocumentFromDynamo(access_token);
    return { statusCode: 200, responseBody: launch };
  }
}

module.exports = { LaunchRequestHandlerClient };
