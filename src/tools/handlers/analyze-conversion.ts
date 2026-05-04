import { getHtmlForAnalysis } from "../utils";

export async function handleAnalyzeConversion(
  args: unknown,
  baseUrl: string,
): Promise<string> {
  const html = await getHtmlForAnalysis(
    args as { html?: string; url?: string },
    baseUrl,
  );
  if (!html) return "No HTML or URL provided. Pass url to analyze conversion.";
  const signals: string[] = [];

  if (
    html.includes("submit") ||
    html.includes("Subscribe") ||
    html.includes("Sign Up")
  )
    signals.push("has CTA");
  if (html.includes("<button") && html.match(/button[^>]*>[^<]{3,30}</i))
    signals.push("visible button text");
  if (html.includes("price") || html.includes("$") || html.includes("€"))
    signals.push("pricing visible");
  if (html.includes("form") && html.includes("input"))
    signals.push("has forms");
  if (html.includes('value="email"') || html.includes('name="email"'))
    signals.push("email capture");
  if (html.includes("required")) signals.push("form validation");
  const ctaCount =
    (html.match(/<button[^>]*>/gi) || []).length +
    (html.match(/<a[^>]*class="[^"]*btn/gi) || []).length;
  if (ctaCount > 0) signals.push(`${ctaCount} CTAs found`);
  if (ctaCount === 0) signals.push("no clear CTAs");

  if (html.match(/<form[^>]*action\s*=/i)) signals.push("form action defined");
  else if (html.includes("<form")) signals.push("form action missing");

  const hasEmail = html.match(/type\s*=\s*["']email["']/i);
  const hasTel = html.match(/type\s*=\s*["']tel["']/i);
  const hasNumber = html.match(/type\s*=\s*["']number["']/i);
  const hasDate = html.match(/type\s*=\s*["']date["']/i);
  if ((hasEmail && hasTel && hasNumber) || hasDate)
    signals.push("valid input types detected");
  else signals.push("no valid input types");

  if (
    html.match(/required/i) ||
    html.match(/pattern\s*=/i) ||
    html.match(/minlength/i) ||
    html.match(/maxlength/i)
  )
    signals.push("required validation");
  else signals.push("no required validation");

  if (
    html.match(/font-weight:\s*bold/i) ||
    html.match(/background.*#[0-9a-f]/i) ||
    html.match(/color:\s*#[0-9a-f]/i)
  )
    signals.push("CTA styled");
  else signals.push("CTA not styled");

  if (
    html.match(/secure/i) ||
    html.match(/ssl/i) ||
    html.match(/encrypted/i) ||
    html.match(/trust/i)
  )
    signals.push("trust signals");
  else signals.push("no trust signals");

  return `Conversion: ${signals.join(", ")}`;
}
