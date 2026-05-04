import { getHtmlForAnalysis } from "../utils";

export async function handleAnalyzeBrand(args: unknown, baseUrl: string): Promise<string> {
  const html = await getHtmlForAnalysis(args as { html?: string; url?: string }, baseUrl);
  if (!html) return "No HTML or URL provided. Pass url to analyze brand.";
  const signals: string[] = [];
  if (html.includes("<svg") || (html.includes("<img") && html.includes("logo"))) signals.push("logo");
  if (html.match(/class="[^"]*color[^"]*"/i) || html.match(/style="[^"]*color:/i)) signals.push("colors");
  if (html.includes("font-family") || html.match(/<link[^>]*font/i)) signals.push("typography");
  const spacingMatches = html.match(/margin|padding/g);
  if ((spacingMatches?.length ?? 0) > 5) signals.push("spacing");
  if (html.includes("header") && html.includes("footer")) signals.push("layout consistency");
  return `Brand signals: ${signals.join(", ")}${signals.length < 2 ? ". Limited brand consistency detected" : ""}`;
}