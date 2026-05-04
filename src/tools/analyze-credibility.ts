export const analyzeCredibilityTool = {
  type: "function",
  function: {
    name: "analyze_credibility",
    description: "Analyze credibility signals: contact info, privacy policy, terms, about page, trust badges, SSL, social proof, reviews, team page, company registration info.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "URL to fetch and analyze (preferred — fetches live HTML)" },
        html: { type: "string", description: "Raw HTML content (fallback if url not provided)" },
      },
      required: [],
    },
  },
};