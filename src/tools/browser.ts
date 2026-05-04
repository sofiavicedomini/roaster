import puppeteer, { type Browser } from "puppeteer";

let _browser: Browser | null = null;

async function getBrowser(): Promise<Browser> {
  if (_browser?.connected) return _browser;
  _browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
    ],
  });
  return _browser;
}

export interface RenderResult {
  html: string;
  finalUrl: string;
  timing: { ttfb: number; domContentLoaded: number; load: number };
  resourceCount: { scripts: number; stylesheets: number; images: number; total: number };
}

export async function renderPage(url: string, timeoutMs = 15000): Promise<RenderResult | null> {
  let page;
  try {
    const browser = await getBrowser();
    page = await browser.newPage();

    await page.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
    await page.setUserAgent(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    );
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      "Sec-CH-UA": '"Chromium";v="120", "Google Chrome";v="120", "Not-A.Brand";v="99"',
      "Sec-CH-UA-Mobile": "?0",
      "Sec-CH-UA-Platform": '"macOS"',
      "DNT": "1",
    });

    await page.goto(url, { waitUntil: "networkidle2", timeout: timeoutMs });

    const html = await page.content();
    const finalUrl = page.url();

    const timing = await page.evaluate(() => {
      const nav = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming;
      if (!nav) return { ttfb: 0, domContentLoaded: 0, load: 0 };
      return {
        ttfb: Math.round(nav.responseStart - nav.requestStart),
        domContentLoaded: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
        load: Math.round(nav.loadEventEnd - nav.startTime),
      };
    });

    const resourceCount = await page.evaluate(() => {
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const scripts = entries.filter((e) => e.initiatorType === "script").length;
      const stylesheets = entries.filter((e) => e.initiatorType === "link" || e.initiatorType === "css").length;
      const images = entries.filter((e) => e.initiatorType === "img").length;
      return { scripts, stylesheets, images, total: entries.length };
    });

    return { html, finalUrl, timing, resourceCount };
  } catch (err) {
    console.error(`[renderPage] Error fetching ${url}:`, err);
    return null;
  } finally {
    await page?.close().catch(() => {});
  }
}
