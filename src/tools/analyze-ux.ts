export const analyzeUxTool = {
  type: "function",
  function: {
    name: "analyze_ux",
    description: "Analyze UX: navigation clarity, search functionality, breadcrumbs, error messages, loading states, confirmation feedback, consistency, intuitive flow.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Raw HTML content to analyze" },
        url: { type: "string", description: "Page URL for context" },
      },
      required: ["html", "url"],
    },
  },
};