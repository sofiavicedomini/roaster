export async function GET() {

    const mcp = `{
  "mcpServers": {
    "roast-me": {
      "url": "https://stroncami.it/api/mcp",
      "type": "sse",
      "description": "Roast Me MCP server for AI agents to analyze websites",
      "auth": "none"
    }
  }
}`;

    return new Response(mcp, {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
        },
    })

}
