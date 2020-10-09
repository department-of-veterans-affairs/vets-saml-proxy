const {
  deleteUserGrantOnClient,
  getUserIds,
  getClientInfo,
} = require("../apiClients/oktaApiClient");
const { parseClientId } = require("../utils");
const validator = require("validator");

const revokeUserGrantHandler = async (oktaClient, config, req, res, next) => {
  let client_id = req.body.client_id;
  let email = req.body.email;

  try {
    await checkForValidParams(oktaClient, config, client_id, email);
  } catch (error) {
    setErrorResponse(res, error.status, error.errorMessage);
    return next();
  }

  let userIds;

  try {
    userIds = await getUserIds(oktaClient, email);
  } catch (error) {
    setErrorResponse(res, error.status, error.errorMessage);
    return next();
  }

  if (userIds.length < 1) {
    setErrorResponse(res, 400, "Invalid email address.");
    return next();
  }

  let revokeGrantsResponse = await revokeGrantsOnClientsAndUserIds(
    oktaClient,
    config,
    userIds,
    client_id
  );
  res
    .status(revokeGrantsResponse.status)
    .json({ email: email, responses: revokeGrantsResponse.responses });
};

module.exports = revokeUserGrantHandler;

//Helper Methods

const revokeGrantsOnClientsAndUserIds = async (oktaClient, config, userIds, clientId) => {
  let responses = [];
  let status = 200;

  for (var i = 0; i < userIds.length; i++) {
    await deleteGrantsOnClientAndUserId(oktaClient, config, userIds[i], clientId)
      .then((response) => responses.push(response))
      .catch((err) => {
        status = 400;
        responses.push(err);
      });
  }

  return { status: status, responses: responses };
};

const deleteGrantsOnClientAndUserId = async (oktaClient, config, userId, clientId) => {
  let retValue;
  await deleteUserGrantOnClient(oktaClient, config, userId, clientId)
    .then((response) => {
      retValue = {
        status: response.status,
        userId: userId,
        message: "Okta grants successfully revoked",
      };
    })
    .catch((err) => {
      throw {
        status: err.response.status,
        userId: userId,
        message: err.response.data.errorSummary,
      };
    });

  return retValue;
};

const checkForValidParams = async (oktaClient, config, clientId, email) => {
  if (!config.enable_okta_consent_endpoint) {
    throw {
      status: 403,
      errorMessage: "Revoking grants is disabled in this environment.",
    };
  }

  checkIfParamsExist(clientId, email);
  checkForValidEmail(email);
  await checkForValidClient(oktaClient, config, clientId);
};

const checkForValidEmail = (email) => {
  if (!validator.isEmail(email)) {
    throw { status: 400, errorMessage: "Invalid email address." };
  }
};

const checkForValidClient = async (oktaClient, config, clientId) => {
  let clientError = true;
  if (parseClientId(clientId)) {
    await getClientInfo(oktaClient, config, clientId)
      .then(() => (clientError = false))
      .catch(() => (clientError = true));
  }

  if (clientError) {
    throw { status: 400, errorMessage: "Invalid client_id." };
  }
};

const checkIfParamsExist = (clientId, email) => {
  let errorMessage = "";

  if (!clientId || clientId == "") {
    errorMessage += "Invalid client_id. ";
  }

  if (!email || email == "") {
    errorMessage += "Invalid email address. ";
  }

  if (errorMessage) {
    throw { status: 400, errorMessage: errorMessage };
  }
};

const setErrorResponse = (response, status, message) => {
  response.status(status).json({
    error: "invalid_request",
    error_description: message,
  });
};
