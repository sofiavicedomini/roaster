export const analyzeLlmsTxtTool = {
  type: "function",
  function: {
    name: "analyze_llms_txt",
    description: "Parse llms.txt or llms-full.txt: AI agent instructions, rate limits, API endpoints, authentication requirements, pricing, contact info. Check completeness for agent interoperability.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target llms.txt URL" },
      },
      required: ["url"],
    },
  },
};