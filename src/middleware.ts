import { defineMiddleware } from "astro:middleware"

export const onRequest = defineMiddleware(async (_, next) => {
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
  }


  // Build CSP header value
  const cspValue = cspDirectives.join("; ")

  // Add CSP header
  response.headers.set("Content-Security-Policy", cspValue)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("X-XSS-Protection", "1; mode=block")

  return response
})
