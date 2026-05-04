export const analyzeConversionTool = {
  type: "function",
  function: {
    name: "analyze_conversion",
    description: "Analyze conversion optimization: CTAs visibility/placement, form usability, pricing display, trust signals near forms, value propositions, urgency elements.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Raw HTML content to analyze" },
      },
      required: ["html"],
    },
  },
};