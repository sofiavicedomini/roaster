import { fetchUrl } from "../utils";

export async function handleScrapeUrl(args: unknown, baseUrl: string): Promise<string> {
  const { url: targetUrl } = args as { url: string };
  const resolved = targetUrl.startsWith("http") ? targetUrl : new URL(targetUrl, new URL(baseUrl).origin).toString();
  const content = await fetchUrl(resolved);
  return content
    ? (content.length > 600 ? content.substring(0, 597) + "..." : content)
    : `Not found at ${resolved}`;
}