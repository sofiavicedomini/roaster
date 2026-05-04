export const analyzeSecurityHeadersTool = {
  type: "function",
  function: {
    name: "analyze_security_headers",
    description: "Fetch and analyze security headers of a URL: CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy. Returns which headers are present/missing and recommendations.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL to analyze" },
      },
      required: ["url"],
    },
  },
};