export const analyzeAccessibilityTool = {
  type: "function",
  function: {
    name: "analyze_accessibility",
    description: "Analyze HTML for accessibility issues: ARIA labels, alt text, heading hierarchy, color contrast (estimate), keyboard navigation, form labels, focus states, missing semantic elements. Provide html=... to analyze existing HTML, or url=... to fetch and analyze directly.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Raw HTML content to analyze (optional if url provided)" },
        url: { type: "string", description: "URL to fetch and analyze (optional if html provided)" },
      },
    },
  },
};