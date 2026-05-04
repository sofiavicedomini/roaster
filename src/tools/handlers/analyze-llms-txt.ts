import { fetchUrl } from "../utils";

export async function handleAnalyzeLlmsTxt(
  args: unknown,
  baseUrl: string,
): Promise<string> {
  const { url: providedUrl } = args as { url?: string };

  const origin = baseUrl
    ? new URL(baseUrl).origin
    : providedUrl
      ? new URL(providedUrl).origin
      : "";
  const base = origin || providedUrl;

  const urlsToTry = [
    { url: `${base}/llms-full.txt`, name: "llms-full.txt", preferred: true },
    { url: `${base}/llms.txt`, name: "llms.txt", preferred: false },
  ];

  for (const attempt of urlsToTry) {
    const content = await fetchUrl(attempt.url);
    if (!content) continue;

    const lines = content.split("\n").filter((l) => l.trim());
    const lower = content.toLowerCase();

    const hasInstructions =
      lower.includes("## instructions") ||
      lower.includes("system ") ||
      lower.includes("system_prompt") ||
      lower.includes("prompt");
    const hasApi =
      lower.includes("## api") ||
      lower.includes("endpoint") ||
      lower.includes("/v1/");
    const hasAuth =
      lower.includes("authorization") ||
      lower.includes("authentication") ||
      lower.includes("bearer");
    const hasRateLimit = lower.includes("rate") || lower.includes("limit");
    const hasPricing =
      lower.includes("price") ||
      lower.includes("cost") ||
      lower.includes("pricing");
    const hasContact = lower.includes("contact") || lower.includes("email");
    const hasSchema =
      lower.includes("openapi") ||
      lower.includes("swagger") ||
      lower.includes("schema");
    const hasTools = lower.includes("tool") || lower.includes("function");

    const flags: string[] = [];
    flags.push(hasApi ? "API" : "no API");
    flags.push(hasInstructions ? "instructions" : "no instructions");
    flags.push(hasAuth ? "auth" : "no auth");
    flags.push(hasRateLimit ? "rate limits" : "no limits");
    flags.push(hasPricing ? "pricing" : "no pricing");
    flags.push(hasContact ? "contact" : "no contact");
    flags.push(hasSchema ? "schema" : "no schema");
    flags.push(hasTools ? "tools" : "no tools");

    const pref = attempt.preferred ? " ✓" : "";
    return `${attempt.name} (${lines.length} lines)${pref}. ${flags.join(", ")}. Preview: ${content.substring(0, 120).replace(/\n/g, " ")}`;
  }

  return `llms.txt/llms-full.txt not found at ${base}`;
}
