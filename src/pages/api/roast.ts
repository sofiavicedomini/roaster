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
  saveRanking,
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

function isSiteDown(checks: Record<string, unknown>): boolean {
  const homepageError = (checks.headers as Record<string, string>)?.status === "error";
  if (!homepageError) return false;
  // Consider it down if the homepage also returned an error AND at least 80% of checks failed
  const entries = Object.entries(checks).filter(([k]) => k !== "_summary");
  const failed = entries.filter(([, v]) => (v as Record<string, string>).status !== "found").length;
  return failed >= Math.floor(entries.length * 0.8);
}

const SKYNET_VERDICTS: Record<string, string> = {
  en: "This site is so inaccessible even our Skynet agents couldn't get in. Zero stars, would not index.",
  it: "Questo sito è così inaccessibile che persino i nostri agenti di Skynet non sono riusciti ad entrare. Zero stelle, non lo indicizzeremmo mai.",
  fr: "Ce site est tellement inaccessible que même nos agents Skynet n'ont pas pu y entrer. Zéro étoile, nous ne l'indexerions jamais.",
  es: "Este sitio es tan inaccesible que incluso nuestros agentes de Skynet no pudieron entrar. Cero estrellas, no lo indexaríamos jamás.",
  pt: "Este site é tão inacessível que até nossos agentes Skynet não conseguiram entrar. Zero estrelas, nunca o indexaríamos.",
  de: "Diese Website ist so unzugänglich, dass selbst unsere Skynet-Agenten keinen Zugang fanden. Null Sterne, würden wir niemals indexieren.",
  nl: "Deze site is zo ontoegankelijk dat zelfs onze Skynet-agenten er niet in konden. Nul sterren, we zouden hem nooit indexeren.",
  ru: "Этот сайт настолько недоступен, что даже наши агенты Skynet не смогли войти. Ноль звёзд, никогда не индексировали бы.",
  et: "See sait on nii ligipääsmatu, et isegi meie Skyneti agendid ei pääsenud sisse. Null tärni, me ei indekseeriks seda kunagi.",
};

const SKYNET_CRITIQUES: Record<string, (cat: string, url: string) => string> = {
  en: (cat, url) => `${url} refused every single request our agents made. For ${cat}, the experience is simply non-existent — you can't evaluate what you can't reach. This is a catastrophic failure for any agent, human or otherwise.`,
  it: (cat, url) => `${url} ha rifiutato ogni singola richiesta dei nostri agenti. Per ${cat}, l'esperienza è semplicemente inesistente — non si può valutare ciò che non è raggiungibile. Un fallimento catastrofico per qualsiasi agente, umano o meno.`,
  fr: (cat, url) => `${url} a rejeté chaque requête de nos agents. Pour ${cat}, l'expérience est tout simplement inexistante — on ne peut pas évaluer ce qu'on ne peut pas atteindre. Un échec catastrophique pour tout agent.`,
  es: (cat, url) => `${url} rechazó cada solicitud de nuestros agentes. Para ${cat}, la experiencia es simplemente inexistente — no se puede evaluar lo que no se puede alcanzar. Un fallo catastrófico para cualquier agente.`,
  pt: (cat, url) => `${url} rejeitou todas as solicitações dos nossos agentes. Para ${cat}, a experiência é simplesmente inexistente — não se pode avaliar o que não pode ser alcançado. Uma falha catastrófica para qualquer agente.`,
  de: (cat, url) => `${url} hat jede Anfrage unserer Agenten abgelehnt. Für ${cat} existiert die Erfahrung schlicht nicht — man kann nicht bewerten, was man nicht erreichen kann. Ein katastrophales Versagen für jeden Agenten.`,
  nl: (cat, url) => `${url} weigerde elk verzoek van onze agenten. Voor ${cat} bestaat de ervaring simpelweg niet — je kunt niet beoordelen wat je niet kunt bereiken. Een catastrofale mislukking voor elke agent.`,
  ru: (cat, url) => `${url} отклонил каждый запрос наших агентов. Для ${cat} опыт попросту отсутствует — нельзя оценить то, до чего нельзя добраться. Катастрофический провал для любого агента.`,
  et: (cat, url) => `${url} lükkas tagasi kõik meie agentide päringud. ${cat} jaoks pole kogemust lihtsalt olemas — ei saa hinnata seda, mida ei saa kätte. Katastroofiline ebaõnnestumine iga agendi jaoks.`,
};

