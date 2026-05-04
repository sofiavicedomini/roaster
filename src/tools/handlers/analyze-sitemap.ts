import { fetchUrl } from "../utils";

export async function handleAnalyzeSitemap(args: unknown): Promise<string> {
  const { url: sitemapUrl } = args as { url: string };
  const content = await fetchUrl(sitemapUrl);
  if (!content) {
    return `Sitemap not found at ${sitemapUrl}`;
  }
  if (content.includes("<urlset>") || content.includes("<url>")) {
    const urlMatches = content.match(/<loc>[^<]+<\/loc>/g) || [];
    const lastmodMatches = content.match(/<lastmod>[^<]+<\/lastmod>/g) || [];
    const isIndex = content.includes("<sitemapindex>");
    return `${isIndex ? "Sitemap index" : "Sitemap"} with ${urlMatches.length} URLs. Lastmod entries: ${lastmodMatches.length}. Structure: ${isIndex ? "index with sub-sitemaps" : "flat URL list"}`;
  }
  return `Invalid sitemap XML. Content preview: ${content.substring(0, 200)}`;
}
