import { fetchUrl } from "../utils";

export async function handleAnalyzeRobotsTxt(
  args: unknown,
  baseUrl: string,
): Promise<string> {
  const { url: targetUrl } = args as { url: string };
  const origin = targetUrl.startsWith("http")
    ? new URL(targetUrl).origin
    : new URL(baseUrl).origin;
  const robotsUrl = `${origin}/robots.txt`;
  const content = await fetchUrl(robotsUrl);
  if (!content) {
    return `robots.txt not found at ${robotsUrl}`;
  }
  const lines = content.split("\n");
  const rules: string[] = [];
  const userAgents: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim().toLowerCase();
    if (trimmed.startsWith("user-agent:")) {
      const ua = trimmed.substring(9).trim();
      if (ua && !userAgents.includes(ua)) userAgents.push(ua);
    } else if (
      trimmed.startsWith("disallow:") ||
      trimmed.startsWith("allow:") ||
      trimmed.startsWith("crawl-delay:")
    ) {
      rules.push(trimmed);
    } else if (trimmed.startsWith("sitemap:")) {
      rules.push(`sitemap: ${trimmed.substring(8).trim()}`);
    }
  }
  const hasSitemap = rules.some((r) => r.startsWith("sitemap:"));
  const blockAll = rules.some((r) => r.includes("*") || r.includes("/"));
  return `robots.txt (${lines.length} lines). User-agents: ${userAgents.join(", ") || "none"}. Sitemap: ${hasSitemap ? "✓" : "missing"}. Rules: ${rules.slice(0, 5).join(", ")}${rules.length > 5 ? "..." : ""}. Potential issues: ${blockAll ? "overly broad rules" : "none detected"}`;
}