const SKYNET_FIX_PROMPTS: Record<string, (cat: string, url: string) => string> = {
  en: (cat, url) => `Fix the fundamental accessibility of ${url} before worrying about ${cat}. Start by checking: DNS resolution, SSL certificate validity, server uptime, firewall rules blocking automated agents (check User-Agent restrictions in robots.txt), and rate limiting. The site must respond with HTTP 200 to basic GET requests before any other fix matters.`,
  it: (cat, url) => `Risolvi l'accessibilità di base di ${url} prima di preoccuparti di ${cat}. Controlla: risoluzione DNS, validità del certificato SSL, uptime del server, regole firewall che bloccano gli agenti automatizzati (controlla le restrizioni User-Agent in robots.txt) e rate limiting. Il sito deve rispondere con HTTP 200 alle richieste GET di base prima che qualsiasi altra correzione abbia senso.`,
  fr: (cat, url) => `Corrigez d'abord l'accessibilité fondamentale de ${url} avant de vous soucier de ${cat}. Vérifiez : résolution DNS, validité du certificat SSL, disponibilité du serveur, règles de pare-feu bloquant les agents automatisés et limitation de débit. Le site doit répondre HTTP 200 aux requêtes GET basiques.`,
  es: (cat, url) => `Arregla la accesibilidad fundamental de ${url} antes de preocuparte por ${cat}. Revisa: resolución DNS, validez del certificado SSL, uptime del servidor, reglas de firewall que bloquean agentes automatizados y rate limiting. El sitio debe responder HTTP 200 a peticiones GET básicas.`,
  pt: (cat, url) => `Corrija a acessibilidade fundamental de ${url} antes de se preocupar com ${cat}. Verifique: resolução DNS, validade do certificado SSL, uptime do servidor, regras de firewall bloqueando agentes automatizados e rate limiting. O site deve responder HTTP 200 a requisições GET básicas.`,
  de: (cat, url) => `Behebe zuerst die grundlegende Erreichbarkeit von ${url}, bevor du dich um ${cat} kümmerst. Prüfe: DNS-Auflösung, SSL-Zertifikat, Server-Uptime, Firewall-Regeln die automatische Agenten blockieren und Rate Limiting. Die Website muss HTTP 200 auf einfache GET-Anfragen zurückgeben.`,
  nl: (cat, url) => `Los eerst de fundamentele toegankelijkheid van ${url} op voordat je je zorgen maakt over ${cat}. Controleer: DNS-resolutie, SSL-certificaat, server-uptime, firewallregels die geautomatiseerde agents blokkeren en rate limiting. De site moet HTTP 200 teruggeven op basisverzoeken.`,
  ru: (cat, url) => `Исправьте базовую доступность ${url} прежде чем беспокоиться о ${cat}. Проверьте: DNS-резолвинг, SSL-сертификат, аптайм сервера, правила брандмауэра, блокирующие автоматических агентов, и rate limiting. Сайт должен отвечать HTTP 200 на базовые GET-запросы.`,
  et: (cat, url) => `Paranda esmalt ${url} põhiline ligipääsetavus enne kui muretsed ${cat} pärast. Kontrolli: DNS-lahendust, SSL-sertifikaati, serveri tööaega, tulemüüri reegleid, mis blokeerivad automaatseid agente, ja rate limitingut. Sait peab vastama HTTP 200-ga lihtsatele GET-päringutele.`,
};

