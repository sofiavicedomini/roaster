export const analyzeOauthTool = {
  type: "function",
  function: {
    name: "analyze_oauth",
    description: "Check OAuth 2.0/OIDC discovery at .well-known/oauth-authorization-server. Verify issuer, authorization_endpoint, token_endpoint, grant_types, scopes, algorithms. Essential for agent authentication.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target origin to check for OAuth discovery" },
      },
      required: ["url"],
    },
  },
};