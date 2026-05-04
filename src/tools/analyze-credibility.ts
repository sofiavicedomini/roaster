export const analyzeCredibilityTool = {
  type: "function",
  function: {
    name: "analyze_credibility",
    description: "Analyze credibility signals: contact info, privacy policy, terms, about page, trust badges, SSL, social proof, reviews, team page, company registration info.",
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