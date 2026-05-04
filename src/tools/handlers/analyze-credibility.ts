import { getHtmlForAnalysis } from "../utils";

export async function handleAnalyzeCredibility(args: unknown, baseUrl: string): Promise<string> {
  const html = await getHtmlForAnalysis(args as { html?: string; url?: string }, baseUrl);
  if (!html) return "No HTML or URL provided. Pass url to analyze credibility.";
  const signals: string[] = [];
  const pageUrl = new URL(baseUrl);
  if (html.includes("privacy") || html.includes("policy")) signals.push("privacy/policy");
  if (html.includes("terms") || html.includes("conditions")) signals.push("terms");
  if (html.includes("about") || html.includes("company")) signals.push("about");
  if (html.includes("contact") || html.includes("email") || html.includes("@")) signals.push("contact");
  if (html.includes("ssl") || html.includes("https") || pageUrl.protocol === "https:") signals.push("SSL");
  if (html.includes("social") || html.includes("twitter") || html.includes("facebook") || html.includes("linkedin")) signals.push("social");
  if (html.includes("review") || html.includes("testimonial")) signals.push("reviews");
  if (html.includes("secure") || html.includes("trust")) signals.push("trust badges");
  const missing = signals.length < 3 ? `Missing credibility signals: ${["contact", "privacy", "about", "SSL"].filter(s => !signals.includes(s)).join(", ")}` : "";
  return `Credibility: ${signals.join(", ")}${missing ? ". " + missing : ""}`;
}