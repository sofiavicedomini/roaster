import { fetchUrl } from "../utils";

export async function handleAnalyzeApiCatalog(args: unknown, baseUrl: string): Promise<string> {
  const { url: targetUrl } = args as { url?: string };
  const origin = targetUrl ? new URL(targetUrl).origin : baseUrl ? new URL(baseUrl).origin : "";
  const catalogUrl = `${origin}/.well-known/api-catalog`;
  
  const content = await fetchUrl(catalogUrl);
  if (!content) return `API Catalog not found at ${catalogUrl}`;
  
  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return `API Catalog invalid JSON at ${catalogUrl}: ${content.substring(0, 100)}`;
  }
  
  const checks: string[] = [];
  if (parsed.title) checks.push(`title: "${parsed.title}"`);
  if (parsed.description) checks.push("description ✓");
  if (parsed.version) checks.push(`version: ${parsed.version}`);
  if (parsed.license) checks.push(`license: ${parsed.license}`);
  if (parsed.contact) checks.push("contact ✓");
  
  const apis = parsed.apis || parsed.openapi || parsed.swagger || parsed.endpoints || parsed.links;
  if (Array.isArray(apis)) {
    checks.push(`apis: ${apis.length}`);
    for (const api of (apis as Record<string, unknown>[]).slice(0, 2)) {
      checks.push(`  - ${(api as Record<string, unknown>).title || (api as Record<string, unknown>).name || "unnamed"}`);
    }
  } else if (apis && typeof apis === "object") {
    checks.push(`keys: ${Object.keys(apis).slice(0, 4).join(", ")}`);
  }
  
  const hasApis = !!(parsed.apis || parsed.openapi || parsed.swagger || parsed.endpoints || parsed.links);
  const status = hasApis ? "VALID" : "EMPTY";
  
  return `${status} API Catalog (${content.length} bytes). ${checks.join(", ")}`;
}