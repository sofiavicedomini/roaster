import { fetchUrl } from "../utils";

export async function handleAnalyzeWebmcp(
  args: unknown,
  baseUrl: string,
): Promise<string> {
  const { url: targetUrl } = args as { url?: string };
  const origin = targetUrl
    ? new URL(targetUrl).origin
    : baseUrl
      ? new URL(baseUrl).origin
      : "";
  const webmcpUrl = `${origin}/.well-known/webmcp`;

  const content = await fetchUrl(webmcpUrl);
  if (!content) return `WebMCP not found at ${webmcpUrl}`;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return `WebMCP invalid JSON at ${webmcpUrl}: ${content.substring(0, 100)}`;
  }

  const checks: string[] = [];
  if (parsed.name) checks.push(`name: "${parsed.name}"`);
  if (parsed.version) checks.push(`version: ${parsed.version}`);
  if (parsed.description) checks.push("description ✓");
  if (parsed.icon) checks.push("icon ✓");

  if (parsed.mcpServers && typeof parsed.mcpServers === "object") {
    const servers = Object.entries(
      parsed.mcpServers as Record<string, unknown>,
    );
    checks.push(`mcpServers: ${servers.length}`);
    for (const [name, cfg] of servers.slice(0, 2)) {
      const c = cfg as Record<string, unknown>;
      checks.push(`  - ${name}: url=${c.url || "none"}, type=${c.type || "?"}`);
    }
  }

  if (parsed.endpoints && Array.isArray(parsed.endpoints)) {
    checks.push(`endpoints: ${parsed.endpoints.length}`);
  }
  if (parsed.tools && Array.isArray(parsed.tools))
    checks.push(`tools: ${parsed.tools.length}`);
  if (parsed.prompts && Array.isArray(parsed.prompts))
    checks.push(`prompts: ${parsed.prompts.length}`);
  if (parsed.resources && Array.isArray(parsed.resources))
    checks.push(`resources: ${parsed.resources.length}`);

  const hasMcp = !!(parsed.mcpServers || parsed.endpoints || parsed.tools);
  const status = hasMcp ? "VALID" : "EMPTY";

  return `${status} WebMCP (${content.length} bytes). ${checks.join(", ")}`;
}
