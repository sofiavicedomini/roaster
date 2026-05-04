export const analyzeBrandTool = {
  type: "function",
  function: {
    name: "analyze_brand",
    description:
      "Analyze brand consistency: logo usage, color scheme, typography consistency, tagline, consistent spacing, visual hierarchy, professional polish.",
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
