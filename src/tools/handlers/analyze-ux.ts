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
  return signals.length > 0 ? `UX elements: ${signals.join(", ")}` : "No clear UX elements detected. Check navigation and feedback manually.";
}