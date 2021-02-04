"use strict";

require("jest");
const MockExpressRequest = require("mock-express-request");
const MockExpressResponse = require("mock-express-response");
const Collection = require("@okta/okta-sdk-nodejs/src/collection");
const ModelFactory = require("@okta/okta-sdk-nodejs/src/model-factory");
const User = require("@okta/okta-sdk-nodejs/src/models/User");
const { authorizeHandler } = require("../oauthHandlers");
const {
  FakeIssuer,
  buildFakeDynamoClient,
  buildFakeOktaClient,
  buildFakeGetAuthorizationServerInfoResponse,
  createFakeConfig,
} = require("./testUtils");
const getAuthorizationServerInfoMock = jest.fn();

const userCollection = new Collection("", "", new ModelFactory(User));
userCollection.currentItems = [{ id: 1 }];

let config;
let redirect_uri;
let issuer;
let logger;
let dynamoClient;
let next;
let oktaClient;
let req;
let res;

beforeEach(() => {
  config = createFakeConfig();
  redirect_uri = jest.mock();
  issuer = jest.mock();
  logger = { error: jest.fn(), info: jest.fn(), warn: jest.fn() };
  next = jest.fn();
  req = new MockExpressRequest();
  res = new MockExpressResponse();

  oktaClient = buildFakeOktaClient(
    {
      client_id: "clientId123",
      client_secret: "secretXyz",
      settings: {
        oauthClient: {
          redirect_uris: ["http://localhost:8080/oauth/redirect"],
        },
      },
    },
    getAuthorizationServerInfoMock,
    userCollection
  );

  dynamoClient = buildFakeDynamoClient({
    state: "abc123",
    code: "the_fake_authorization_code",
    refresh_token: "",
    redirect_uri: "http://localhost/thisDoesNotMatter",
  });

  issuer = new FakeIssuer(dynamoClient);
});

