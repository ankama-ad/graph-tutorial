var graph = require('@microsoft/microsoft-graph-client');
require('isomorphic-fetch');

module.exports = {
  getUserDetails: async function(msalClient, userId) {
    const client = getAuthenticatedClient(msalClient, userId);

    const user = await client
      .api('/me')
      .select('displayName,mail,mailboxSettings,userPrincipalName')
      .get();
      
    let groups = await client.api('/groups').get();
    return user;
  },
  getGroups: async function(msalClient, userId) {
    const client = getAuthenticatedClient(msalClient, userId);          
    const groups = await client.api('/groups').get();
    groups.value.forEach(async (element, i) => {
        groups.value[i].members = await this.getGroupMembers(msalClient, userId, element.id);
    });
    return groups;
  },
  getGroupMembers: async function(msalClient, userId, groupId) {
    const client = getAuthenticatedClient(msalClient, userId);     
    const uri =    `/groups/${groupId}/members`;
    const members = await client.api(uri).get();      
    return members;
  },
  getUsers: async function(msalClient, userId) {
    const client = getAuthenticatedClient(msalClient, userId);         
    const users = await client.api('/users').get();
    return users;
  },
};

function getAuthenticatedClient(msalClient, userId) {
  if (!msalClient || !userId) {
    throw new Error(
      `Invalid MSAL state. Client: ${msalClient ? 'present' : 'missing'}, User ID: ${userId ? 'present' : 'missing'}`);
  }

  // Initialize Graph client
  const client = graph.Client.init({
    // Implement an auth provider that gets a token
    // from the app's MSAL instance
    authProvider: async (done) => {
      try {
        // Get the user's account
        const account = await msalClient
          .getTokenCache()
          .getAccountByHomeId(userId);

        if (account) {
          // Attempt to get the token silently
          // This method uses the token cache and
          // refreshes expired tokens as needed
          const response = await msalClient.acquireTokenSilent({
            scopes: process.env.OAUTH_SCOPES.split(','),
            redirectUri: process.env.OAUTH_REDIRECT_URI,
            account: account
          });

          // First param to callback is the error,
          // Set to null in success case
          done(null, response.accessToken);
        }
      } catch (err) {
        console.log(JSON.stringify(err, Object.getOwnPropertyNames(err)));
        done(err, null);
      }
    }
  });

  return client;
}