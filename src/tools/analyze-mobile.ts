export const analyzeMobileTool = {
  type: "function",
  function: {
    name: "analyze_mobile",
    description: "Analyze mobile friendliness: viewport meta tag, tap targets size, font sizes, horizontal scroll, tap delay, responsive breakpoints, touch-friendly navigation.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Raw HTML content to analyze" },
      },
      required: ["html"],
    },
  },
};