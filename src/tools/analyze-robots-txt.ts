export const analyzeRobotsTxtTool = {
  type: "function",
  function: {
    name: "analyze_robots_txt",
    description:
      "Parse and analyze robots.txt rules: allowed/disallowed paths, crawl-delay, sitemaps, User-Agent rules. Identify blocking issues for agents, missing sitemaps, overly restrictive rules.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description: "Target site URL (will fetch /robots.txt)",
        },
      },
      required: ["url"],
    },
  },
};
