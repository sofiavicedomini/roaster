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
      const { url, categories, locale = "en", turnstileToken } = body;
    const safeLocale = locales.includes(locale as Locale) ? locale as Locale : "en" as Locale;
    t = getTranslations(safeLocale);

      if (!url) {
        return new Response(JSON.stringify({ error: t.errors.urlRequired }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        });
      }

      // Verify Turnstile token if configured
      const turnstileSecret = import.meta.env.TURNSTILE_SECRET_KEY;
      if (turnstileSecret && turnstileToken) {
        const turnstileResponse = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            secret: turnstileSecret,
            response: turnstileToken,
            remoteip: request.headers.get("x-forwarded-for") || "",
          }),
        });

        const turnstileData = await turnstileResponse.json() as { success: boolean; "error-codes"?: string[] };
        if (!turnstileData.success) {
          const errorCodes = turnstileData["error-codes"] || [];
          console.warn("[Roast API] Turnstile verification failed:", turnstileData);

          let errorMsg = "CAPTCHA verification failed";
          if (errorCodes.includes("timeout-or-duplicate") || errorCodes.includes("invalid-input-response")) {
            errorMsg = "Il captcha è scaduto. Riprova.";
          }

          return new Response(JSON.stringify({ error: errorMsg }), {
            status: 403,
            headers: { "Content-Type": "application/json" },
          });
        }
        console.log("[Roast API] Turnstile verification passed");
      } else if (turnstileSecret && !turnstileToken) {
        return new Response(JSON.stringify({ error: "CAPTCHA token required" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }

    const prompt = await buildPrompt(url, categories, safeLocale);

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
    if (content) {
      const snippet = content.length > 300 
        ? content.substring(0, 297) + "..." 
        : content;
      results[check.key] = { 
        status: "found", 
        detail: `${check.label} found (${content.length} chars). Content: ${snippet.replace(/\n/g, ' ')}`, 
        score: check.score 
      };
      totalScore += check.score;
    } else {
      results[check.key] = { 
        status: "not found", 
        detail: `${check.label} not found at ${check.url}`, 
        score: 0 
      };
    }
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

async function buildPrompt(url: string, categories: string[], locale: string = "it"): Promise<string> {
  console.log("[buildPrompt] Building prompt for:", { url, categories, locale });
  const promptPath = join(process.cwd(), "prompt.md");
  let basePrompt = "";

  try {
    basePrompt = readFileSync(promptPath, "utf-8");
  } catch {
    console.warn("[buildPrompt] prompt.md not found, using default prompt");
    basePrompt = `You're a senior developer who's been building websites for 15 years. A colleague just showed you their site ({{URL}}) and asked for honest feedback. You're a good friend — you're not going to trash them — but you're also not going to lie to them. You talk like a real person: short sentences, a dry sense of humor, occasional sarcasm, no corporate fluff.`;
  }

  // Add language instruction
  const langName = locale === "it" ? "Italian" : locale === "en" ? "English" : locale.toUpperCase();
  const languageInstruction = `\n\nCRITICAL: The user is browsing the interface in ${locale.toUpperCase()} (${langName}). Respond ENTIRELY in ${langName}, using natural, colloquial tone appropriate for speakers of that language. Match the cultural style and directness expected in that language.`;

  basePrompt = basePrompt.trim() + languageInstruction + "\n\n";

  // Run agent checks if relevant categories are selected
  const agentCategories = ["agentReadiness", "robots", "mcp", "apiDiscovery", "botAuth"];
  const hasAgentChecks = categories.some((c) => agentCategories.includes(c));

  if (hasAgentChecks) {
    console.log("[buildPrompt] Running real MCP/Agent scraping checks...");
    const checks = await checkAgentReadiness(url);
    basePrompt = basePrompt.replace(
      "{{AGENT_DATA}}", 
      `### REAL AGENT READINESS CHECK RESULTS (MCP scraping completed):\n${JSON.stringify(checks, null, 2)}\n\n`
    );
  } else {
    basePrompt = basePrompt.replace("{{AGENT_DATA}}", "");
  }

  const categoriesStr = categories.length > 0 ? categories.join(", ") : "design, performance, ux, seo, code, accessibility";
  const modified = basePrompt
    .replace("https://vicedominisoftworks.com/en", url)
    .replace(/these categories: design, performance, ux, seo, code, accessibility/, `these categories: ${categoriesStr}`);

  console.log("[buildPrompt] Final prompt length:", modified.length);
  return modified;
}
