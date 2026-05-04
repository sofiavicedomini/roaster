export async function handleAnalyzeSecurityHeaders(args: unknown, baseUrl: string): Promise<string> {
  const { url: targetUrl } = args as { url: string };
  const resolved = targetUrl.startsWith("http") ? targetUrl : new URL(targetUrl, new URL(baseUrl).origin).toString();
  const response = await fetch(resolved, { method: "HEAD", redirect: "manual" });
  const headers: string[] = [];
  for (const [key, value] of response.headers.entries()) {
    if (key.toLowerCase().includes("content-security") ||
        key.toLowerCase().includes("strict-transport") ||
        key.toLowerCase().startsWith("x-") ||
        key.toLowerCase() === "referrer-policy" ||
        key.toLowerCase() === "permissions-policy") {
      headers.push(`${key}: ${value}`);
    }
  }
  const missing: string[] = [];
  if (!headers.some(h => h.startsWith("content-security-policy:"))) missing.push("Content-Security-Policy");
  if (!headers.some(h => h.startsWith("strict-transport-security:"))) missing.push("Strict-Transport-Security");
  if (!headers.some(h => h.startsWith("x-content-type-options:"))) missing.push("X-Content-Type-Options");
  if (!headers.some(h => h.startsWith("x-frame-options:"))) missing.push("X-Frame-Options");
  if (!headers.some(h => h.startsWith("referrer-policy:"))) missing.push("Referrer-Policy");
  if (!headers.some(h => h.startsWith("permissions-policy:"))) missing.push("Permissions-Policy");
  return headers.length > 0
    ? `Security headers found (${headers.length}): ${headers.join("; ")}${missing.length > 0 ? `. Missing: ${missing.join(", ")}` : ""}`
    : `No security headers found. Missing: ${missing.length > 0 ? missing.join(", ") : "all"}`;
}