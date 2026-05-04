export const analyzeUxTool = {
  type: "function",
  function: {
    name: "analyze_ux",
    description:
      "Analyze UX: navigation, search, breadcrumbs, feedback states, skip links, focus states, reduced motion, touch targets. Enhanced with accessibility checks.",
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
