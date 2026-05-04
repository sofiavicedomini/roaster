export const analyzeAccessibilityTool = {
  type: "function",
  function: {
    name: "analyze_accessibility",
    description: "Analyze HTML for accessibility issues: ARIA labels, alt text, heading hierarchy, color contrast (estimate), keyboard navigation, form labels, focus states, missing semantic elements.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Raw HTML content to analyze" },
      },
      required: ["html"],
    },
  },
};