export const analyzeLlmsTxtTool = {
  type: "function",
  function: {
    name: "analyze_llms_txt",
    description:
      "Parse llms.txt or llms-full.txt: AI agent instructions, rate limits, API endpoints, auth requirements, pricing. Checks llms-full.txt first (preferred), falls back to llms.txt.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "Target origin to check for llms.txt (optional, will use base URL if not provided)",
        },
      },
    },
  },
};
