export const analyzeMcpTool = {
  type: "function",
  function: {
    name: "analyze_mcp",
    description: "Check for MCP server at target: fetch .well-known/mcp.json and verify endpoint is reachable. Returns server info, URL, and reachability status.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target URL to check for MCP (optional, defaults to the target being analyzed)" },
      },
    },
  },
};