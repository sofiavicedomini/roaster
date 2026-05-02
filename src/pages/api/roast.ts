export const prerender = false;

import type { APIRoute } from "astro";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTranslations, type Locale } from "@/i18n/utils";

const locales: string[] = ["en", "it", "fr", "es", "pt", "de", "nl", "ru", "et"];

export const POST: APIRoute = async ({ request }) => {
  let t: ReturnType<typeof getTranslations> | null = null;
  try {
    const body = await request.json();
    const { url, categories, locale = "en" } = body;
    const safeLocale = locales.includes(locale as Locale) ? locale as Locale : "en" as Locale;
    t = getTranslations(safeLocale);

    if (!url) {
      return new Response(JSON.stringify({ error: t.errors.urlRequired }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prompt = await buildPrompt(url, categories);

    const apiBase = import.meta.env.OPENAI_API_BASE || "http://localhost:11434/v1";
    const apiKey = import.meta.env.OPENAI_API_KEY || "dummy";
    const model = import.meta.env.OPENAI_MODEL || "llama3";

    console.log("[Roast API] Request:", {
      url,
      categories,
      model,
      apiBase,
      promptLength: prompt.length,
    });

    const response = await fetch(`${apiBase}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    console.log("[Roast API] Response status:", response.status, response.statusText);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[Roast API] Error response:", response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({
            error: t.errors.highTraffic,
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ error: `${t.errors.aiApi}${errorText}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    console.log("[Roast API] AI response:", {
      model: data.model,
      usage: data.usage,
      choicesLength: data.choices?.length,
      hasToolCalls: data.choices?.[0]?.message?.tool_calls?.length > 0,
      contentType: typeof data.choices?.[0]?.message?.content,
      contentPreview: typeof data.choices?.[0]?.message?.content === "string"
        ? data.choices[0].message.content.substring(0, 200)
        : "non-string content",
    });

    const content = data.choices?.[0]?.message?.content || "";
    const toolCalls = data.choices?.[0]?.message?.tool_calls;

    if (toolCalls && toolCalls.length > 0) {
      console.warn("[Roast API] AI attempted to use tools:", toolCalls);
    }

    let parsed;
    try {
      parsed = JSON.parse(content);
      console.log("[Roast API] Parsed response:", {
        hasOverallScore: typeof parsed.overall_score === "number",
        verdictLength: parsed.verdict?.length,
        scoresCount: Object.keys(parsed.scores || {}).length,
        roastsCount: parsed.roasts?.length,
      });
    } catch (parseError) {
      console.error("[Roast API] JSON parse error:", parseError);
      console.error("[Roast API] Raw content:", content);
      return new Response(
        JSON.stringify({ error: t.errors.invalidJson, raw: content }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Roast API] Unhandled error:", err);
    const errorMsg = t ? t.errors.unknown : "Unknown error";
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : errorMsg }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

async function fetchUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Agent-Readiness-Checker" } });
    if (res.ok) return await res.text();
    console.log(`[fetchUrl] ${url} returned ${res.status}`);
    return null;
  } catch (err) {
    console.error(`[fetchUrl] Error fetching ${url}:`, err);
    return null;
  }
}

async function checkAgentReadiness(baseUrl: string) {
  const results: Record<string, { status: string; detail: string; score: number }> = {};
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;

  const checks = [
    { key: "robots", url: `${origin}/robots.txt`, label: "robots.txt", score: 2 },
    { key: "sitemap", url: `${origin}/sitemap.xml`, label: "sitemap.xml", score: 1 },
    { key: "llms", url: `${origin}/llms.txt`, label: "llms.txt", score: 3 },
    { key: "llmsfull", url: `${origin}/llms-full.txt`, label: "llms-full.txt", score: 1 },
    { key: "mcp", url: `${origin}/.well-known/mcp`, label: "MCP well-known", score: 3 },
    { key: "oauth", url: `${origin}/.well-known/oauth-authorization-server`, label: "OAuth discovery", score: 2 },
    { key: "oauth-protected", url: `${origin}/.well-known/oauth-protected-resource`, label: "OAuth protected resource", score: 1 },
    { key: "agent-card", url: `${origin}/.well-known/agent.json`, label: "Agent Card", score: 2 },
    { key: "a2a", url: `${origin}/.well-known/a2a.json`, label: "A2A Agent Card", score: 2 },
    { key: "api-catalog", url: `${origin}/.well-known/api-catalog`, label: "API Catalog", score: 1 },
    { key: "webmcp", url: `${origin}/.well-known/webmcp`, label: "WebMCP", score: 1 },
    { key: "agentskills", url: `${origin}/.agentskills`, label: "Agent Skills", score: 1 },
  ];

  let totalScore = 0;
  let maxScore = 0;

  for (const check of checks) {
    const content = await fetchUrl(check.url);
    results[check.key] = content
      ? { status: "found", detail: `${check.label} exists (${content.length} chars)`, score: check.score }
      : { status: "not found", detail: `${check.label} not found at ${check.url}`, score: 0 };
    if (content) totalScore += check.score;
    maxScore += check.score;
  }

  const headersToCheck = ["link", "x-robots-tag", "content-type", "x-content-signals"];
  try {
    const res = await fetch(baseUrl, { headers: { "User-Agent": "Mozilla/5.0 Agent-Readiness-Checker" } });
    const headers: string[] = [];
    for (const h of headersToCheck) {
      const val = res.headers.get(h);
      if (val) headers.push(`${h}: ${val}`);
    }
    results["headers"] = headers.length > 0
      ? { status: "found", detail: headers.join("; "), score: 1 }
      : { status: "not found", detail: "No relevant headers found", score: 0 };
    if (headers.length > 0) totalScore += 1;
    maxScore += 1;
  } catch {
    results["headers"] = { status: "error", detail: "Could not fetch homepage", score: 0 };
    maxScore += 1;
  }

  results["_summary"] = {
    status: `${totalScore}/${maxScore} checks passed`,
    detail: `Agent Readiness Score: ${Math.round((totalScore / maxScore) * 10)}/10`,
    score: Math.round((totalScore / maxScore) * 10),
  };

  console.log("[Agent Readiness] Check results:", results);
  return results;
}

async function buildPrompt(url: string, categories: string[]): Promise<string> {
  console.log("[buildPrompt] Building prompt for:", { url, categories });
  const promptPath = join(process.cwd(), "prompt.md");
  let basePrompt = "";

  try {
    basePrompt = readFileSync(promptPath, "utf-8");
  } catch {
    console.warn("[buildPrompt] prompt.md not found, using default prompt");
    basePrompt = `You're a senior developer who's been building websites for 15 years. A colleague just showed you their site ({{URL}}) and asked for honest feedback. You're a good friend — you're not going to trash them — but you're also not going to lie to them. You talk like a real person: short sentences, a dry sense of humor, occasional sarcasm, no corporate fluff.

Roast this website across these categories: {{CATEGORIES}}.

Write like you're talking to a developer friend over Slack. Skip buzzwords like "leverage", "comprehensive", "robust", "actionable", "seamlessly", "it's worth noting". Don't say things like "Overall, this website..." or "In terms of accessibility...". Just get to the point. Use specific observations. Be direct. You can be funny but the goal is genuinely useful feedback, not just dunking on them.

For the "conversion" category, consider any goal the site might have: ecommerce sales, signups, downloads, brand exposure, newsletter subscriptions, etc. Don't assume it's an online store.

Respond ONLY with a JSON object (no markdown, no preamble) in exactly this format:
{
  "overall_score": <number 1-10>,
  "verdict": "<one blunt sentence — what's the main takeaway about this site. No fluff.>",
  "scores": {
    "design": <1-10 or null if not in categories>,
    "performance": <1-10 or null>,
    "ux": <1-10 or null>,
    "seo": <1-10 or null>,
    "code": <1-10 or null>,
    "accessibility": <1-10 or null>,
    "agent-readiness": <1-10 or null>,
    "robots": <1-10 or null>,
    "mcp": <1-10 or null>,
    "api-discovery": <1-10 or null>,
    "bot-auth": <1-10 or null>
  },
  "roasts": [
    {
      "category": "<category name>",
      "emoji": "<relevant emoji>",
      "critique": "<2-4 sentences. Lead with the actual problem, not a preamble. Be specific. End with one concrete thing to fix — not vague advice like 'improve your UX', but something real like 'your CTA button is below the fold on mobile and nobody's going to scroll for it'.>"
    }
  ]
}

Include one roast object per requested category. Each critique should feel like it came from a person, not a report generator.`;
  }

  const agentCategories = ["agent-readiness", "robots", "mcp", "api-discovery", "bot-auth"];
  const hasAgentChecks = categories.some((c) => agentCategories.includes(c));
  let agentData = "";

  if (hasAgentChecks) {
    console.log("[buildPrompt] Running agent readiness checks...");
    const checks = await checkAgentReadiness(url);
    agentData = `\n\n### Agent Readiness Check Results:\n${JSON.stringify(checks, null, 2)}\n\nUse this data to inform your roasts for agent-readiness related categories.`;
  }

  const categoriesStr = categories.length > 0 ? categories.join(", ") : "design, performance, ux, seo, code, accessibility";
  const modified = basePrompt
    .replace("https://vicedominisoftworks.com/en", url)
    .replace(/these categories: design, performance, ux, seo, code, accessibility/, `these categories: ${categoriesStr}`)
    + agentData;

  console.log("[buildPrompt] Final prompt length:", modified.length);
  return modified;
}