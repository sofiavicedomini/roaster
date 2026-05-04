export function handleAnalyzeMobile(args: unknown): string {
  const { html } = args as { html: string };
  const issues: string[] = [];
  if (!html.includes('viewport')) issues.push("missing viewport meta");
  if (!html.includes("@media")) issues.push("no media queries");
  if (!html.includes('name="viewport"') && !html.includes('content="width=')) issues.push("missing proper viewport config");
  const hasTouch = html.includes("ontouchstart") || html.includes("touch-action");
  if (!hasTouch && html.includes("<button")) issues.push("no touch event handlers");
  const tapTargets = (html.match(/<a[^>]*href[^>]*>[^<]{0,20}</g) || []).length;
  if (tapTargets > 0) issues.push(`${tapTargets} small tap targets possible`);
  return `Mobile: ${issues.length > 0 ? issues.join(", ") : "appears mobile-friendly"}. Touch support: ${hasTouch ? "detected" : "not detected"}. Check tap targets manually at 44px minimum.`;
}