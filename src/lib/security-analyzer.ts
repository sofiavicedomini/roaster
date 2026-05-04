export function analyzeSecurityHeaders(headers: Headers): {
  present: string[];
  missing: string[];
  recommendations: string[];
} {
  const securityHeaders = {
    "Content-Security-Policy": "Mitiga XSS e injection",
    "Strict-Transport-Security": "Forza HTTPS",
    "X-Content-Type-Options": "Previene MIME sniffing",
    "X-Frame-Options": "Previene clickjacking",
    "Referrer-Policy": "Controlla referrer",
    "Permissions-Policy": "Controlla feature browser",
  };

  const present: string[] = [];
  const missing: string[] = [];
  const recommendations: string[] = [];

  for (const [header, description] of Object.entries(securityHeaders)) {
    if (headers.has(header)) {
      present.push(header);
    } else {
      missing.push(header);
      recommendations.push(`${header}: ${description}`);
    }
  }

  const csp = headers.get("Content-Security-Policy") || "";
  if (csp && !csp.includes("report-uri") && !csp.includes("report-to")) {
    recommendations.push("CSP: aggiungere report-uri per violationi");
  }

  const hsts = headers.get("Strict-Transport-Security") || "";
  if (hsts && !hsts.includes("preload")) {
    recommendations.push("HSTS: aggiungere preload per protezione max");
  }

  return { present, missing, recommendations };
}

export function checkHttpsRedirect(request: Request): {
  isSecure: boolean;
  redirectUrl?: string;
} {
  const protocol =
    request.headers.get("x-forwarded-proto") || new URL(request.url).protocol;
  const isSecure =
    protocol === "https:" ||
    request.headers.get("x-forwarded-proto") === "https";

  if (!isSecure) {
    const host = request.headers.get("host");
    if (host) {
      return {
        isSecure: false,
        redirectUrl: `https://${host}${new URL(request.url).pathname}`,
      };
    }
  }

  return { isSecure: true };
}
