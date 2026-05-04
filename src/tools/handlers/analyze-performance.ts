export function handleAnalyzePerformance(args: unknown): string {
  const { html } = args as { html: string };
  const issues: string[] = [];
  if (html.includes("<script src=") && html.includes("<head>")) issues.push("render-blocking JS in head");
  if (html.includes('<link rel="stylesheet">') && html.includes("<head>")) issues.push("render-blocking CSS in head");
  if (!html.includes('loading="lazy"')) issues.push("no lazy loading on images");
  if (!html.includes(".js\">") && html.length > 50000) issues.push("large inline JS (possible bloat)");
  if (html.includes(".css\">") && html.length > 30000) issues.push("large inline CSS");
  const scriptCount = (html.match(/<script[^>]*>/g) || []).length;
  const linkCount = (html.match(/<link[^>]*>/g) || []).length;
  const imgCount = (html.match(/<img[^>]*>/g) || []).length;
  if (scriptCount > 10) issues.push(`${scriptCount} scripts (too many)`);
  if (imgCount > 20 && !html.includes("loading=")) issues.push(`${imgCount} images without lazy loading`);
  return `Performance: ${issues.length > 0 ? issues.join(", ") : "no major issues detected"}. Resources: ${scriptCount} scripts, ${linkCount} links, ${imgCount} images. HTML size: ${(html.length / 1024).toFixed(1)}KB`;
}