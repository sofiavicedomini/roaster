export const analyzeBrandTool = {
  type: "function",
  function: {
    name: "analyze_brand",
    description: "Analyze brand consistency: logo usage, color scheme, typography consistency, tagline, consistent spacing, visual hierarchy, professional polish.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Raw HTML content to analyze" },
      },
      required: ["html"],
    },
  },
};