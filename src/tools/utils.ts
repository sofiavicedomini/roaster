const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
];

let userAgentIndex = 0;

function getNextUserAgent(): string {
  userAgentIndex = (userAgentIndex + 1) % USER_AGENTS.length;
  return USER_AGENTS[userAgentIndex];
}

export async function getHtmlForAnalysis(
  args: { html?: string; url?: string },
  baseUrl: string
): Promise<string | null> {
  if (args.html) return args.html;
  if (!args.url) return null;
  const resolved = args.url.startsWith("http")
    ? args.url
    : new URL(args.url, new URL(baseUrl).origin).toString();
  return fetchUrl(resolved);
}

export async function fetchUrl(url: string): Promise<string | null> {
  try {
    const userAgent = getNextUserAgent();
    const res = await fetch(url, {
      headers: {
        "User-Agent": userAgent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,it;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-CH-UA": '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="99"',
        "Sec-CH-UA-Mobile": "?0",
        "Sec-CH-UA-Platform": '"macOS"',
        "Cache-Control": "max-age=0",
        "DNT": "1",
      },
      redirect: "follow",
    });
    if (res.ok) return await res.text();
    console.log(`[fetchUrl] ${url} returned ${res.status}`);
    return null;
  } catch (err) {
    console.error(`[fetchUrl] Error fetching ${url}:`, err);
    return null;
  }
}
