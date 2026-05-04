import { fetchUrl } from "../utils";

export async function handleAnalyzeAgentCard(
  args: unknown,
  baseUrl: string,
): Promise<string> {
  const { url: targetUrl } = args as { url?: string };
  const origin = targetUrl
    ? new URL(targetUrl).origin
    : baseUrl
      ? new URL(baseUrl).origin
      : "";
  const cardUrl = `${origin}/.well-known/agent.json`;

  const content = await fetchUrl(cardUrl);
  if (!content) return `Agent Card not found at ${cardUrl}`;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return `Agent Card invalid JSON at ${cardUrl}: ${content.substring(0, 100)}`;
  }

  const checks: string[] = [];
  if (parsed.name) checks.push(`name: "${parsed.name}"`);
  if (parsed.version) checks.push(`version: ${parsed.version}`);
  if (parsed.description) checks.push("description ✓");
  if (parsed.icon) checks.push("icon ✓");

  if (Array.isArray(parsed.skills))
    checks.push(`skills: ${parsed.skills.length}`);
  if (Array.isArray(parsed.endpoints)) {
    checks.push(`endpoints: ${parsed.endpoints.length}`);
    for (const ep of (parsed.endpoints as Record<string, unknown>[]).slice(
      0,
      2,
    )) {
      checks.push(`  - ${(ep as Record<string, unknown>).url || "unknown"}`);
    }
  }
  if (Array.isArray(parsed.capabilities))
    checks.push(`capabilities: ${parsed.capabilities.length}`);

  const isValid = parsed.name && parsed.version;
  const status = isValid ? "VALID" : "INCOMPLETE";

  return `${status} Agent Card (${content.length} bytes). ${checks.join(", ")}`;
}
