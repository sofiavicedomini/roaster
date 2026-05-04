export const submitRoastTool = {
  type: "function",
  function: {
    name: "submit_roast",
    description: "Submit the complete roast analysis. Call when you have gathered enough evidence for ALL requested categories. All text must be in the user's language.",
    parameters: {
      type: "object",
      properties: {
        overall_score: { type: "number", description: "Honest average score 1-10 (integer or .5)" },
        verdict: { type: "string", description: "One brutal, punchy sentence summarizing the site. In the user's language." },
        scores: {
          type: "object",
          description: "Numeric score 1-10 for EVERY requested category. No nulls.",
          additionalProperties: { type: "number" },
        },
        roasts: {
          type: "array",
          description: "Exactly one entry per requested category.",
          items: {
            type: "object",
            properties: {
              category: { type: "string", description: "Exact category name as requested" },
              emoji: { type: "string", description: "Relevant emoji" },
              critique: { type: "string", description: "3-5 sentences. Brutal, specific, evidence-based. Cite real things you observed." },
              fix_prompt: { type: "string", description: "Self-contained AI-agent prompt: what to fix, which file/URL, correct implementation, success criteria. Min 2 sentences." },
            },
            required: ["category", "emoji", "critique", "fix_prompt"],
          },
        },
      },
      required: ["overall_score", "verdict", "scores", "roasts"],
    },
  },
};