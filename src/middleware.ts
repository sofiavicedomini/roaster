import { defineMiddleware } from "astro:middleware"

const ALLOWED_ORIGINS = (import.meta.env.ALLOWED_ORIGINS || "")
  .split(",").map((s: string) => s.trim()).filter(Boolean)

export const onRequest = defineMiddleware(async ({ request }, next) => {
  if (["POST", "PUT", "DELETE", "PATCH"].includes(request.method)) {
    const origin = request.headers.get("origin")
    const host = request.headers.get("host")
    if (origin) {
      try {
        const originHost = new URL(origin).host
        const allowed = ALLOWED_ORIGINS.length > 0
          ? ALLOWED_ORIGINS.some((o: string) => { try { return new URL(o).host === originHost } catch { return false } })
          : originHost === host
        if (!allowed) {
          return new Response("Forbidden", { status: 403 })
        }
      } catch {
        return new Response("Forbidden", { status: 403 })
      }
    }
  }

  const response = await next()

  const adsenseId = import.meta.env.ADSENSE_ACCOUNT_ID || ""
  const gtmId = import.meta.env.GTAG_ID || ""

  // Base CSP directives (AdSense privacy iframe compatible)
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com blob: data:",
    "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://challenges.cloudflare.com blob: data:",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https: blob:",
    "font-src 'self' data: https:",
    "connect-src 'self' https: blob: wss:",
    "frame-src 'self' https://challenges.cloudflare.com https://www.googletagmanager.com https://www.google.com https://googleads.g.doubleclick.net https://fundingchoicesmessages.google.com https://consentcdn.cookiebot.eu",
    "child-src 'self' blob: https://challenges.cloudflare.com",
    "base-uri 'self'",
    "form-action 'self'",
  ]

  // Add Google Tag Manager + AdSense + Cookiebot domains
  if (gtmId || adsenseId) {
    const gtmDomains = " https://www.googletagmanager.com https://tagmanager.google.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagservices.com https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com https://www.gstatic.com"
    const cookiebotDomains = " https://*.cookiebot.com https://cookiebot.com https://*.cookiebot.eu https://cookiebot.eu"
    
    // script-src (index 1)
    cspDirectives[1] += gtmDomains + cookiebotDomains
    // script-src-elem (index 2)
    cspDirectives[2] += gtmDomains + cookiebotDomains
    // frame-src (index 7)
    cspDirectives[7] += " https://www.googletagmanager.com https://consentcdn.cookiebot.eu"
    // connect-src (index 5) - Cookiebot API calls + CDN
    cspDirectives[5] += " https://*.cookiebot.com https://cookiebot.com https://*.cookiebot.eu https://cookiebot.eu https://consentcdn.cookiebot.eu"
  }


  // Build CSP header value
  const cspValue = cspDirectives.join("; ")

  // Add CSP header
  response.headers.set("Content-Security-Policy", cspValue)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("X-XSS-Protection", "1; mode=block")
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains; preload")

  return response
})
