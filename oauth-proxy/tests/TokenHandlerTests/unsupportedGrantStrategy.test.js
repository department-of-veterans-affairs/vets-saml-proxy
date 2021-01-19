const {
  UnsupportedGrantStrategy,
} = require("../../oauthHandlers/tokenHandlerStrategyClasses/tokenStrategies/unsupportedGrantStrategy");

require("jest");

describe("getToken tests", () => {
  it("Happy Path", async () => {
    let error = {
      statusCode: 400,
      error: "unsupported_grant_type",
      error_description:
        "Only authorization and refresh_token grant types are supported",
    };

    try {
      await new UnsupportedGrantStrategy().getToken();
      fail("Unsupported grant type error should have been thrown");
    } catch (err) {
      expect(err).toEqual(error);
      return;
    }
  });
});
