import { renderPage } from "../browser";
import { extractPageContent, formatExtractedPage } from "../extract";
import { fetchUrl } from "../utils";

const MAX_OUTPUT = 20000;

export async function handleScrapeUrl(args: unknown, baseUrl: string): Promise<string> {
  const { url: targetUrl } = args as { url: string };
  const resolved = targetUrl.startsWith("http")
    ? targetUrl
    : new URL(targetUrl, new URL(baseUrl).origin).toString();

  const rendered = await renderPage(resolved);
  const html = rendered?.html ?? (await fetchUrl(resolved));

  if (!html) return `Not found at ${resolved}`;

  const extracted = extractPageContent(html);
  let result = formatExtractedPage(extracted);

  if (rendered) {
    const { timing, resourceCount, finalUrl } = rendered;
    if (finalUrl !== resolved) result += `\nFinal URL (after redirects): ${finalUrl}`;
    result += `\n\n--- Browser Timing ---`;
    result += `\nTTFB: ${timing.ttfb}ms | DOMContentLoaded: ${timing.domContentLoaded}ms | Load: ${timing.load}ms`;
    result += `\n--- Network Resources ---`;
    result += `\n${resourceCount.scripts} scripts, ${resourceCount.stylesheets} stylesheets, ${resourceCount.images} images (${resourceCount.total} total)`;
  } else {
    result += `\n(fetched via HTTP, no JS rendering)`;
  }

  return result.length > MAX_OUTPUT ? result.substring(0, MAX_OUTPUT - 3) + "..." : result;
}
