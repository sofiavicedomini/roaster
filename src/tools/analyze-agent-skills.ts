export const analyzeAgentSkillsTool = {
  type: "function",
  function: {
    name: "analyze_agent_skills",
    description: "Check Agent Skills at /.agentskills. Discover agent capabilities, tools, protocols. Human-readable skills listing.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target origin to check for Agent Skills" },
      },
      required: ["url"],
    },
  },
};