export const analyzeCodeTool = {
  type: "function",
  function: {
    name: "analyze_code",
    description: "Analyze code quality: inline styles, inline JS, console errors (if accessible), validate HTML, CSS class naming, script placement, preloading.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Raw HTML content to analyze" },
      },
      required: ["html"],
    },
  },
};