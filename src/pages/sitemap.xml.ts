import type { APIContext } from "astro"

const locales = ["en", "it", "fr", "es", "pt", "de", "nl", "ru", "et"]

export async function GET({ request }: APIContext) {
  const url = new URL(request.url)
  const baseUrl = `${url.protocol}//${url.host}`

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
  ${locales
    .map(
      (locale) => `
  <url>
    <loc>${baseUrl}/${locale}</loc>
    <lastmod>${new Date().toISOString().split("T")[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${locale === "en" ? "1.0" : "0.8"}</priority>
    ${locales
      .map(
        (alt) => `
    <xhtml:link rel="alternate" hreflang="${alt}" href="${baseUrl}/${alt}" />`
      )
      .join("")}
    <xhtml:link rel="alternate" hreflang="x-default" href="${baseUrl}/en" />
  </url>`
    )
    .join("")}
</urlset>`

  return new Response(sitemap, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control": "public, max-age=3600",
    },
  })
}
