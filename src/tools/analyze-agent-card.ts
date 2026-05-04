export const analyzeAgentCardTool = {
  type: "function",
  function: {
    name: "analyze_agent_card",
    description: "Check Agent Card (A2A) at .well-known/agent.json. Discover agent name, version, description, skills, endpoints, capabilities. Enables agent-to-agent discovery.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target origin to check for Agent Card" },
      },
      required: ["url"],
    },
  },
};