const axios = require("axios");
const qs = require("qs");
const { rethrowIfRuntimeError, decodeJwt } = require("../../../utils");

class ClientCredentialsStrategy {
  constructor(req, logger, dynamo, dynamoClient, token_endpoint, assert_info) {
    this.req = req;
    this.logger = logger;
    this.dynamo = dynamo;
    this.dynamoClient = dynamoClient;
    this.token_endpoint = token_endpoint;
    this.assert_info = assert_info;
    if (this.assert_info) {
      this.assert_info.decodedJwt = decodeJwt(this.req.body.client_assertion);
    }
  }

  async getTokenResponse() {
    let token;
    let res;

    delete this.req.headers.host;
    var data = qs.stringify(this.req.body);
    try {
      res = await axios({
        method: "post",
        url: this.token_endpoint,
        data: data,
        headers: this.req.headers,
      });
      if (res.status == 200) {
        token = res.data;
      } else {
        this.logger.error({
          message: "Server returned status code " + res.status,
        });
        throw {
          statusCode: 500,
          error: "token_failure",
          error_description: "Failed to retrieve access_token.",
        };
      }
    } catch (error) {
      rethrowIfRuntimeError(error);
      if (error.response.status == 400) {
        if (error.response.data.errorCode) {
          throw {
            statusCode: 400,
            error: error.response.data.errorCode,
            error_description: error.response.data.errorSummary,
          };
        } else {
          throw {
            statusCode: 400,
            error: error.response.data.error,
            error_description: error.response.data.error_description,
          };
        }
      } else if (error.response.status == 401) {
        throw {
          statusCode: 401,
          error: error.response.data.error,
          error_description: error.response.data.error_description,
        };
      } else {
        if (error.response) {
          this.logger.error({
            message: "Server returned status code " + error.response.status,
          });
        } else {
          this.logger.error({ message: error.message });
        }
        throw {
          statusCode: 500,
          error: "token_failure",
          error_description: "Failed to retrieve access_token.",
        };
      }
    }

    return token;
  }
}

module.exports = { ClientCredentialsStrategy };
