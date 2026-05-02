export const prerender = false;

import type { APIRoute } from "astro";
import { readFileSync } from "node:fs";
import { join } from "node:path";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { url, categories } = body;

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const prompt = await buildPrompt(url, categories);

    const apiBase = import.meta.env.OPENAI_API_BASE || "http://localhost:11434/v1";
    const apiKey = import.meta.env.OPENAI_API_KEY || "dummy";
    const model = import.meta.env.OPENAI_MODEL || "llama3";

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

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(
        JSON.stringify({ error: `AI API error: ${errorText}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON response from AI", raw: content }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};

async function fetchUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Agent-Readiness-Checker" } });
    if (res.ok) return await res.text();
    return null;
  } catch {
    return null;
  }
}

async function checkAgentReadiness(baseUrl: string) {
  const results: Record<string, { status: string; detail: string }> = {};
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;

  const checks = [
    { key: "robots", url: `${origin}/robots.txt`, label: "robots.txt" },
    { key: "sitemap", url: `${origin}/sitemap.xml`, label: "sitemap.xml" },
    { key: "llms", url: `${origin}/llms.txt`, label: "llms.txt" },
    { key: "mcp", url: `${origin}/.well-known/mcp`, label: "MCP well-known" },
    { key: "oauth", url: `${origin}/.well-known/oauth-authorization-server`, label: "OAuth discovery" },
    { key: "agent-card", url: `${origin}/.well-known/agent.json`, label: "Agent Card" },
    { key: "a2a", url: `${origin}/.well-known/a2a.json`, label: "A2A Agent Card" },
  ];

  for (const check of checks) {
    const content = await fetchUrl(check.url);
    results[check.key] = content
      ? { status: "found", detail: `${check.label} exists (${content.length} chars)` }
      : { status: "not found", detail: `${check.label} not found at ${check.url}` };
  }

  const headersToCheck = ["link", "x-robots-tag", "content-type"];
  try {
    const res = await fetch(baseUrl, { headers: { "User-Agent": "Mozilla/5.0 Agent-Readiness-Checker" } });
    const headers: string[] = [];
    for (const h of headersToCheck) {
      const val = res.headers.get(h);
      if (val) headers.push(`${h}: ${val}`);
    }
    results["headers"] = headers.length > 0
      ? { status: "found", detail: headers.join("; ") }
      : { status: "not found", detail: "No relevant headers found" };
  } catch {
    results["headers"] = { status: "error", detail: "Could not fetch homepage" };
  }

  return results;
}

async function buildPrompt(url: string, categories: string[]): Promise<string> {
  const promptPath = join(process.cwd(), "prompt.md");
  let basePrompt = "";

  try {
    basePrompt = readFileSync(promptPath, "utf-8");
  } catch {
    basePrompt = `You're a senior developer who's been building websites for 15 years. A colleague just showed you their site ({{URL}}) and asked for honest feedback. You're a good friend — you're not going to trash them — but you're also not going to lie to them. You talk like a real person: short sentences, a dry sense of humor, occasional sarcasm, no corporate fluff.

Roast this website across these categories: {{CATEGORIES}}.

Write like you're talking to a developer friend over Slack. Skip buzzwords like "leverage", "comprehensive", "robust", "actionable", "seamlessly", "it's worth noting". Don't say things like "Overall, this website..." or "In terms of accessibility...". Just get to the point. Use specific observations. Be direct. You can be funny but the goal is genuinely useful feedback, not just dunking on them.

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
    const checks = await checkAgentReadiness(url);
    agentData = `\n\n### Agent Readiness Check Results:\n${JSON.stringify(checks, null, 2)}\n\nUse this data to inform your roasts for agent-readiness related categories.`;
  }

  const categoriesStr = categories.length > 0 ? categories.join(", ") : "design, performance, ux, seo, code, accessibility";
  const modified = basePrompt
    .replace("https://vicedominisoftworks.com/en", url)
    .replace(/these categories: design, performance, ux, seo, code, accessibility/, `these categories: ${categoriesStr}`)
    + agentData;

  return modified;
}