export const analyzeMobileTool = {
  type: "function",
  function: {
    name: "analyze_mobile",
    description:
      "Analyze mobile friendliness: viewport meta tag, tap targets size, font sizes, horizontal scroll, tap delay, responsive breakpoints, touch-friendly navigation.",
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
