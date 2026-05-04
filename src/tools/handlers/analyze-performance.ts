import { renderPage } from "../browser";

export async function handleAnalyzePerformance(
  args: unknown,
  baseUrl: string,
): Promise<string> {
  const { html: htmlArg, url: urlArg } = args as {
    html?: string;
    url?: string;
  };

  const resolved = urlArg
    ? urlArg.startsWith("http")
      ? urlArg
      : new URL(urlArg, new URL(baseUrl).origin).toString()
    : null;

  let html = htmlArg ?? "";
  let browserSection = "";

  if (resolved) {
    const rendered = await renderPage(resolved, 20000);
    if (rendered) {
      html = rendered.html;
      const t = rendered.timing;
      const r = rendered.resourceCount;
      browserSection =
        `Real browser metrics: TTFB=${t.ttfb}ms, DOMContentLoaded=${t.domContentLoaded}ms, Load=${t.load}ms. ` +
        `Network: ${r.scripts} JS files, ${r.stylesheets} CSS files, ${r.images} images, ${r.total} total resources. `;
      if (t.ttfb > 600) browserSection += "TTFB > 600ms (slow server). ";
      if (t.domContentLoaded > 3000)
        browserSection += "DOMContentLoaded > 3s (heavy JS). ";
      if (t.load > 5000) browserSection += "Load > 5s (heavy page). ";
      if (r.scripts > 15)
        browserSection += `${r.scripts} JS requests is high. `;
      if (r.total > 80)
        browserSection += `${r.total} total resources is excessive. `;
    }
  }

  if (!html) {
    return browserSection || "No HTML or URL provided.";
  }

  const issues: string[] = [];
  if (html.includes("<script src=") && html.includes("<head>"))
    issues.push("render-blocking JS in <head>");
  if (!html.includes('loading="lazy"') && !html.includes("loading='lazy'"))
    issues.push("no lazy loading on images");
  const scriptCount = (html.match(/<script[^>]*>/g) || []).length;
  const linkCount = (html.match(/<link[^>]*>/g) || []).length;
  const imgCount = (html.match(/<img[^>]*>/g) || []).length;
  if (scriptCount > 10) issues.push(`${scriptCount} inline/external scripts`);
  if (imgCount > 20 && !html.includes("loading="))
    issues.push(`${imgCount} images without lazy loading`);
  if (!html.includes("font-display") && html.includes("@font-face"))
    issues.push("@font-face without font-display");
  if (!html.includes('rel="preload"') && !html.includes("rel='preload'"))
    issues.push("no resource preloading");

  const htmlAnalysis =
    issues.length > 0
      ? `HTML issues: ${issues.join(", ")}`
      : "HTML: no major issues";

  return (
    (browserSection ? browserSection + "\n" : "") +
    `${htmlAnalysis}. DOM: ${scriptCount} scripts, ${linkCount} link tags, ${imgCount} images. HTML size: ${(html.length / 1024).toFixed(1)}KB`
  );
}
