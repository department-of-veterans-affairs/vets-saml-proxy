require("jest");
const axios = require("axios");
const MockAdapter = require("axios-mock-adapter");
const MockExpressRequest = require("mock-express-request");
const {
  FakeIssuer,
  buildFakeDynamoClient,
  buildOpenIDClient
} = require("./testUtils");
const {
  RefreshTokenStrategy,
} = require("../oauthHandlers/tokenHandlerStrategyClasses/tokenStrategies/refreshTokenStrategy");
let logger;
let dynamo;
let issuer;
let config;
let token_endpoint = "http://localhost:9090/testServer/token";
let mock = new MockAdapter(axios);

beforeEach(() => {
  logger = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };
  dynamo = jest.mock();
  dynamoClient = jest.mock();
  dynamoClient = buildFakeDynamoClient({
    state: "abc123",
    code: "the_fake_authorization_code",
    refresh_token: "static-refresh-token",
    redirect_uri: "http://localhost/thisDoesNotMatter",
  });
  jest.mock("axios", () => ({ post: jest.fn(), create: jest.fn() }));
  let client = buildOpenIDClient({
    refresh: (resolve) => {
      resolve(
        new TokenSet({
          access_token:"real-access-token",
          refresh_token: "real-refresh-token",
          expires_in: 60,
        })
      );
    },
  });
  issuer = new FakeIssuer(client);
  config = jest.mock();
  config.dynamo_static_token_table = "ut_static_tokens_table";
  dynamo = jest.mock();
  dynamo.dbDocClient = {
    get: (search_params, result) => {
      if (
        search_params.Key.static_refresh_token ===
        "static-refresh-token"
      ) {
        result(false, {
          Item: {
            static_access_token: "static-access-token",
            static_refresh_token: "static-refresh-token",
            static_expires_in: 3600,
            static_icn: "0123456789",
            static_scopes: "launch/patient",
          },
        });
      } else {
        result(false, undefined);
      }
    },
  };
});

describe("tokenHandler refreshTokenStrategy", () => {
  it("handles the static refreshTokenStrategy flow", async () => {
    let req = new MockExpressRequest({
      body: {
        grant_type: "refresh_token",
        refresh_token: "static-refresh-token",
        state: "abc123",
      },
    });

    const data = {
      is_static: true,
      token_type: "Bearer",
      expires_in: 3600,
      access_token: "static-access-token",
      scope: "launch/patient",
      patient: "0123456789",
      refresh_token: "static-refresh-token",
    };
    mock.onPost(token_endpoint).reply(200, data);

    let refreshTokenStrategy = new RefreshTokenStrategy(
      req,
      logger,
      issuer,
      dynamo,
      config
    );

    let token = await refreshTokenStrategy.getTokenResponse();
    expect(token).toEqual(data);
  });
});
