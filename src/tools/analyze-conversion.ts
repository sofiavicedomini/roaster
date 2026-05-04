export const analyzeConversionTool = {
  type: "function",
  function: {
    name: "analyze_conversion",
    description:
      "Analyze conversion optimization: CTAs visibility/placement, form usability, pricing display, trust signals near forms, value propositions, urgency elements.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "URL to fetch and analyze (preferred — fetches live HTML)",
        },
        html: {
          type: "string",
          description: "Raw HTML content (fallback if url not provided)",
        },
      },
      required: [],
    },
  },
};
