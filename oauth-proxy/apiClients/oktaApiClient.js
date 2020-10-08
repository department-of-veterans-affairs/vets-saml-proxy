const axios = require("axios");
const uriTemplates = require("uri-templates");
const URI = require("urijs");
const { axiosCachingAdapter } = require("./axiosCachingAdapter");
const okta = require('@okta/okta-sdk-nodejs');

const deleteUserGrantOnClient = async (config, userId, clientId) => {
  let error;
  let response;
  const template = uriTemplates(
    config.okta_url + "/api/v1/users/{userid}/clients/{clientid}/grants"
  );
  await axios({
    method: "DELETE",
    url: template.fill({ userid: userId, clientid: clientId }),
    headers: { Authorization: "SSWS " + config.okta_token },
  })
    .then((res) => {
      response = res;
    })
    .catch((err) => {
      error = err;
    });

  if (response == null) {
    throw error;
  }

  return response;
};

const getUserInfo = async (config, email) => {
  let uri = URI(config.okta_url + "/api/v1/users");
  let emailFilter = `profile.email eq "${email}"`;
  uri.search({ filter: emailFilter });

  let response;
  let error;

  await axios({
    method: "GET",
    url: uri.toString(),
    headers: { Authorization: "SSWS " + config.okta_token },
  })
    .then((res) => {
      response = res;
    })
    .catch((err) => {
      error = err;
    });

  if (response == null) {
    throw error;
  }

  return response;
};

const getClientInfo = async (okta_client, config, clientId) => {
  let error;
  let response;
  const template = uriTemplates(
    config.okta_url + "/oauth2/v1/clients/{clientid}"
  );

  // await axios({
  //   method: "GET",
  //   url: template.fill({ clientid: clientId }),
  //   headers: { Authorization: "SSWS " + config.okta_token },
  // })
  //   .then((res) => {
  //     response = res;
  //   })
  //   .catch((err) => {
  //     error = err;
  //   });

  if (response == null) {
    throw error;
  }

  return response;
};

const getAuthorizationServerInfo = async (config, authorizationServerId, oktaClient) => {
  let error;
  let response;
  const template = uriTemplates(
    config.okta_url + "/api/v1/authorizationServers/{authorizationServerId}"
  );

  await oktaClient.http.http(template.fill({ authorizationServerId: authorizationServerId }), {method: 'get'})
  .then(res => res.text())
  .then(text => response = JSON.parse(text))
  .catch ((err) => error = err);

  if (response == null) {
    throw error;
  }
  return response;
};

const getClaims = async (authorizationServerId, oktaClient) => {
  let claims = [];
  const claimsCollection = await oktaClient.listOAuth2Claims(authorizationServerId);
  await claimsCollection.each(claim => {
    claims.push(claim.name);
  })
  return claims;
}

module.exports = {
  deleteUserGrantOnClient,
  getUserInfo,
  getClientInfo,
  getAuthorizationServerInfo,
  getClaims
};
