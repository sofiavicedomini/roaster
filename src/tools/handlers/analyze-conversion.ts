export function handleAnalyzeConversion(args: unknown): string {
  const { html } = args as { html: string };
  const signals: string[] = [];
  if (html.includes("submit") || html.includes("Subscribe") || html.includes("Sign Up")) signals.push("has CTA");
  if (html.includes("<button") && html.match(/button[^>]*>[^<]{3,30}</i)) signals.push("visible button text");
  if (html.includes("price") || html.includes("$") || html.includes("€")) signals.push("pricing visible");
  if (html.includes("form") && html.includes("input")) signals.push("has forms");
  if (html.includes('value="email"') || html.includes('name="email"')) signals.push("email capture");
  if (html.includes("required")) signals.push("form validation");
  const ctaCount = (html.match(/<button[^>]*>/gi) || []).length + (html.match(/<a[^>]*class="[^"]*btn/gi) || []).length;
  if (ctaCount > 0) signals.push(`${ctaCount} CTAs found`);
  if (ctaCount === 0) signals.push("no clear CTAs");
  return `Conversion: ${signals.join(", ")}`;
}