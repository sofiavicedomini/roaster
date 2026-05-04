import { fetchUrl } from "../utils";

export async function handleAnalyzeMcp(
  args: unknown,
  baseUrl: string,
): Promise<string> {
  const { url } = args as { url?: string };

  const targetOrigin = url
    ? url.startsWith("http")
      ? new URL(url).origin
      : new URL(url, new URL(baseUrl).origin).origin
    : new URL(baseUrl).origin;

  const wellKnownUrls = [
    `${targetOrigin}/.well-known/mcp.json`,
    `${targetOrigin}/.well-known/webmcp`,
  ];

  const results: string[] = [];

  for (const mcpUrl of wellKnownUrls) {
    const content = await fetchUrl(mcpUrl);
    if (content) {
      try {
        const parsed = JSON.parse(content);

        if (parsed.mcpServers && typeof parsed.mcpServers === "object") {
          const servers = Object.entries(parsed.mcpServers);
          results.push(`Found mcp.json with ${servers.length} server(s)`);

          for (const [name, cfg] of servers.slice(0, 2)) {
            const c = cfg as Record<string, unknown>;
            const serverUrl = c.url as string;
            results.push(`  Server "${name}": ${serverUrl}`);

            if (serverUrl) {
              try {
                const res = await fetch(serverUrl, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ method: "initialize" }),
                });
                const reachable = res.ok ? await res.text() : null;
                if (
                  reachable &&
                  (reachable.includes('"success":true') ||
                    reachable.includes('"name":'))
                ) {
                  results.push(`    ✓ MCP endpoint REACHABLE (initialize OK)`);
                } else if (res.ok) {
                  results.push(`    ✗ Endpoint exists but not MCP protocol`);
                } else {
                  results.push(`    ✗ Endpoint NOT reachable (${res.status})`);
                }
              } catch (e) {
                results.push(`    ✗ Endpoint fetch error: ${e}`);
              }
            }
          }
        } else if (parsed.endpoints || parsed.servers) {
          results.push(`Found MCP-like at ${mcpUrl.split("/").pop()}`);
        }
      } catch {
        results.push(`Found ${mcpUrl.split("/").pop()} but not valid JSON`);
      }
    }
  }

  if (results.length === 0) {
    return `No MCP server found at ${targetOrigin}. Checked: .well-known/mcp.json, .well-known/webmcp`;
  }

  return results.join("\n");
}
