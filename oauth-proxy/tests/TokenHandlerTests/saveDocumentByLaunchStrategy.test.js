const {
  SaveDocumentLaunchStrategy,
} = require("../../oauthHandlers/tokenHandlerStrategyClasses/saveDocumentStrategies/saveDocumentLaunchStrategy");
const { jwtEncodeClaims } = require("../testUtils");

require("jest");

describe("saveDocumentByLaunchStrategy tests", () => {
  it("empty launch", async () => {
    let testSaveToDynamoAccessTokenCalled = false;

    const mockDynamoClient = {
      saveToDynamoAccessToken: () => {
        testSaveToDynamoAccessTokenCalled = true;
        return new Promise((resolve) => {
          resolve(true);
        });
      },
    };

    const document = {};

    const strategy = new SaveDocumentLaunchStrategy(
      null,
      null,
      mockDynamoClient,
      null,
      null
    );
    await strategy.saveDocumentToDynamo(document, null);

    expect(testSaveToDynamoAccessTokenCalled).toBe(false);
  });

  it("happy path", async () => {
    const savePayloadToDynamoCalledWith = {};

    const mockDynamo = {};
    const mockHashingFunction = () => {
      return "hash";
    };
    const mockLogger = { error: () => {} };
    const mockDynamoClient = {
      savePayloadToDynamo: (dynamohandle, payload, TableName) => {
        savePayloadToDynamoCalledWith.dynamohandle = dynamohandle;
        savePayloadToDynamoCalledWith.payload = payload;
        savePayloadToDynamoCalledWith.TableName = TableName;
        return new Promise((resolve) => {
          resolve(true);
        });
      },
    };

    const config = {
      dynamo_client_credentials_table: "dynamo_client_credentials_table",
      hmac_secret: "hmac_secret",
    };
    const document = { launch: { S: "42" } };
    const claims = { aud: "https://ut/v1/token", iss: "ut_iss", sub: "ut_sub" };
    const expire_on = new Date().getTime() + 300 * 1000;
    const tokens = { access_token: jwtEncodeClaims(claims, expire_on) };

    const strategy = new SaveDocumentLaunchStrategy(
      mockLogger,
      mockDynamo,
      mockDynamoClient,
      config,
      mockHashingFunction
    );
    await strategy.saveDocumentToDynamo(document, tokens);

    // Expect saveToDynamoAccessToken to have been called with the correct values
    expect(savePayloadToDynamoCalledWith.dynamohandle).toBe(mockDynamo);
    expect(savePayloadToDynamoCalledWith.payload.access_token).toBe(
      mockHashingFunction()
    );
    expect(savePayloadToDynamoCalledWith.payload.launch).toBe(
      document.launch.S
    );
    expect(savePayloadToDynamoCalledWith.TableName).toBe(
      config.dynamo_client_credentials_table
    );
  });

  it("exception thrown", async () => {
    const loggerCalledWith = {};
    const expectedError = { error: "expected error" };

    const mockLogger = {
      error: (message, error) => {
        loggerCalledWith.message = message;
        loggerCalledWith.error = error;
      },
    };
    const mockHashingFunction = () => {
      return "hash";
    };
    const mockDynamoClient = {
      savePayloadToDynamo: () => {
        throw expectedError;
      },
    };

    const config = {
      hmac_secret: "hmac_secret",
    };
    const document = { launch: { S: "42" } };
    const claims = { aud: "https://ut/v1/token", iss: "ut_iss", sub: "ut_sub" };
    const expire_on = new Date().getTime() + 300 * 1000;
    const tokens = { access_token: jwtEncodeClaims(claims, expire_on) };

    const strategy = new SaveDocumentLaunchStrategy(
      mockLogger,
      null,
      mockDynamoClient,
      config,
      mockHashingFunction
    );
    await strategy.saveDocumentToDynamo(document, tokens);

    // Expect an exception to have occurred and been logged
    expect(loggerCalledWith.message).toBe(
      "Could not update the access token token in DynamoDB"
    );
    expect(loggerCalledWith.error).toBe(expectedError);
  });
});
