import { getHtmlForAnalysis } from "../utils";

export async function handleAnalyzeHtmlStructure(
  args: unknown,
  baseUrl: string,
): Promise<string> {
  const html = await getHtmlForAnalysis(
    args as { html?: string; url?: string },
    baseUrl,
  );
  if (!html)
    return "No HTML or URL provided. Pass url to analyze HTML structure.";
  const tags: string[] = [];
  if (html.includes("<!DOCTYPE") || html.includes("<!doctype"))
    tags.push("doctype");
  if (html.includes('lang="')) tags.push("lang");
  if (html.includes('charset="')) tags.push("charset");
  if (html.includes("viewport")) tags.push("viewport");
  if (html.includes("<header")) tags.push("header");
  if (html.includes("<nav")) tags.push("nav");
  if (html.includes("<main")) tags.push("main");
  if (html.includes("<article")) tags.push("article");
  if (html.includes("<section")) tags.push("section");
  if (html.includes("<footer")) tags.push("footer");
  if (html.includes('<meta name="description"')) tags.push("meta description");
  if (html.includes('<meta property="og:')) tags.push("open graph");
  const missing = [
    "doctype",
    "lang",
    "charset",
    "viewport",
    "meta description",
  ].filter((t) => !tags.includes(t));
  return `Semantic tags: ${tags.slice(0, 8).join(", ")}${tags.length > 8 ? "..." : ""}. Missing: ${missing.join(", ")}${missing.length > 0 ? "" : " (good structure)"}`;
}
