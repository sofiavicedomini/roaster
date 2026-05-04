export function handleAnalyzeUx(args: unknown): string {
  const { html } = args as { html: string };
  const signals: string[] = [];

  if (html.includes("<nav") || html.includes("navigation")) signals.push("navigation");
  if (html.includes("search")) signals.push("search");
  if (html.includes("breadcrumb")) signals.push("breadcrumbs");
  if (html.includes("alert") || html.includes("error") || html.includes("success")) signals.push("feedback states");
  if (html.includes("loading")) signals.push("loading states");
  if (html.match(/placeholder=/i)) signals.push("form placeholders");
  if (html.match(/aria-live/i)) signals.push("accessible notifications");

  if (html.match(/<a[^>]*href\s*=\s*["']#(?:main|content|skip)[^"']*>/i)) signals.push("skip link");
  else if (html.match(/<a[^>]*>(?:skip|skip to|skip to main)/i)) signals.push("skip link");

  if (html.match(/:focus/i) || html.match(/focus[:\s]/i) || html.includes("outline") || html.match(/focus-visible/i)) signals.push("focus states");
  else signals.push("no focus states");

  if (html.match(/prefers-reduced-motion/i) || html.match(/@media.*reduce/i)) signals.push("reduced motion");
  else signals.push("no reduced motion");

  if (html.match(/min-height:\s*\d{2,}/i) || html.match(/min-height:\s*\d+px/i)) signals.push("touch targets ≥44px");
  else if (html.match(/padding:\s*\d+px/i) && html.match(/padding:\s*2[2-9]px/i)) signals.push("touch targets ≥44px");

  if (html.match(/color:\s*#[0-9a-f]{3,6}/i)) signals.push("color defined");
  if (html.match(/contrast/gi)) signals.push("contrast defined");

  return signals.length > 0 ? `UX elements: ${signals.join(", ")}` : "No clear UX elements detected. Check navigation and feedback manually.";
}