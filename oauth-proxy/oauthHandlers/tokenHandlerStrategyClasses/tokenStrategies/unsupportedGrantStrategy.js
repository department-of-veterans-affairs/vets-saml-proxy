class UnsupportedGrantStrategy {
  constructor() {}

  async getToken() {
    throw {
      statusCode: 400,
      error: "unsupported_grant_type",
      error_description:
        "Only authorization and refresh_token grant types are supported",
    };
  }
}

module.exports = { UnsupportedGrantStrategy };
