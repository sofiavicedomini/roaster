import { fetchUrl } from "../utils";

export async function handleAnalyzeA2A(
  args: unknown,
  baseUrl: string,
): Promise<string> {
  const { url: targetUrl } = args as { url?: string };
  const origin = targetUrl
    ? new URL(targetUrl).origin
    : baseUrl
      ? new URL(baseUrl).origin
      : "";
  const a2aUrl = `${origin}/.well-known/a2a.json`;

  const content = await fetchUrl(a2aUrl);
  if (!content) return `A2A manifest not found at ${a2aUrl}`;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return `A2A manifest invalid JSON at ${a2aUrl}: ${content.substring(0, 100)}`;
  }

  const checks: string[] = [];
  if (parsed.agentId) checks.push(`agentId: ${parsed.agentId}`);
  if (parsed.name) checks.push(`name: "${parsed.name}"`);
  if (parsed.description) checks.push("description ✓");
  if (parsed.icon) checks.push("icon ✓");
  if (parsed.logo) checks.push("logo ✓");
  if (parsed.version) checks.push(`version: ${parsed.version}`);

  if (Array.isArray(parsed.capabilities))
    checks.push(`capabilities: ${parsed.capabilities.length}`);
  if (Array.isArray(parsed.endpoints)) {
    checks.push(`endpoints: ${parsed.endpoints.length}`);
    for (const ep of (parsed.endpoints as Record<string, unknown>[]).slice(
      0,
      2,
    )) {
      checks.push(`  - ${(ep as Record<string, unknown>).url || "unknown"}`);
    }
  }
  if (parsed.supports && Array.isArray(parsed.supports)) {
    checks.push(`supports: ${(parsed.supports as string[]).join(", ")}`);
  }

  const isValid = parsed.agentId || parsed.name;
  const status = isValid ? "VALID" : "INCOMPLETE";

  return `${status} A2A manifest (${content.length} bytes). ${checks.join(", ")}`;
}
