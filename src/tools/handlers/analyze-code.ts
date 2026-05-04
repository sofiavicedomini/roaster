export function handleAnalyzeCode(args: unknown): string {
  const { html } = args as { html: string };
  const issues: string[] = [];
  if ((html.match(/style="[^"]*:/g) || []).length > 3) issues.push("inline styles");
  if ((html.match(/<script>/gi) || []).length > 0 && (html.match(/<script[^>]*>/gi) || []).length > 5) issues.push("multiple inline scripts");
  if (!html.includes("<!DOCTYPE") && !html.includes("<!doctype")) issues.push("no doctype");
  if (!html.includes("</head>") && !html.includes("</head>")) issues.push("no head section");
  if (html.includes("onclick=") || html.includes("onload=")) issues.push("inline event handlers");
  const idCount = html.match(/id="[^"]*"/g)?.length ?? 0;
  if (idCount > 20) issues.push("excessive IDs");
  return issues.length > 0 ? `Code quality issues: ${issues.join(", ")}` : "Code structure appears acceptable. Validate HTML formally.";
}