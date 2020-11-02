const { rethrowIfRuntimeError } = require("../../utils");

class PullDocumentByCodeStrategy {
  constructor(req, logger, dynamo, dynamoClient) {
    this.req = req;
    this.logger = logger;
    this.dynamo = dynamo;
    this.dynamoClient = dynamoClient;
  }
  async pullDocumentFromDynamo() {
    let document;
    try {
      document = await this.dynamoClient.getFromDynamoBySecondary(
        this.dynamo,
        "code",
        this.req.body.code
      );
    } catch (err) {
      rethrowIfRuntimeError(err);
      this.logger.error("Failed to retrieve document from Dynamo DB.", err);
    }

    return document;
  }
}

module.exports = { PullDocumentByCodeStrategy };
