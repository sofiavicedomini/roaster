export const analyzePerformanceTool = {
  type: "function",
  function: {
    name: "analyze_performance",
    description: "Analyze performance issues: render-blocking resources, unoptimized images (missing lazy loading), large inline JS/CSS, too many requests, missing compression, large DOM size.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Raw HTML content to analyze" },
      },
      required: ["html"],
    },
  },
};