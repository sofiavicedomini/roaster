export const analyzeWebmcpTool = {
  type: "function",
  function: {
    name: "analyze_webmcp",
    description:
      "Check WebMCP at .well-known/webmcp. HTTP-based MCP server discovery. Tool invocation via HTTP.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Target origin to check for WebMCP",
        },
      },
      required: ["url"],
    },
  },
};
