import { fetchUrl } from "../utils";

export async function handleAnalyzeLlmsTxt(args: unknown): Promise<string> {
  const { url: llmsUrl } = args as { url: string };
  const content = await fetchUrl(llmsUrl);
  if (!content) {
    return `llms.txt not found at ${llmsUrl}`;
  }
  const lines = content.split("\n").filter(l => l.trim());
  const lower = content.toLowerCase();
  const hasAuth = lower.includes("authorization") || lower.includes("authentication");
  const hasRateLimit = lower.includes("rate") || lower.includes("limit");
  const hasPricing = lower.includes("price") || lower.includes("cost") || lower.includes("pricing");
  const hasContact = lower.includes("contact") || lower.includes("email");
  const hasApi = lower.includes("api") || lower.includes("endpoint");
  return `llms.txt (${lines.length} lines). Has: ${hasApi ? "API/endpoint" : "no API"}, ${hasAuth ? "auth" : "no auth"}, ${hasRateLimit ? "rate limits" : "no rate limits"}, ${hasPricing ? "pricing" : "no pricing"}, ${hasContact ? "contact" : "no contact"}. Preview: ${content.substring(0, 150).replace(/\n/g, " ")}`;
}