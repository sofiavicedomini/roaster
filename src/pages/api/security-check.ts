import type { APIRoute } from "astro"
import { analyzeSecurityHeaders, checkHttpsRedirect } from "@/lib/security-analyzer"

export const GET: APIRoute = async ({ request }) => {
  const targetUrl = new URL(request.url).searchParams.get("url")

  if (!targetUrl) {
    const isHttpsRedirect = checkHttpsRedirect(request)
    const selfAnalysis = analyzeSecurityHeaders(request.headers)

    return new Response(JSON.stringify({
      selfAnalysis,
      httpsRedirect: isHttpsRedirect,
      usage: "GET /api/security-check?url=https://example.com",
    }), {
      headers: { "Content-Type": "application/json" },
    })
  }

  try {
    const response = await fetch(targetUrl, {
      method: "HEAD",
      redirect: "manual",
    })

    const securityHeaders = new Headers()
    for (const [key, value] of response.headers.entries()) {
      if (key.toLowerCase().includes("content-security") ||
          key.toLowerCase().includes("strict-transport") ||
          key.toLowerCase().startsWith("x-")) {
        securityHeaders.set(key, value)
      }
    }

    const analysis = analyzeSecurityHeaders(securityHeaders)
    const isSecure = targetUrl.startsWith("https://")

    return new Response(JSON.stringify({
      url: targetUrl,
      status: response.status,
      isSecure,
      ...analysis,
      headers: Object.fromEntries(securityHeaders.entries()),
    }), {
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : "Fetch failed",
      url: targetUrl,
    }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    })
  }
}