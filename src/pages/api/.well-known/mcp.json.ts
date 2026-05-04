export const prerender = false;

import type { APIRoute } from "astro";

export const GET: APIRoute = async () => {
  const mcp = {
    mcpServers: {
      "roast-me": {
        url: "https://stroncami.it/api/mcp",
        type: "http",
        description: "Roast Me MCP server for AI agents to analyze websites",
        auth: "none",
      },
    },
  };

  return new Response(JSON.stringify(mcp, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
