export const analyzeUxTool = {
  type: "function",
  function: {
    name: "analyze_ux",
    description: "Analyze UX: navigation, search, breadcrumbs, feedback states, skip links, focus states, reduced motion, touch targets. Enhanced with accessibility checks.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Raw HTML content to analyze" },
        url: { type: "string", description: "Page URL for context (optional)" },
      },
      required: ["html"],
    },
  },
};