describe("authorizeHandler", () => {
  afterEach(() => {});

  beforeEach(() => {
    getAuthorizationServerInfoMock.mockReset();
  });

  it("Happy Path Redirect", async () => {
    let response = buildFakeGetAuthorizationServerInfoResponse(["aud"]);
    getAuthorizationServerInfoMock.mockResolvedValue(response);
    res = {
      redirect: jest.fn(),
    };

    req.query = {
      state: "fake_state",
      client_id: "clientId123",
      redirect_uri: "http://localhost:8080/oauth/redirect",
      scope: "openid profile offline_access",
    };

    await authorizeHandler(
      config,
      redirect_uri,
      logger,
      issuer,
      dynamoClient,
      oktaClient,
      req,
      res,
      next
    );
    expect(res.redirect).toHaveBeenCalled();
  });

  it("Happy Path Redirect with Aud parameter", async () => {
    let response = buildFakeGetAuthorizationServerInfoResponse(["aud"]);
    getAuthorizationServerInfoMock.mockResolvedValue(response);
    res = {
      redirect: jest.fn(),
    };

    req.query = {
      state: "fake_state",
      client_id: "clientId123",
      redirect_uri: "http://localhost:8080/oauth/redirect",
      scope: "openid profile offline_access",
      aud: "aud",
    };

    await authorizeHandler(
      config,
      redirect_uri,
      logger,
      issuer,
      dynamoClient,
      oktaClient,
      req,
      res,
      next
    );
    expect(res.redirect).toHaveBeenCalled();
  });

  it("Verify that empty string redirect_uri results in 400", async () => {
    let response = buildFakeGetAuthorizationServerInfoResponse(["aud"]);
    getAuthorizationServerInfoMock.mockResolvedValue(response);
    res = new MockExpressResponse();

    req.query = {
      state: "fake_state",
      client_id: "clientId123",
      redirect_uri: "",
      scope: "openid profile offline_access",
      aud: "aud",
    };

    await authorizeHandler(
      config,
      redirect_uri,
      logger,
      issuer,
      dynamoClient,
      oktaClient,
      req,
      res,
      next
    );
    expect(res.statusCode).toEqual(400);
    expect(next).toHaveBeenCalled();
  });

  it("Verify that undefined redirect_uri results in 400", async () => {
    let response = buildFakeGetAuthorizationServerInfoResponse(["aud"]);
    getAuthorizationServerInfoMock.mockResolvedValue(response);
    res = new MockExpressResponse();

    req.query = {
      state: "fake_state",
      client_id: "clientId123",
      scope: "openid profile offline_access",
      aud: "aud",
    };

    await authorizeHandler(
      config,
      redirect_uri,
      logger,
      issuer,
      dynamoClient,
      oktaClient,
      req,
      res,
      next
    );
    expect(res.statusCode).toEqual(400);
    expect(next).toHaveBeenCalled();
  });

  it("Aud parameter does not match API response, redirect -> until we implement", async () => {
    let response = buildFakeGetAuthorizationServerInfoResponse(["aud"]);
    getAuthorizationServerInfoMock.mockResolvedValue(response);

    req.query = {
      state: "fake_state",
      client_id: "clientId123",
      redirect_uri: "http://localhost:8080/oauth/redirect",
      scope: "openid profile offline_access",
      aud: "notAPIValue",
    };

    res = {
      redirect: jest.fn(),
    };

    await authorizeHandler(
      config,
      redirect_uri,
      logger,
      issuer,
      dynamoClient,
      oktaClient,
      req,
      res,
      next
    );
    expect(logger.warn).toHaveBeenCalledWith({
      message: "Unexpected audience",
      actual: req.query.aud,
      expected: response.audiences,
    });
    expect(res.redirect).toHaveBeenCalled();
  });

  it("getAuthorizationServerInfo Error, return 500", async () => {
    getAuthorizationServerInfoMock.mockRejectedValue({ error: "fakeError" });

    req.query = {
      state: "fake_state",
      client_id: "clientId123",
      redirect_uri: "http://localhost:8080/oauth/redirect",
      scope: "openid profile offline_access",
      aud: "notAPIValue",
    };

    await authorizeHandler(
      config,
      redirect_uri,
      logger,
      issuer,
      dynamoClient,
      oktaClient,
      req,
      res,
      next
    );

    expect(logger.error).toHaveBeenCalledWith(
      "Unable to get the authorization server."
    );
    expect(next).toHaveBeenCalledWith({
      status: 500,
    });
  });

  it("No state, returns 400", async () => {
    await authorizeHandler(
      config,
      redirect_uri,
      logger,
      issuer,
      dynamoClient,
      oktaClient,
      req,
      res,
      next
    );
    expect(res.statusCode).toEqual(400);
  });

  it("Should return a 400 status code on invalid client_id", async () => {
    let response = buildFakeGetAuthorizationServerInfoResponse(["aud"]);
    getAuthorizationServerInfoMock.mockResolvedValue(response);

    req.query = {
      state: "fake_state",
      client_id: "invalid",
      redirect_uri: "http://localhost:8080/oauth/redirect",
      scope: "openid profile offline_access",
      aud: "aud",
    };

    await authorizeHandler(
      config,
      redirect_uri,
      logger,
      issuer,
      dynamoClient,
      oktaClient,
      req,
      res,
      next
    );
    expect(res.statusCode).toEqual(400);
  });

  it("State is empty, returns 400", async () => {
    req.query = { state: null };
    await authorizeHandler(
      config,
      redirect_uri,
      logger,
      issuer,
      dynamoClient,
      oktaClient,
      req,
      res,
      next
    );
    expect(res.statusCode).toEqual(400);
  });

  it("Bad redirect_uri", async () => {
    req.query = {
      state: "fake_state",
      client_id: "clientId123",
      redirect_uri: "https://www.google.com",
      scope: "openid profile offline_access",
    };

    await authorizeHandler(
      config,
      redirect_uri,
      logger,
      issuer,
      dynamoClient,
      oktaClient,
      req,
      res,
      next
    );
    expect(res.statusCode).toEqual(400);
  });
});
