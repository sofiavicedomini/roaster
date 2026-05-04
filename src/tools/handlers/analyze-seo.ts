import { getHtmlForAnalysis } from "../utils";

export async function handleAnalyzeSeo(
  args: unknown,
  baseUrl: string,
): Promise<string> {
  const html = await getHtmlForAnalysis(
    args as { html?: string; url?: string },
    baseUrl,
  );
  if (!html) return "No HTML or URL provided. Pass url to analyze SEO.";
  const issues: string[] = [];
  if (!html.includes("<title") || !html.includes("</title>"))
    issues.push("missing title tag");
  if (!html.includes('name="description"'))
    issues.push("missing meta description");
  if (!html.includes('rel="canonical"')) issues.push("missing canonical URL");
  if (!html.includes('<meta property="og:title'))
    issues.push("missing OG title");
  if (!html.includes('<meta property="og:description'))
    issues.push("missing OG description");
  if (!html.includes('<meta property="og:image'))
    issues.push("missing OG image");
  if (!html.includes('<meta name="twitter:card'))
    issues.push("missing Twitter Card");
  if (!html.includes("application/ld+json")) issues.push("no structured data");
  if (!html.match(/<h[1-6][^>]*>/i)) issues.push("no heading hierarchy");
  const headingCount = (html.match(/<h[1-6][^>]*>/g) || []).length;
  const linkCount = (html.match(/<a[^>]*href/g) || []).length;
  if (linkCount < 3) issues.push("few internal links");
  return `SEO: ${issues.length > 0 ? issues.join(", ") : "good on-page SEO"}. Headings: ${headingCount}, Links: ${linkCount}.`;
}