function generateInaccessibleRoast(url: string, categories: string[], locale: string): Record<string, unknown> {
  const lang = locale in SKYNET_VERDICTS ? locale : "en";
  const EMOJIS = ["💀", "🚫", "🔒", "⛔", "📵", "🕳️", "❌", "🧱", "📴", "🔇"];

  return {
    overall_score: 1,
    verdict: SKYNET_VERDICTS[lang],
    scores: Object.fromEntries(categories.map((cat) => [cat, 1])),
    roasts: categories.map((cat, i) => ({
      category: cat,
      emoji: EMOJIS[i % EMOJIS.length],
      critique: SKYNET_CRITIQUES[lang]?.(cat, url) ?? SKYNET_CRITIQUES.en(cat, url),
      fix_prompt: SKYNET_FIX_PROMPTS[lang]?.(cat, url) ?? SKYNET_FIX_PROMPTS.en(cat, url),
    })),
  };
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

  // If the site is completely unreachable, skip the LLM loop and roast it for that
  const siteDown = isSiteDown(checks);
  if (siteDown) {
    console.log("[Roast API] Site appears unreachable, generating inaccessibility roast");
    await updateJob(jobId, { progress: "Site unreachable — generating roast" });
    const result = generateInaccessibleRoast(url, cats, locale);
    const normUrl = normalizeUrl(url);
    const cachedAt = new Date().toISOString();
    await saveRanking(jobId, { url, normUrl, score: (result as any).overall_score, verdict: (result as any).verdict, cats, locale, completedAt: cachedAt, result: result as Record<string, unknown> }).catch(() => {});
    await updateJob(jobId, { status: "completed", progress: "Done", result: JSON.stringify({ ...result, cached: false, cacheKey: cacheKey(normUrl), rankingId: jobId }) });
    await jobDb.del(jobIdKey(normUrl, locale));
    return;
  }

  const prompt = await buildPrompt(url, cats, locale, checks);
  await updateJob(jobId, { progress: "Calling LLM" });

  const apiBase = import.meta.env.OPENAI_API_BASE || "http://localhost:11434/v1";
  const apiKey = import.meta.env.OPENAI_API_KEY || "dummy";
  const model = import.meta.env.OPENAI_MODEL || "llama3";

  const result = await runAgentLoop(prompt, url, cats, checks, apiBase, apiKey, model, locale, async (_iter, thinking) => {
    await updateJob(jobId, { progress: thinking });
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
    result: JSON.stringify({ ...result, cached: false, cacheKey: cacheKey(normUrl), rankingId: jobId }),
  });

  saveRanking(jobId, {
    url,
    normUrl,
    score: (result as Record<string, unknown>).overall_score as number,
    verdict: (result as Record<string, unknown>).verdict as string,
    cats,
    locale,
    completedAt: cachedAt,
    result: result as Record<string, unknown>,
  }).catch((e) => console.warn("[Rankings] Failed to save:", e));

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

function parseMcpStructure(parsed: Record<string, unknown>): string {
  const parts: string[] = [];
  // Claude Desktop / standard MCP: { mcpServers: { name: { url, type } } }
  if (parsed.mcpServers && typeof parsed.mcpServers === "object") {
    const servers = Object.entries(parsed.mcpServers as Record<string, unknown>);
    parts.push(`mcpServers[${servers.length}]`);
    for (const [name, cfg] of servers.slice(0, 3)) {
      const c = cfg as Record<string, unknown>;
      parts.push(`"${name}":{url=${c.url ?? "none"},type=${c.type ?? "?"},auth=${c.auth ? "yes" : "none"}}`);
    }
  }
  // HTTP endpoints: { endpoints: [{ url, transport }] }
  if (parsed.endpoints && Array.isArray(parsed.endpoints)) {
    parts.push(`endpoints[${parsed.endpoints.length}]`);
    for (const ep of (parsed.endpoints as Record<string, unknown>[]).slice(0, 2)) {
      parts.push(`{url=${ep.url ?? "none"},transport=${ep.transport ?? ep.type ?? "?"}}`);
    }
  }
  if (parsed.servers && Array.isArray(parsed.servers)) parts.push(`servers[${parsed.servers.length}]`);
  if (parts.length === 0) parts.push(`unrecognized structure, keys: ${Object.keys(parsed).slice(0, 5).join(",")}`);
  return parts.join("; ");
}

function extractMcpEndpoint(parsed: Record<string, unknown>): string | null {
  if (parsed.mcpServers && typeof parsed.mcpServers === "object") {
    const first = Object.values(parsed.mcpServers as Record<string, unknown>)[0] as Record<string, unknown> | undefined;
    if (typeof first?.url === "string") return first.url;
  }
  if (parsed.endpoints && Array.isArray(parsed.endpoints)) {
    const first = (parsed.endpoints as Record<string, unknown>[])[0];
    if (typeof first?.url === "string") return first.url;
  }
  return null;
}

function parseAgentCardStructure(parsed: Record<string, unknown>): string {
  const parts: string[] = [];
  if (parsed.name) parts.push(`name="${parsed.name}"`);
  if (parsed.version) parts.push(`version=${parsed.version}`);
  if (parsed.description) parts.push(`description ✓`);
  if (Array.isArray(parsed.skills)) parts.push(`skills[${parsed.skills.length}]`);
  if (Array.isArray(parsed.endpoints)) {
    parts.push(`endpoints[${parsed.endpoints.length}]`);
    for (const ep of (parsed.endpoints as Record<string, unknown>[]).slice(0, 2)) {
      parts.push(`{url=${ep.url},protocol=${ep.protocol ?? "?"}}`);
    }
  }
  if (Array.isArray(parsed.capabilities)) parts.push(`capabilities[${parsed.capabilities.length}]`);
  if (parts.length === 0) parts.push(`keys: ${Object.keys(parsed).slice(0, 5).join(",")}`);
  return parts.join("; ");
}

function parseOAuthStructure(parsed: Record<string, unknown>): string {
  const parts: string[] = [];
  if (parsed.issuer) parts.push(`issuer=${parsed.issuer}`);
  if (parsed.authorization_endpoint) parts.push(`authorization_endpoint ✓`);
  if (parsed.token_endpoint) parts.push(`token_endpoint ✓`);
  if (parsed.registration_endpoint) parts.push(`dynamic_client_registration ✓`);
  if (Array.isArray(parsed.grant_types_supported)) parts.push(`grants: ${(parsed.grant_types_supported as string[]).join(",")}`);
  if (Array.isArray(parsed.scopes_supported)) parts.push(`scopes[${(parsed.scopes_supported as string[]).length}]`);
  if (parts.length === 0) parts.push(`keys: ${Object.keys(parsed).slice(0, 5).join(",")}`);
  return parts.join("; ");
}

async function checkAgentReadiness(baseUrl: string) {
  const results: Record<string, { status: string; detail: string; score: number }> = {};
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;

  const checks = [
    { key: "robots", url: `${origin}/robots.txt`, label: "robots.txt", score: 2, type: "text" },
    { key: "sitemap", url: `${origin}/sitemap.xml`, label: "sitemap.xml", score: 1, type: "text" },
    { key: "llms", url: `${origin}/llms.txt`, label: "llms.txt", score: 3, type: "text" },
    { key: "llmsfull", url: `${origin}/llms-full.txt`, label: "llms-full.txt", score: 1, type: "text" },
    { key: "mcp", url: `${origin}/.well-known/mcp`, label: "MCP well-known", score: 3, type: "json" },
    { key: "oauth", url: `${origin}/.well-known/oauth-authorization-server`, label: "OAuth discovery", score: 2, type: "json" },
    { key: "oauth-protected", url: `${origin}/.well-known/oauth-protected-resource`, label: "OAuth protected resource", score: 1, type: "json" },
    { key: "agent-card", url: `${origin}/.well-known/agent.json`, label: "Agent Card (A2A)", score: 2, type: "json" },
    { key: "a2a", url: `${origin}/.well-known/a2a.json`, label: "A2A manifest", score: 2, type: "json" },
    { key: "api-catalog", url: `${origin}/.well-known/api-catalog`, label: "API Catalog", score: 1, type: "json" },
    { key: "webmcp", url: `${origin}/.well-known/webmcp`, label: "WebMCP", score: 1, type: "json" },
    { key: "agentskills", url: `${origin}/.agentskills`, label: "Agent Skills", score: 1, type: "text" },
  ];

  let totalScore = 0;
  let maxScore = 0;

  for (const check of checks) {
    const content = await fetchUrl(check.url);
    if (content) {
      let detail = `${check.label} found (${content.length} chars)`;
      let score = check.score;

      if (check.type === "json") {
        try {
          const parsed = JSON.parse(content) as Record<string, unknown>;
          if (check.key === "mcp" || check.key === "webmcp") {
            const structure = parseMcpStructure(parsed);
            const endpoint = extractMcpEndpoint(parsed);
            if (endpoint) {
              const epReachable = await fetchUrl(endpoint);
              detail += `. Structure: ${structure}. Endpoint ${endpoint}: ${epReachable ? "REACHABLE ✓" : "NOT reachable ✗"}`;
              if (epReachable) score = Math.min(check.score + 1, 4);
            } else {
              detail += `. Structure: ${structure}`;
            }
          } else if (check.key === "agent-card" || check.key === "a2a") {
            detail += `. Structure: ${parseAgentCardStructure(parsed)}`;
          } else if (check.key === "oauth") {
            detail += `. Structure: ${parseOAuthStructure(parsed)}`;
          } else if (check.key === "api-catalog") {
            const hasApis = !!(parsed.apis || parsed.openapi || parsed.swagger || parsed.endpoints || parsed.links);
            detail += `. Valid JSON. Has API definitions: ${hasApis}. Keys: ${Object.keys(parsed).slice(0, 6).join(",")}`;
          } else {
            detail += `. Valid JSON. Keys: ${Object.keys(parsed).slice(0, 6).join(",")}`;
          }
        } catch {
          const snippet = content.length > 200 ? content.substring(0, 197) + "..." : content;
          detail += `. WARNING: invalid JSON. Raw content: ${snippet.replace(/\n/g, " ")}`;
          score = Math.floor(check.score / 2);
        }
      } else {
        const snippet = content.length > 400 ? content.substring(0, 397) + "..." : content;
        detail += `. Content: ${snippet.replace(/\n/g, " ")}`;
      }

      results[check.key] = { status: "found", detail, score };
      totalScore += score;
    } else {
      results[check.key] = { status: "not found", detail: `${check.label} not found at ${check.url}`, score: 0 };
    }
    maxScore += check.score;
  }

  const headersToCheck = ["link", "x-robots-tag", "content-type", "x-content-signals", "x-mcp-endpoint", "x-agent-card"];
  try {
    const res = await fetch(baseUrl, { headers: { "User-Agent": "Mozilla/5.0 Agent-Readiness-Checker" } });
    const headers: string[] = [];
    for (const h of headersToCheck) {
      const val = res.headers.get(h);
      if (val) headers.push(`${h}: ${val}`);
    }
    const linkHeader = res.headers.get("link");
    if (linkHeader && (linkHeader.includes("mcp") || linkHeader.includes("agent") || linkHeader.includes("llms"))) {
      headers.push(`[agent Link rel]: ${linkHeader}`);
    }
    results["headers"] = headers.length > 0
      ? { status: "found", detail: headers.join("; "), score: 1 }
      : { status: "not found", detail: "No agent-relevant HTTP headers found", score: 0 };
    if (headers.length > 0) totalScore += 1;
    maxScore += 1;
  } catch {
    results["headers"] = { status: "error", detail: "Could not fetch homepage", score: 0 };
    maxScore += 1;
  }

  // Per-category score breakdown for the agent
  const catScores = {
    robots: (results.robots?.score ?? 0) + (results.sitemap?.score ?? 0),
    robotsMax: 3,
    mcp: (results.mcp?.score ?? 0) + (results.webmcp?.score ?? 0) + (results.agentskills?.score ?? 0),
    mcpMax: 5,
    apiDiscovery: (results.llms?.score ?? 0) + (results.llmsfull?.score ?? 0) + (results["api-catalog"]?.score ?? 0),
    apiDiscoveryMax: 5,
    botAuth: (results.oauth?.score ?? 0) + (results["oauth-protected"]?.score ?? 0) + (results["agent-card"]?.score ?? 0) + (results.a2a?.score ?? 0),
    botAuthMax: 7,
  };

  results["_summary"] = {
    status: `${totalScore}/${maxScore} points`,
    detail: `Overall Agent Readiness: ${Math.round((totalScore / maxScore) * 10)}/10. robots/sitemap: ${catScores.robots}/${catScores.robotsMax}. MCP: ${catScores.mcp}/${catScores.mcpMax}. API discovery: ${catScores.apiDiscovery}/${catScores.apiDiscoveryMax}. Bot auth/A2A: ${catScores.botAuth}/${catScores.botAuthMax}`,
    score: Math.round((totalScore / maxScore) * 10),
  };

  results["_categoryMapping"] = {
    status: "info",
    detail: "USE THIS: 'robots' category→check keys: robots,sitemap | 'mcp' category→check keys: mcp,webmcp,agentskills | 'apiDiscovery' category→check keys: llms,llmsfull,api-catalog | 'botAuth' category→check keys: oauth,oauth-protected,agent-card,a2a | 'agentReadiness' category→overall score + headers",
    score: 0,
  };

  console.log("[Agent Readiness]", results["_summary"].detail);
  return results;
}

const LOCALE_TO_LANGUAGE: Record<string, string> = {
  en: "English",
  it: "Italian",
  fr: "French",
  es: "Spanish",
  pt: "Portuguese",
  de: "German",
  nl: "Dutch",
  ru: "Russian",
  et: "Estonian",
};

async function buildPrompt(url: string, categories: string[], locale: string, checks: Record<string, unknown>): Promise<string> {
  const promptPath = join(process.cwd(), "prompt.md");
  let basePrompt = "";
  try {
    basePrompt = readFileSync(promptPath, "utf-8");
  } catch {
    basePrompt = `You are a brutal website roast agent. Scrape the site and call submit_roast with your analysis.`;
  }

  const langName = LOCALE_TO_LANGUAGE[locale] ?? locale.toUpperCase();
  const agentData = JSON.stringify(checks, null, 2);
  const categoriesStr = categories.length > 0 ? categories.join(", ") : "design, performance, ux, seo, code, accessibility, agentReadiness";

  const modified = basePrompt
    .replace(/\{\{AGENT_DATA\}\}/g, agentData)
    .replace(/\{\{URL\}\}/g, url)
    .replace(/\{\{CATEGORIES\}\}/g, categoriesStr)
    .replace(/\{\{LANGUAGE\}\}/g, langName);

  console.log("[buildPrompt] Agent prompt length:", modified.length, "lang:", langName);
  return modified;
}

async function callLLM(messages: Array<Record<string, unknown>>, apiBase: string, apiKey: string, model: string) {
  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, temperature: 0.3, response_format: { type: "json_object" } }),
  });

  if (!response.ok) throw new Error(`LLM error: ${response.status}`);

  const data = await response.json();
  return (data.choices?.[0]?.message?.content as string) || "{}";
}

