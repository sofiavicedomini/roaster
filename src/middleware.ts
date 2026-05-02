import { defineMiddleware } from "astro:middleware"

export const onRequest = defineMiddleware(async (_, next) => {
  const response = await next()

  const adsenseId = import.meta.env.ADSENSE_ACCOUNT_ID || ""
  const gtmId = import.meta.env.GTAG_ID || ""

  // Base CSP directives
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: https:",
    "font-src 'self' data:",
    "connect-src 'self' https:",
    "frame-src 'self'",
    "base-uri 'self'",
    "form-action 'self'",
  ]

  // Add Google Tag Manager
  if (gtmId) {
    cspDirectives[1] += " https://www.googletagmanager.com https://tagmanager.google.com"
    cspDirectives[3] += " https://www.googletagmanager.com"
    cspDirectives[5] += " https://www.googletagmanager.com"
  }

  // Add Google AdSense
  if (adsenseId) {
    cspDirectives[1] += " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagservices.com https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com https://www.gstatic.com"
    cspDirectives[2] += " https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://www.googletagservices.com https://fundingchoicesmessages.google.com"
    cspDirectives[3] += " https://*.g.doubleclick.net https://*.google.com https://pagead2.googlesyndication.com https://googleads.g.doubleclick.net https://fundingchoicesmessages.google.com"
    cspDirectives[4] += " https://*.g.doubleclick.net https://*.google.com https://fundingchoicesmessages.google.com https://www.gstatic.com"
    cspDirectives[5] += " https://*.google.com https://pagead2.googlesyndication.com https://fundingchoicesmessages.google.com"
    cspDirectives[6] += " https://googleads.g.doubleclick.net https://tpc.googlesyndication.com https://fundingchoicesmessages.google.com"
  }

  // Add Cloudflare Turnstile
  cspDirectives[1] += " https://challenges.cloudflare.com"
  cspDirectives[3] += " https://challenges.cloudflare.com"
  cspDirectives[5] += " https://challenges.cloudflare.com"

  // Build CSP header value
  const cspValue = cspDirectives.join("; ")

  // Add CSP header
  response.headers.set("Content-Security-Policy", cspValue)
  response.headers.set("X-Content-Type-Options", "nosniff")
  response.headers.set("X-Frame-Options", "SAMEORIGIN")
  response.headers.set("X-XSS-Protection", "1; mode=block")

  return response
})
