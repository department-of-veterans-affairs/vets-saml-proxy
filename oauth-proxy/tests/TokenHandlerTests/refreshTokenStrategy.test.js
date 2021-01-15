require("jest");
const MockExpressRequest = require("mock-express-request");
const { TokenSet } = require("openid-client");
const {
  buildOpenIDClient,
  buildFakeLogger,
  createFakeConfig,
} = require("../testUtils");
const {
  RefreshTokenStrategy,
} = require("../../oauthHandlers/tokenHandlerStrategyClasses/tokenStrategies/refreshTokenStrategy");
let logger;
let dynamo;
let client;
let config;
let staticTokens;
let data;

const setScan = (items) => {
  dynamo.dbDocClient = {
    scan: (scan_params, result) => {
      if (scan_params.TableName === "ut_static_tokens_table") {
        result(null, {
          Items: [items],
          Count: 1,
          ScannedCount: 1,
          ConsumedCapacity: null,
        });
      } else {
        result(false, undefined);
      }
    },
  };
};

beforeEach(() => {
  data = {
    is_static: true,
    token_type: "Bearer",
    expires_in: 3600,
    access_token: "static-access-token",
    scope:
      "openid profile patient/Medication.read launch/patient offline_access",
    refresh_token: "static-refresh-token",
    id_token: "static-id-token",
    patient: "0123456789",
  };
  config = createFakeConfig();
  staticTokens = new Map();
  logger = buildFakeLogger();
  client = buildOpenIDClient({
    refresh: (resolve) => {
      resolve(
        new TokenSet({
          access_token: "real-access-token",
          refresh_token: "real-refresh-token",
          expires_in: 60,
        })
      );
    },
  });
  dynamo = jest.mock();
  setScan({
    static_icn: "0123456789",
    static_refresh_token: "static-refresh-token",
    static_access_token: "static-access-token",
    static_scopes:
      "openid profile patient/Medication.read launch/patient offline_access",
    static_expires_in: 3600,
    static_id_token: "static-id-token",
  });
});
const realRefreshTests = async () => {
  it("Happy Path", async () => {
    let req = new MockExpressRequest({
      body: {
        grant_type: "refresh_token",
        refresh_token: "real-refresh-token",
        state: "abc123",
      },
    });

    let refreshTokenStrategy = new RefreshTokenStrategy(
      req,
      logger,
      client,
      dynamo,
      config,
      staticTokens
    );

    let token = await refreshTokenStrategy.getToken();
    expect(token.access_token).toEqual("real-access-token");
    expect(token.refresh_token).toEqual("real-refresh-token");
    expect(token.expires_in).toEqual(60);
  });
  it("client error", async () => {
    client = { refresh: jest.fn() };
    client.refresh.mockImplementation(() => {
      throw {
        error: "client error",
        error_description: "this is a client error",
      };
    });

    let req = new MockExpressRequest({
      body: {
        grant_type: "refresh_token",
        refresh_token: "real-refresh-token",
        state: "abc123",
      },
    });

    let refreshTokenStrategy = new RefreshTokenStrategy(
      req,
      logger,
      client,
      dynamo,
      config,
      staticTokens
    );

    try {
      await refreshTokenStrategy.getToken();
    } catch (err) {
      expect(err.error).toBe("client error");
      expect(err.error_description).toBe("this is a client error");
      expect(err.statusCode).toBe(500);
      return;
    }
    expect(true).toBe(false);
  });
};
describe("tokenHandler refreshTokenStrategy", () => {
  it("handles the static refreshTokenStrategy flow", async () => {
    let req = new MockExpressRequest({
      body: {
        grant_type: "refresh_token",
        refresh_token: data.refresh_token,
        state: "abc123",
      },
    });

    let refreshTokenStrategy = new RefreshTokenStrategy(
      req,
      logger,
      client,
      dynamo,
      config,
      staticTokens
    );

    let token = await refreshTokenStrategy.getToken();
    expect(token).toEqual(data);
  });

  it("handles the static refreshTokenStrategy flow static token size > 0", async () => {
    staticTokens.set("static-refresh-token", {
      static_icn: "0123456789",
      static_refresh_token: "static-refresh-token",
      static_access_token: "static-access-token",
      static_scopes:
        "openid profile patient/Medication.read launch/patient offline_access",
      static_expires_in: 3600,
      static_id_token: "static-id-token",
    });
    let req = new MockExpressRequest({
      body: {
        grant_type: "refresh_token",
        refresh_token: data.refresh_token,
        state: "abc123",
      },
    });

    let refreshTokenStrategy = new RefreshTokenStrategy(
      req,
      logger,
      client,
      dynamo,
      config,
      staticTokens
    );

    let token = await refreshTokenStrategy.getToken();
    expect(token).toEqual(data);
  });

  it("handles the static refreshTokenStrategy flow no id icn", async () => {
    delete data.patient;
    setScan({
      static_refresh_token: "static-refresh-token",
      static_access_token: "static-access-token",
      static_scopes:
        "openid profile patient/Medication.read launch/patient offline_access",
      static_expires_in: 3600,
      static_id_token: "static-id-token",
    });

    let req = new MockExpressRequest({
      body: {
        grant_type: "refresh_token",
        refresh_token: data.refresh_token,
        state: "abc123",
      },
    });

    let refreshTokenStrategy = new RefreshTokenStrategy(
      req,
      logger,
      client,
      dynamo,
      config,
      staticTokens
    );

    let token = await refreshTokenStrategy.getToken();
    expect(token).toEqual(data);
  });
  it("handles the static refreshTokenStrategy flow no id token", async () => {
    delete data.id_token;
    setScan({
      static_icn: "0123456789",
      static_refresh_token: "static-refresh-token",
      static_access_token: "static-access-token",
      static_scopes:
        "openid profile patient/Medication.read launch/patient offline_access",
      static_expires_in: 3600,
    });

    let req = new MockExpressRequest({
      body: {
        grant_type: "refresh_token",
        refresh_token: data.refresh_token,
        state: "abc123",
      },
    });

    let refreshTokenStrategy = new RefreshTokenStrategy(
      req,
      logger,
      client,
      dynamo,
      config,
      staticTokens
    );

    let token = await refreshTokenStrategy.getToken();
    expect(token).toEqual(data);
  });

  it("handles the static refreshTokenStrategy flow no id token no icn", async () => {
    delete data.patient;
    delete data.id_token;
    setScan({
      static_refresh_token: "static-refresh-token",
      static_access_token: "static-access-token",
      static_scopes:
        "openid profile patient/Medication.read launch/patient offline_access",
      static_expires_in: 3600,
    });

    let req = new MockExpressRequest({
      body: {
        grant_type: "refresh_token",
        refresh_token: data.refresh_token,
        state: "abc123",
      },
    });

    let refreshTokenStrategy = new RefreshTokenStrategy(
      req,
      logger,
      client,
      dynamo,
      config,
      staticTokens
    );

    let token = await refreshTokenStrategy.getToken();
    expect(token).toEqual(data);
  });
  describe("Real refresh static token dynamo error", () => {
    beforeEach(() => {
      dynamo = jest.mock();
      dynamo.dbDocClient = {
        scan: () => {
          throw { message: "this is an error message" };
        },
      };
    });
    realRefreshTests();
  });
  describe("Real Refresh Static token service on", () => {
    realRefreshTests();
  });

  describe("Real Refresh Static token service off", () => {
    beforeEach(() => {
      config = createFakeConfig();
      config.enable_static_token_service = false;
    });
    realRefreshTests();
  });
});