type ToolCall = { id: string; type: "function"; function: { name: string; arguments: string } };
type AgentMessage =
  | { role: "system"; content: string }
  | { role: "user"; content: string }
  | { role: "assistant"; content: string | null; tool_calls?: ToolCall[] }
  | { role: "tool"; tool_call_id: string; content: string };

async function callLLMWithTools(
  messages: AgentMessage[],
  tools: unknown[],
  apiBase: string,
  apiKey: string,
  model: string,
): Promise<{ content: string | null; tool_calls?: ToolCall[] }> {
  const response = await fetch(`${apiBase}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model, messages, tools, tool_choice: "auto", temperature: 0.3 }),
  });

  if (!response.ok) throw new Error(`LLM error: ${response.status}`);

  const data = await response.json();
  const msg = data.choices?.[0]?.message;
  return { content: (msg?.content as string | null) ?? null, tool_calls: msg?.tool_calls as ToolCall[] | undefined };
}

const AGENT_TOOLS = [
  {
    type: "function",
    function: {
      name: "scrape_url",
      description: "Fetch the content of a URL to gather real evidence: homepage HTML, robots.txt, sitemap.xml, llms.txt, CSS, JS, etc. Returns raw content (truncated if large). Call this multiple times to build evidence.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "Absolute URL to fetch" },
        },
        required: ["url"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "submit_roast",
      description: "Submit the complete roast analysis. Call when you have gathered enough evidence for ALL requested categories. All text must be in the user's language.",
      parameters: {
        type: "object",
        properties: {
          overall_score: { type: "number", description: "Honest average score 1-10 (integer or .5)" },
          verdict: { type: "string", description: "One brutal, punchy sentence summarizing the site. In the user's language." },
          scores: {
            type: "object",
            description: "Numeric score 1-10 for EVERY requested category. No nulls.",
            additionalProperties: { type: "number" },
          },
          roasts: {
            type: "array",
            description: "Exactly one entry per requested category.",
            items: {
              type: "object",
              properties: {
                category: { type: "string", description: "Exact category name as requested" },
                emoji: { type: "string", description: "Relevant emoji" },
                critique: { type: "string", description: "3-5 sentences. Brutal, specific, evidence-based. Cite real things you observed." },
                fix_prompt: { type: "string", description: "Self-contained AI-agent prompt: what to fix, which file/URL, correct implementation, success criteria. Min 2 sentences." },
              },
              required: ["category", "emoji", "critique", "fix_prompt"],
            },
          },
        },
        required: ["overall_score", "verdict", "scores", "roasts"],
      },
    },
  },
];

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

  if (typeof roast.verdict !== "string" || roast.verdict.trim().length === 0) {
    errors.push("missing or empty verdict");
  }

  // scores: every selected category must have a numeric score
  if (!roast.scores || typeof roast.scores !== "object") {
    errors.push("missing or invalid scores object");
  } else {
    const scores = roast.scores as Record<string, unknown>;
    for (const cat of categories) {
      if (!(cat in scores)) {
        errors.push(`missing score for category: ${cat}`);
      } else if (typeof scores[cat] !== "number") {
        errors.push(`score for ${cat} must be a number (got: ${scores[cat]})`);
      } else {
        const s = scores[cat] as number;
        if (s < 1 || s > 10) errors.push(`score for ${cat} out of range 1-10: ${s}`);
      }
    }
  }

  // roasts: every selected category must have a full entry with critique and fix_prompt
  if (!Array.isArray(roast.roasts)) {
    errors.push("roasts must be an array");
  } else {
    const roastMap = new Map<string, Record<string, unknown>>();
    for (const item of roast.roasts) {
      if (item && typeof item === "object" && "category" in item) {
        roastMap.set(item.category as string, item as Record<string, unknown>);
      }
    }

    for (const cat of categories) {
      if (!roastMap.has(cat)) {
        errors.push(`missing roast entry for category: ${cat}`);
        continue;
      }
      const entry = roastMap.get(cat)!;

      if (!entry.emoji || typeof entry.emoji !== "string" || entry.emoji.trim().length === 0) {
        errors.push(`missing emoji for category: ${cat}`);
      }

      if (!entry.critique || typeof entry.critique !== "string" || entry.critique.trim().length < 30) {
        errors.push(`critique for ${cat} is missing or too short (min 30 chars)`);
      }

      if (!entry.fix_prompt || typeof entry.fix_prompt !== "string" || entry.fix_prompt.trim().length < 30) {
        errors.push(`fix_prompt for ${cat} is missing or too short (min 30 chars)`);
      }
    }

    if (roast.roasts.length === 0) {
      errors.push("roasts array is empty");
    }
  }

  return { valid: errors.length === 0, errors };
}

function extractRoastFromContent(content: string): Record<string, unknown> | null {
  try {
    const p = JSON.parse(content.trim()) as Record<string, unknown>;
    return (p.final_roast as Record<string, unknown>) ?? (p.overall_score !== undefined ? p : null);
  } catch {
    return null;
  }
}

async function runAgentLoop(
  systemPrompt: string,
  url: string,
  categories: string[],
  _initialChecks: Record<string, unknown>,
  apiBase: string,
  apiKey: string,
  model: string,
  locale: string,
  onProgress?: (iter: number, action: string) => void,
  isResume = false,
) {
  const messages: AgentMessage[] = [{ role: "system", content: systemPrompt }];
  messages.push({
    role: "user",
    content: isResume
      ? `Resume the analysis of ${url}. Previous run got stuck. Scrape key pages then call submit_roast covering ALL of: ${categories.join(", ")}.`
      : `Analyze ${url}. Required categories: ${categories.join(", ")}. Scrape the homepage and key files for evidence, then call submit_roast with your brutal, honest assessment.`,
  });

  let iteration = 0;
  const maxSteps = isResume ? 6 : 12;
  let bestPartial: Record<string, unknown> | null = null;

  while (iteration < maxSteps) {
    iteration++;
    console.log(`[Roast API] Agent step ${iteration}/${maxSteps}`);

    let response: { content: string | null; tool_calls?: ToolCall[] };
    try {
      response = await callLLMWithTools(messages, AGENT_TOOLS, apiBase, apiKey, model);
    } catch (e) {
      console.error("[Roast API] LLM call failed:", e);
      messages.push({ role: "user", content: "LLM error. Proceed with available data and call submit_roast now." });
      continue;
    }

    messages.push({ role: "assistant", content: response.content, tool_calls: response.tool_calls });

    // Build the thinking text: prefer the model's own content, fall back to tool call description
    const thinkingText = response.content?.trim()
      || response.tool_calls?.map((c) => {
          if (c.function.name === "scrape_url") {
            try { return `Fetching ${(JSON.parse(c.function.arguments) as { url: string }).url}`; }
            catch { return "Fetching URL..."; }
          }
          if (c.function.name === "submit_roast") return "Writing final analysis...";
          return c.function.name;
        }).join(" · ")
      || `Step ${iteration}`;
    onProgress?.(iteration, thinkingText);

    if (!response.tool_calls || response.tool_calls.length === 0) {
      // No tool call — try to salvage inline JSON, then ask for submit_roast
      if (response.content) {
        const parsed = extractRoastFromContent(response.content);
        if (parsed) {
          const v = validateFinalRoast(parsed, categories);
          if (v.valid) return parsed;
          bestPartial = parsed;
        }
      }
      messages.push({ role: "user", content: `Call submit_roast now with your full analysis of ${url}. Required categories: ${categories.join(", ")}.` });
      continue;
    }

    for (const call of response.tool_calls) {
      if (call.function.name === "submit_roast") {
        try {
          const args = JSON.parse(call.function.arguments) as Record<string, unknown>;
          const v = validateFinalRoast(args, categories);
          if (v.valid) {
            console.log("[Roast API] submit_roast valid — done");
            return args;
          }
          console.log("[Roast API] submit_roast validation failed:", v.errors);
          bestPartial = args;
          const missing = categories.filter((c) => !(args.scores as Record<string, unknown>)?.[c]);
          messages.push({
            role: "tool",
            tool_call_id: call.id,
            content: `Rejected. Fix these errors: ${v.errors.join("; ")}${missing.length ? `. Missing categories: ${missing.join(", ")}` : ""}. Call submit_roast again.`,
          });
        } catch (e) {
          messages.push({ role: "tool", tool_call_id: call.id, content: `Argument parse error: ${e}. Retry submit_roast.` });
        }
      } else if (call.function.name === "scrape_url") {
        try {
          const { url: scrapeUrl } = JSON.parse(call.function.arguments) as { url: string };
          const resolved = scrapeUrl.startsWith("http") ? scrapeUrl : new URL(scrapeUrl, new URL(url).origin).toString();
          const content = await fetchUrl(resolved);
          console.log(`[Roast API] Scraped ${resolved}: ${content ? content.length + " chars" : "not found"}`);
          const result = content
            ? (content.length > 600 ? content.substring(0, 597) + "..." : content)
            : `Not found at ${resolved}`;
          messages.push({ role: "tool", tool_call_id: call.id, content: result });
        } catch (e) {
          messages.push({ role: "tool", tool_call_id: call.id, content: `Fetch error: ${e}` });
        }
      } else {
        messages.push({ role: "tool", tool_call_id: call.id, content: `Unknown tool "${call.function.name}". Use scrape_url or submit_roast.` });
      }
    }
  }

  // Max steps reached — force JSON output via regular call
  console.log("[Roast API] Max steps reached, forcing final JSON output");
  const langName = LOCALE_TO_LANGUAGE[locale] ?? locale.toUpperCase();
  const forcedMsg = `Max steps reached. Output ONLY a valid JSON object (no wrapper, no markdown) with: overall_score (number 1-10), verdict (string in ${langName}), scores (object with number for each of: ${categories.join(", ")}), roasts (array with one entry per category: category, emoji, critique, fix_prompt — all in ${langName}). Use evidence gathered. No placeholders.`;

  // Use simple text messages for the forced call (strip tool messages to avoid format issues)
  const simpleHistory = messages
    .filter((m) => m.role === "system" || m.role === "user" || (m.role === "assistant" && !m.tool_calls))
    .slice(0, 6) as Array<Record<string, unknown>>;
  simpleHistory.push({ role: "user", content: forcedMsg });

  try {
    const finalContent = await callLLM(simpleHistory, apiBase, apiKey, model);
    const parsed = extractRoastFromContent(finalContent);
    if (parsed) {
      const v = validateFinalRoast(parsed, categories);
      if (v.valid) { console.log("[Roast API] Forced final valid"); return parsed; }
      if (!bestPartial) bestPartial = parsed;

      const recoveryContent = await callLLM([
        ...simpleHistory,
        { role: "assistant", content: finalContent },
        { role: "user", content: `ERRORS: ${v.errors.join("; ")}. Fix only these and re-output the complete JSON.` },
      ], apiBase, apiKey, model);
      const recovered = extractRoastFromContent(recoveryContent);
      if (recovered) {
        const rv = validateFinalRoast(recovered, categories);
        if (rv.valid) { console.log("[Roast API] Recovery valid"); return recovered; }
        bestPartial = recovered;
      }
    }
  } catch (e) {
    console.error("[Roast API] Forced final call failed:", e);
  }

  return patchResult(bestPartial, categories, url, locale);
}

function patchResult(
  partial: Record<string, unknown> | null,
  categories: string[],
  url: string,
  locale = "en",
): Record<string, unknown> {
  if (!partial) return generateInaccessibleRoast(url, categories, locale);
  const EMOJIS = ["🎨", "⚡", "🔍", "📱", "♿", "🤖", "📊", "🔒", "✍️", "🏷️"];

  const existingScores = (partial?.scores as Record<string, unknown>) ?? {};
  const existingRoasts = Array.isArray(partial?.roasts)
    ? new Map((partial.roasts as Array<Record<string, unknown>>).map((r) => [r.category as string, r]))
    : new Map<string, Record<string, unknown>>();

  const scores: Record<string, number> = {};
  const roasts: Record<string, unknown>[] = [];

  for (let i = 0; i < categories.length; i++) {
    const cat = categories[i];
    const existingScore = typeof existingScores[cat] === "number" ? existingScores[cat] as number : 5;
    scores[cat] = existingScore;

    const existing = existingRoasts.get(cat);
    const critique = typeof existing?.critique === "string" && existing.critique.trim().length >= 30
      ? existing.critique as string
      : `Analysis for ${cat} at ${url} could not be fully completed. The agent gathered data but output generation encountered an error.`;
    const fix_prompt = typeof existing?.fix_prompt === "string" && existing.fix_prompt.trim().length >= 30
      ? existing.fix_prompt as string
      : `Review the ${cat} implementation at ${url}. Identify the top issues found during automated analysis and implement the necessary fixes following the site's existing code conventions.`;

    roasts.push({
      category: cat,
      emoji: (existing?.emoji as string) || EMOJIS[i % EMOJIS.length],
      critique,
      fix_prompt,
    });
  }

  return {
    overall_score: typeof partial?.overall_score === "number" ? partial.overall_score : 5,
    verdict: typeof partial?.verdict === "string" && partial.verdict.trim().length > 0
      ? partial.verdict
      : `Analysis of ${url} completed with partial results.`,
    scores,
    roasts,
  };
}
