# Tool Improvements

## Problem

Two critical blockers in current tool implementation:

1. **`scrape_url` truncates at 600 chars** — average homepage is 50–500KB. The LLM sees only DOCTYPE + a few meta tags. Every tool that receives HTML from the agent (performance, SEO, accessibility, mobile, etc.) is effectively blind.
2. **No JS rendering** — modern sites are SPAs or use lazy loading. Plain `fetch()` returns an empty HTML shell, not the rendered DOM.

## Solution

### 1. Puppeteer — real headless browser (`src/tools/browser.ts`)

Singleton browser instance reused across requests. Each `scrape_url` call:
- Launches headless Chrome (if not already running)
- Sets real 1440×900 viewport + Chrome 120 UA (no custom bot string)
- Sends `Sec-CH-UA`, `Sec-CH-UA-Mobile`, `Sec-CH-UA-Platform` Client Hints
- Waits for `networkidle0` (JS fully executed, no pending requests)
- Collects real timing: TTFB, DOMContentLoaded, Load (via PerformanceNavigationTiming)
- Collects real resource counts: scripts, stylesheets, images
- Falls back to `fetchUrl()` if Puppeteer fails

### 2. Smart HTML extraction (`src/tools/extract.ts`)

Instead of returning raw truncated HTML, extract semantic content:
- `<title>`, `<meta description>`, canonical URL
- Open Graph tags, Twitter Card tags
- JSON-LD structured data blocks
- `<h1>–<h6>` headings with text
- Visible text content (strip all tags, normalize whitespace, max 6000 chars)
- Links: first 30 `<a href>` with anchor text
- Images: first 30 `<img>` with `src` + `alt`
- Forms: `<form>` with action, method, input names
- External scripts and stylesheets (URLs)

Output: structured string ~15KB — dense with signal, no HTML noise.

### 3. Fetch improvements (`src/tools/utils.ts`)

- Remove `StroncamiBot` from all User-Agent strings — sites detect and block/alter responses to unknown bots
- Use clean Chrome 120 UAs (macOS, Windows, Android)
- Add `Sec-CH-UA`, `Sec-CH-UA-Mobile`, `Sec-CH-UA-Platform`, `DNT: 1`

### 4. Fix `analyze_security_headers` (`src/tools/handlers/analyze-security-headers.ts`)

Change `method: "HEAD", redirect: "manual"` → `method: "GET", redirect: "follow"`:
- HEAD + manual redirect stops at the first redirect (e.g., http→https) and misses security headers set on the final response
- GET + follow sees headers from the actual destination

### 5. Real performance metrics (`src/tools/handlers/analyze-performance.ts`)

Accept URL parameter. Use Puppeteer for real metrics:
- TTFB, DOMContentLoaded, Load time (ms)
- Script/stylesheet/image counts from network activity
- HTML-based analysis runs on the full rendered DOM (not 600 chars)

### 6. Timeout increases (`src/pages/api/roast.ts`)

Puppeteer is slower than bare fetch:
- Scrape timeout: 8s → 20s
- Per-tool timeout: 5s → 12s
- Overall pre-analysis: 30s → 60s
- Pre-analysis result truncation: 400 chars → 5000 chars

## Files Changed

| File | Change |
|------|--------|
| `src/tools/browser.ts` | NEW — Puppeteer singleton + `renderPage()` |
| `src/tools/extract.ts` | NEW — `extractPageContent()` + `formatExtractedPage()` |
| `src/tools/handlers/scrape.ts` | Puppeteer + extraction, 600 → 20000 char limit |
| `src/tools/utils.ts` | Clean UAs, Client Hints headers |
| `src/tools/handlers/analyze-security-headers.ts` | HEAD → GET, redirect: follow |
| `src/tools/handlers/analyze-performance.ts` | URL param + real Puppeteer metrics |
| `src/pages/api/roast.ts` | Timeout + truncation increases |
