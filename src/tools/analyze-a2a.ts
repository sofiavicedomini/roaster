export const analyzeA2ATool = {
  type: "function",
  function: {
    name: "analyze_a2a",
    description: "Check A2A (Agent-to-Agent) manifest at .well-known/a2a.json. Discover agent identity, routing, communication protocols. Modern A2A standard.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target origin to check for A2A manifest" },
      },
      required: ["url"],
    },
  },
};