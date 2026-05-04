// Robust User-Agent that mimics real browsers and major crawlers (Googlebot, Bingbot)
// Format: Mozilla/5.0 (compatible; BotName/Version; +URL)
const USER_AGENTS = [
  "Mozilla/5.0 (compatible; StroncamiBot/1.0; +https://stroncami.it/bot)",
  "Mozilla/5.0 (Linux; Android 10) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; StroncamiBot/1.0; +https://stroncami.it/bot)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 (compatible; StroncamiBot/1.0; +https://stroncami.it/bot)",
  "Mozilla/5.0 (compatible; StroncamiBot/1.0; https://stroncami.it/bot, like Googlebot/2.1)",
];

let userAgentIndex = 0;

function getNextUserAgent(): string {
  userAgentIndex = (userAgentIndex + 1) % USER_AGENTS.length;
  return USER_AGENTS[userAgentIndex];
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
        "Cache-Control": "max-age=0"
      },
      redirect: "follow"
    });
    if (res.ok) return await res.text();
    console.log(`[fetchUrl] ${url} returned ${res.status} (UA: ${userAgent.split(";")[0]})`);
    return null;
  } catch (err) {
    console.error(`[fetchUrl] Error fetching ${url}:`, err);
    return null;
  }
}