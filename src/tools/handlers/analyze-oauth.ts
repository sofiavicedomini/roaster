import { fetchUrl } from "../utils";

export async function handleAnalyzeOauth(
  args: unknown,
  baseUrl: string,
): Promise<string> {
  const { url: targetUrl } = args as { url?: string };
  const origin = targetUrl
    ? new URL(targetUrl).origin
    : baseUrl
      ? new URL(baseUrl).origin
      : "";
  const oauthUrl = `${origin}/.well-known/oauth-authorization-server`;

  const content = await fetchUrl(oauthUrl);
  if (!content) return `OAuth discovery not found at ${oauthUrl}`;

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(content);
  } catch {
    return `OAuth discovery invalid JSON at ${oauthUrl}: ${content.substring(0, 100)}`;
  }

  const checks: string[] = [];
  if (parsed.issuer) checks.push(`issuer: ${parsed.issuer}`);
  if (parsed.authorization_endpoint) checks.push("auth_endpoint ✓");
  if (parsed.token_endpoint) checks.push("token_endpoint ✓");
  if (parsed.registration_endpoint) checks.push("dynamic_registration ✓");
  if (parsed.userinfo_endpoint) checks.push("userinfo ✓");
  if (parsed.jwks_uri) checks.push("jwks_uri ✓");

  if (Array.isArray(parsed.grant_types_supported)) {
    checks.push(
      `grants: ${(parsed.grant_types_supported as string[]).join(", ")}`,
    );
  }
  if (Array.isArray(parsed.scopes_supported)) {
    const scopes = (parsed.scopes_supported as string[]).slice(0, 4);
    const more = (parsed.scopes_supported as string[]).length > 4 ? "..." : "";
    checks.push(`scopes: ${scopes.join(", ")}${more}`);
  }
  if (Array.isArray(parsed.response_types_supported)) {
    checks.push(
      `response_types: ${(parsed.response_types_supported as string[]).join(", ")}`,
    );
  }

  const isValid = parsed.authorization_endpoint && parsed.token_endpoint;
  const status = isValid ? "VALID" : "INCOMPLETE";

  return `${status} OAuth (${content.length} bytes). ${checks.join(", ")}`;
}
