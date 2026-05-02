export const prerender = false;

import type { APIRoute } from "astro";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getTranslations, type Locale } from "@/i18n/utils";
import {
  jobDb,
  normalizeUrl,
  cacheKey,
  getCached,
  setCached,
  jobIdKey,
  getJobId,
  setJobId,
  createJob,
  updateJob,
  getJob,
  generateJobId,
  resumeJob,
  incrementIteration,
} from "@/lib/redis";

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

    const normUrl = normalizeUrl(url);
    const cats = Array.isArray(categories) ? [...categories].sort() : [];
    const catsKey = cats.join(",");

    // Check cache
    const cached = await getCached(normUrl);
    if (cached) {
      const hasAllCats = cats.every((c) => cached.cats.includes(c));

      if (hasAllCats && cached.lang === safeLocale) {
        const stripped = stripCats(cached.result, cats);
        return new Response(
          JSON.stringify({ ...stripped, cached: true, cachedAt: cached.cachedAt, cacheKey: cacheKey(normUrl) }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }

      if (!hasAllCats && cached.lang === safeLocale) {
        const mergedCats = [...new Set([...cached.cats, ...cats])].sort();
        const jobId = generateJobId();
        await setJobId(normUrl, safeLocale, jobId);
        await createJob(jobId, {
          status: "pending",
          progress: "Starting with merged categories",
          normUrl,
          locale: safeLocale,
          cats: mergedCats.join(","),
        });
        processRoast(jobId, url, mergedCats, safeLocale).catch((e) => {
          console.error("[Roast BG] Error:", e);
          updateJob(jobId, { status: "failed", error: e instanceof Error ? e.message : "Unknown error" }).catch(() => {});
        });
        return new Response(JSON.stringify({ jobId, status: "pending", cached: false }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }

      if (cached.lang !== safeLocale) {
        const trans = cached.translations?.[safeLocale];
        if (trans) {
          const stripped = stripCats(trans.result, cats);
          return new Response(
            JSON.stringify({ ...stripped, cached: true, cachedAt: trans.translatedAt, translated: true, cacheKey: cacheKey(normUrl) }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          );
        }
        const jobId = generateJobId();
        await setJobId(normUrl, safeLocale, jobId);
        await createJob(jobId, {
          status: "pending",
          progress: "Translating",
          normUrl,
          locale: safeLocale,
          cats: catsKey,
        });
        translateRoast(jobId, cached, safeLocale).catch((e) => {
          console.error("[Translate BG] Error:", e);
          updateJob(jobId, { status: "failed", error: e instanceof Error ? e.message : "Unknown error" }).catch(() => {});
        });
        return new Response(JSON.stringify({ jobId, status: "pending", cached: false }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // No cache - check dedup
    const existingJobId = await getJobId(normUrl, safeLocale);
    if (existingJobId) {
      const job = await getJob(existingJobId);
      if (job && job.status === "completed") {
        const hasAllCats = cats.every((c) => job.cats?.split(",").includes(c));
        if (hasAllCats) {
          return new Response(JSON.stringify({ jobId: existingJobId, status: job.status, cached: false }), {
            status: 202,
            headers: { "Content-Type": "application/json" },
          });
        }
      }
      
      if (job && ["pending", "processing"].includes(job.status)) {
        const { shouldResume } = await resumeJob(existingJobId, cats);
        
        if (shouldResume) {
          console.log(`[Roast API] Resuming stuck job ${existingJobId}`);
          await setJobId(normUrl, safeLocale, existingJobId);
          processRoast(existingJobId, url, cats, safeLocale, true).catch((e) => {
            console.error("[Roast BG] Resume error:", e);
            updateJob(existingJobId, { status: "failed", error: e instanceof Error ? e.message : "Unknown error" }).catch(() => {});
          });
          return new Response(JSON.stringify({ jobId: existingJobId, status: "resuming", cached: false }), {
            status: 202,
            headers: { "Content-Type": "application/json" },
          });
        }
        
        return new Response(JSON.stringify({ jobId: existingJobId, status: job.status, cached: false }), {
          status: 202,
          headers: { "Content-Type": "application/json" },
        });
      }
    }

    // New job
    const jobId = generateJobId();
    await setJobId(normUrl, safeLocale, jobId);
    await createJob(jobId, {
      status: "pending",
      progress: "Starting",
      normUrl,
      locale: safeLocale,
      cats: catsKey,
    });

    processRoast(jobId, url, cats, safeLocale).catch((e) => {
      console.error("[Roast BG] Error:", e);
      updateJob(jobId, { status: "failed", error: e instanceof Error ? e.message : "Unknown error" }).catch(() => {});
    });

    return new Response(JSON.stringify({ jobId, status: "pending", cached: false }), {
      status: 202,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[Roast API] Unhandled error:", err);
    const errorMsg = t ? t.errors.unknown : "Unknown error";
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : errorMsg }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const jobId = url.searchParams.get("jobId");
  if (!jobId) {
    return new Response(JSON.stringify({ error: "jobId required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  const job = await getJob(jobId);
  if (!job) {
    return new Response(JSON.stringify({ error: "Job not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  return new Response(
    JSON.stringify({
      status: job.status,
      progress: job.progress || "",
      result: job.result ? JSON.parse(job.result) : null,
      error: job.error || null,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
};

function stripCats(result: Record<string, unknown>, cats: string[]): Record<string, unknown> {
  const r = { ...result };
  if (Array.isArray(r.roasts)) {
    r.roasts = (r.roasts as Array<Record<string, unknown>>).filter((roast) => cats.includes(roast.category as string));
  }
  if (r.scores && typeof r.scores === "object") {
    const s = { ...(r.scores as Record<string, number>) };
    for (const k of Object.keys(s)) {
      if (!cats.includes(k)) delete s[k];
    }
    r.scores = s;
  }
  return r;
}

async function processRoast(
  jobId: string,
  url: string,
  cats: string[],
  locale: string,
  isResume = false,
) {
  if (isResume) {
    await updateJob(jobId, { status: "processing", progress: "Resuming agent loop" });
    await incrementIteration(jobId);
  } else {
    await updateJob(jobId, { status: "processing", progress: "Initial checks" });
  }

  const checks = await checkAgentReadiness(url);
  await updateJob(jobId, { progress: "Building prompt" });

  const prompt = await buildPrompt(url, cats, locale, checks);
  await updateJob(jobId, { progress: "Calling LLM" });

  const apiBase = import.meta.env.OPENAI_API_BASE || "http://localhost:11434/v1";
  const apiKey = import.meta.env.OPENAI_API_KEY || "dummy";
  const model = import.meta.env.OPENAI_MODEL || "llama3";

  const result = await runAgentLoop(prompt, url, cats, checks, apiBase, apiKey, model, async (iter, action) => {
    await updateJob(jobId, { progress: `Iteration ${iter}/6: ${action}` });
    await incrementIteration(jobId);
  }, isResume);

  const normUrl = normalizeUrl(url);
  const cachedAt = new Date().toISOString();
  const cacheData = {
    site: normUrl,
    cats,
    lang: locale,
    result,
    cachedAt,
    cacheKey: cacheKey(normUrl),
    translations: { [locale]: { result, translatedAt: cachedAt } as { result: Record<string, unknown>; translatedAt: string } } as Record<string, { result: Record<string, unknown>; translatedAt: string }>,
  };
  await setCached(normUrl, cacheData);

  await updateJob(jobId, {
    status: "completed",
    progress: "Done",
    result: JSON.stringify({ ...result, cached: false, cacheKey: cacheKey(normUrl) }),
  });

    await jobDb.del(jobIdKey(normUrl, locale));
}

async function translateRoast(jobId: string, cached: Record<string, unknown>, locale: string) {
  await updateJob(jobId, { status: "processing", progress: "Translating" });

  const apiBase = import.meta.env.OPENAI_API_BASE || "http://localhost:11434/v1";
  const apiKey = import.meta.env.OPENAI_API_KEY || "dummy";
  const model = import.meta.env.OPENAI_MODEL || "llama3";

  const langName = locale === "it" ? "Italian" : locale === "en" ? "English" : locale.toUpperCase();
  const transPrompt = `Translate this roast result to ${langName}. Keep JSON structure identical. Roast: ${JSON.stringify(cached.result)}`;

  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      messages: [{ role: "system", content: transPrompt }],
      temperature: 0.3,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error(`Translation LLM error: ${response.status}`);

  const data = await response.json();
  const translated = JSON.parse(data.choices?.[0]?.message?.content || "{}");

  const normUrl = normalizeUrl(cached.site as string);
  const cacheEntry = await getCached(normUrl);
  if (cacheEntry) {
    if (!cacheEntry.translations) cacheEntry.translations = {};
    cacheEntry.translations[locale] = { result: translated, translatedAt: new Date().toISOString() };
    await setCached(normUrl, cacheEntry);
  }

    await jobDb.del(jobIdKey(normUrl, locale));
}

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
      const snippet = content.length > 300 ? content.substring(0, 297) + "..." : content;
      results[check.key] = { status: "found", detail: `${check.label} found (${content.length} chars). Content: ${snippet.replace(/\n/g, " ")}`, score: check.score };
      totalScore += check.score;
    } else {
      results[check.key] = { status: "not found", detail: `${check.label} not found at ${check.url}`, score: 0 };
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

async function buildPrompt(url: string, categories: string[], locale: string, checks: Record<string, unknown>): Promise<string> {
  const promptPath = join(process.cwd(), "prompt.md");
  let basePrompt = "";
  try {
    basePrompt = readFileSync(promptPath, "utf-8");
  } catch {
    basePrompt = `You're an iterative ReAct agent for website roasting.`;
  }

  const langName = locale === "it" ? "Italian" : locale === "en" ? "English" : locale.toUpperCase();
  const languageInstruction = `CRITICAL: Respond ENTIRELY in ${langName}.`;

  const agentData = `### REAL AGENT READINESS CHECK RESULTS:\n${JSON.stringify(checks, null, 2)}`;

  const categoriesStr = categories.length > 0 ? categories.join(", ") : "design, performance, ux, seo, code, accessibility, agentReadiness";

  const modified = basePrompt
    .replace("{{AGENT_DATA}}", agentData)
    .replace("{{URL}}", url)
    .replace("{{CATEGORIES}}", categoriesStr)
    + languageInstruction
    + `\n\nCRITICAL: You MUST provide a roast for ALL of these categories: ${categoriesStr}. Do NOT skip any. If a category is not in ${categoriesStr}, do NOT include it.`;

  console.log("[buildPrompt] Agent prompt length:", modified.length);
  return modified;
}

async function callLLM(messages: Array<{role: string; content: string}>, apiBase: string, apiKey: string, model: string) {
  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.3, response_format: { type: "json_object" } }),
  });

  if (!response.ok) throw new Error(`LLM error: ${response.status}`);

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || "{}";
  return content;
}

type MessageRole = "system" | "user" | "assistant";

function validateFinalRoast(final_roast: unknown, categories: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!final_roast || typeof final_roast !== "object") {
    return { valid: false, errors: ["final_roast is not an object"] };
  }
  
  const roast = final_roast as Record<string, unknown>;
  
  if (typeof roast.overall_score !== "number") {
    errors.push("missing or invalid overall_score");
  } else if (roast.overall_score < 1 || roast.overall_score > 10) {
    errors.push("overall_score must be between 1 and 10");
  }
  
  if (typeof roast.verdict !== "string") {
    errors.push("missing or invalid verdict");
  }
  
  if (!roast.scores || typeof roast.scores !== "object") {
    errors.push("missing or invalid scores object");
  } else {
    const scores = roast.scores as Record<string, unknown>;
    for (const cat of categories) {
      if (!(cat in scores)) {
        errors.push(`missing score for category: ${cat}`);
      } else if (typeof scores[cat] !== "number" && scores[cat] !== null) {
        errors.push(`invalid score type for ${cat}`);
      }
    }
  }
  
  if (!Array.isArray(roast.roasts)) {
    errors.push("roasts must be an array");
  } else {
    const foundCategories = new Set<string>();
    for (const item of roast.roasts) {
      if (item && typeof item === "object" && "category" in item) {
        foundCategories.add(item.category as string);
      }
    }
    for (const cat of categories) {
      if (!foundCategories.has(cat)) {
        errors.push(`missing roast for category: ${cat}`);
      }
    }
    if (roast.roasts.length === 0) {
      errors.push("roasts array is empty");
    }
  }
  
  return { valid: errors.length === 0, errors };
}

async function runAgentLoop(
  systemPrompt: string,
  url: string,
  categories: string[],
  _initialChecks: Record<string, unknown>,
  apiBase: string,
  apiKey: string,
  model: string,
  onProgress?: (iter: number, action: string) => void,
  isResume = false,
) {
  const messages: Array<{role: MessageRole; content: string}> = [{ role: "system", content: systemPrompt }];
  let iteration = 0;
  const maxIterations = isResume ? 3 : 6;
  let currentObservation = isResume 
    ? `Resuming analysis for ${url}. Previous iterations may have been stuck. Focus on completing ALL categories: ${categories.join(", ")}.`
    : `Initial data loaded with real checks for ${url}. Begin iterative analysis focusing on thorough scraping for agentReadiness.`;

  while (iteration < maxIterations) {
    iteration++;
    console.log(`[Roast API] Agent iteration ${iteration}/${maxIterations}`);
      if (onProgress) onProgress(iteration, "thinking");

    messages.push({ role: "user", content: currentObservation });

    let content;
    try {
      content = await callLLM(messages, apiBase, apiKey, model);
    } catch (e) {
      console.error("[Roast API] LLM call failed:", e);
      currentObservation = "LLM call failed. Try OUTPUT_FINAL with available data.";
      continue;
    }

    let agentOutput;
    try {
      agentOutput = JSON.parse(content.trim());
      console.log("[Roast API] Agent action:", agentOutput.action, "thought:", agentOutput.thought?.substring(0, 60));
       if (onProgress) onProgress(iteration, agentOutput.action || "unknown");
    } catch {
      console.error("[Roast API] JSON parse failed:", content.substring(0, 100));
      currentObservation = "Output was not valid JSON. Must output exact JSON with thought, action, action_input, final_roast fields. Try again.";
      messages.push({ role: "assistant", content: content });
      continue;
    }

    messages.push({ role: "assistant", content: JSON.stringify(agentOutput) });

    const { action, action_input, final_roast } = agentOutput;

    if (action === "OUTPUT_FINAL" && final_roast) {
      const validation = validateFinalRoast(final_roast, categories);
      if (validation.valid) {
        console.log("[Roast API] Agent completed with valid final roast");
        return final_roast;
      } else {
        console.log("[Roast API] Validation failed:", validation.errors);
        currentObservation = `VALIDATION FAILED: ${validation.errors.join("; ")}. You MUST include a complete roast for ALL categories: ${categories.join(", ")}. Regenerate with complete data.`;
      }
    }

    if (action === "SCRAPE" && action_input && typeof action_input === "string") {
      let scrapeUrl = action_input;
      try {
        if (!scrapeUrl.startsWith("http")) {
          const baseUrl = new URL(url);
          scrapeUrl = new URL(scrapeUrl, baseUrl.origin).toString();
        }
        const scrapedContent = await fetchUrl(scrapeUrl);
        if (scrapedContent) {
          const snippet = scrapedContent.length > 400 ? scrapedContent.substring(0, 397) + "..." : scrapedContent;
          currentObservation = `SCRAPE(${scrapeUrl}) succeeded. Content snippet: ${snippet.replace(/\n/g, " ")}. Use this real data for agentReadiness analysis. Continue.`;
          console.log(`[Roast API] Scraped ${scrapeUrl} successfully (${scrapedContent.length} chars)`);
        } else {
          currentObservation = `SCRAPE(${scrapeUrl}) failed or returned no content. Note this and ANALYZE or OUTPUT_FINAL.`;
        }
      } catch (scrapeErr) {
        currentObservation = `SCRAPE failed for ${scrapeUrl}: ${scrapeErr}. Do not retry same URL.`;
      }
    } else if (action === "ANALYZE" && action_input) {
      currentObservation = `ANALYSIS on ${action_input} requested. Use all scraped real content and initial checks. Be specific about discovered files and links. Provide deep critique based on facts only.`;
    } else {
      currentObservation = `Unknown action "${action}". Valid actions: SCRAPE (with URL from discovered files), ANALYZE (category), OUTPUT_FINAL. Focus on thorough real scraping for agent readiness category.`;
    }
  }

  console.log("[Roast API] Max iterations reached, forcing final output");
  const finalMessages = [...messages, { role: "user" as MessageRole, content: `Max iterations reached. Output FINAL roast JSON now using all gathered real data. CRITICAL: Must include ALL categories: ${categories.join(", ")}. Do not hallucinate.` }];
  try {
    const finalContent = await callLLM(finalMessages, apiBase, apiKey, model);
    const finalOutput = JSON.parse(finalContent.trim());
    if (finalOutput.final_roast) {
      const validation = validateFinalRoast(finalOutput.final_roast, categories);
      if (validation.valid) {
        return finalOutput.final_roast;
      }
      console.log("[Roast API] Final validation failed, using fallback:", validation.errors);
    } else if (finalOutput.overall_score) {
      const validation = validateFinalRoast(finalOutput, categories);
      if (validation.valid) {
        return finalOutput;
      }
      console.log("[Roast API] Final validation failed, using fallback:", validation.errors);
    }
    return {
      overall_score: 5,
      verdict: "Agent loop completed but final parsing failed. Site has basic readiness.",
      scores: categories.reduce((acc: Record<string, number>, cat: string) => { acc[cat] = 5; return acc; }, {} as Record<string, number>),
      roasts: categories.map((cat, idx) => ({
        category: cat,
        emoji: ["🎨", "⚡", "🔍", "📱", "♿", "🤖"][idx % 6] || "📝",
        critique: `Complete analysis for ${cat} category. Real agent checks were performed but output validation failed.`,
        fix_prompt: `Fix ${cat} issues for ${url}. Implement thorough analysis based on real scraped data.`
      })),
    };
  } catch (e) {
    console.error("[Roast API] Final call failed:", e);
    return {
      overall_score: 5,
      verdict: "Agent loop completed but final parsing failed. Site has basic readiness.",
      scores: categories.reduce((acc: Record<string, number>, cat: string) => { acc[cat] = 5; return acc; }, {} as Record<string, number>),
      roasts: categories.map((cat, idx) => ({
        category: cat,
        emoji: ["🎨", "⚡", "🔍", "📱", "♿", "🤖"][idx % 6] || "📝",
        critique: `Complete analysis for ${cat} category. Real agent checks were performed but output validation failed.`,
        fix_prompt: `Fix ${cat} issues for ${url}. Implement thorough analysis based on real scraped data.`
      })),
    };
  }
}
