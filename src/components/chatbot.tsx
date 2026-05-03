import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ChevronDown } from "lucide-react";
import { getTranslations, type Locale } from "@/i18n/utils";

// Type declarations for Cloudflare Turnstile
declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => string;
      reset: (widgetId?: string) => void;
      remove: (widgetId: string) => void;
    };
    onTurnstileLoad?: () => void;
  }

  interface TurnstileOptions {
    sitekey: string;
    callback: (token: string) => void;
    "expired-callback"?: () => void;
    "error-callback"?: (error?: unknown) => void;
    theme?: "light" | "dark" | "auto";
    size?: "normal" | "compact" | "invisible";
    appearance?: "always" | "execute" | "interaction-only";
  }
}

interface RoastResult {
  overall_score: number;
  verdict: string;
  scores: Record<string, number | null>;
  roasts: Array<{
    category: string;
    emoji: string;
    critique: string;
    fix_prompt?: string;
  }>;
  cached?: boolean;
  cachedAt?: string;
  cacheKey?: string;
  translated?: boolean;
  rankingId?: string;
}

interface ChatbotProps {
  locale?: Locale;
}

function ThinkingPanel({ thoughts, isLoading }: { thoughts: string[]; isLoading: boolean }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [thoughts]);

  if (thoughts.length === 0) return null;

  return (
    <div className="rounded-lg border border-orange-500/20 bg-black/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-orange-500/5 transition-colors"
      >
        {isLoading ? (
          <span className="relative flex h-2 w-2 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500" />
          </span>
        ) : (
          <span className="h-2 w-2 rounded-full bg-green-500/70 shrink-0" />
        )}
        <span className="text-xs text-orange-300/80 font-medium flex-1">
          {isLoading
            ? `Thinking... (${thoughts.length} steps)`
            : `Thought for ${thoughts.length} steps`}
        </span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-orange-400/40 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>
      {isExpanded && (
        <div
          ref={scrollRef}
          className="border-t border-orange-500/10 px-3 py-2 max-h-44 overflow-y-auto scroll-smooth"
        >
          {thoughts.map((thought, i) => (
            <div
              key={i}
              className={`flex gap-2 text-xs font-mono py-0.5 leading-relaxed ${
                i === thoughts.length - 1 ? "text-orange-200/80" : "text-orange-400/35"
              }`}
            >
              <span className="text-orange-600/40 select-none shrink-0">›</span>
              <span>{thought}</span>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2 text-xs font-mono py-0.5 text-orange-400/50">
              <span className="text-orange-600/40 select-none shrink-0">›</span>
              <span className="animate-pulse">▋</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const CATEGORIES = [
  { id: "design", group: "technical" },
  { id: "performance", group: "technical" },
  { id: "code", group: "technical" },
  { id: "mobile", group: "technical" },
  { id: "ux", group: "experience" },
  { id: "accessibility", group: "experience" },
  { id: "conversion", group: "experience" },
  { id: "seo", group: "content" },
  { id: "copy", group: "content" },
  { id: "brand", group: "trust" },
  { id: "credibility", group: "trust" },
  { id: "security", group: "trust" },
  { id: "agentReadiness", group: "aiAgents" },
  { id: "robots", group: "aiAgents" },
  { id: "mcp", group: "aiAgents" },
  { id: "apiDiscovery", group: "aiAgents" },
  { id: "botAuth", group: "aiAgents" },
];

export function Chatbot({ locale = "en" }: ChatbotProps) {
  const t = getTranslations(locale);
  const [url, setUrl] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "design", "performance", "ux", "seo", "agentReadiness",
  ]);

  const groups = CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof CATEGORIES>);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMsgIdx, setLoadingMsgIdx] = useState(0);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{ cachedAt: string; cacheKey: string; translated?: boolean } | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [isTurnstileExpired, setIsTurnstileExpired] = useState(false);
  const [isTurnstileLoading, setIsTurnstileLoading] = useState(true);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const renderTurnstileRef = useRef<(() => void) | null>(null);
  const turnstileSiteKey = typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_TURNSTILE_SITE_KEY
    ? import.meta.env.PUBLIC_TURNSTILE_SITE_KEY
    : "";

  // Load Turnstile script and render widget
  useEffect(() => {
    if (!turnstileSiteKey || !turnstileRef.current) return;

    const scriptId = "cf-turnstile-script";

    const resetTurnstile = () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.reset(widgetIdRef.current);
        } catch (e) {
          console.warn("[Turnstile] Reset failed, re-rendering", e);
          widgetIdRef.current = null;
        }
      }
      setTurnstileToken(null);
      setIsTurnstileExpired(false);
    };

    const renderTurnstile = () => {
      if (!turnstileRef.current || !window.turnstile) return;

      if (widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (err) {
          console.warn("[Turnstile] Cleanup error:", err);
        }
        widgetIdRef.current = null;
      }

      setIsTurnstileLoading(true);
      widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token: string) => {
          setTurnstileToken(token);
          setIsTurnstileExpired(false);
          setIsTurnstileLoading(false);
          console.log("[Turnstile] Token received - will be invalidated after use");
        },
        "expired-callback": () => {
          setTurnstileToken(null);
          setIsTurnstileExpired(true);
          setIsTurnstileLoading(false);
          console.warn("[Turnstile] Token expired, renewing immediately...");
          resetTurnstile();
        },
        "error-callback": (error?: unknown) => {
          console.error("[Turnstile] Error:", error);
          const err = error as Record<string, unknown>;
          if (err?.code === 300030) {
            console.error("[Turnstile] Error 300030 - Check site key and domain in Cloudflare dashboard");
          }
          setIsTurnstileExpired(true);
          setIsTurnstileLoading(false);
        },
        theme: "dark",
        appearance: "interaction-only",
        size: "normal",
      });
    };

    renderTurnstileRef.current = renderTurnstile;

    if (document.getElementById(scriptId)) {
      setTimeout(renderTurnstile, 100);
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;

    script.onload = () => {
      console.log("[Turnstile] Script loaded successfully");
      setTimeout(renderTurnstile, 200);
    };

    script.onerror = () => {
      console.error("[Turnstile] Failed to load script");
    };

    document.head.appendChild(script);

    return () => {
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (err) {
          console.warn("[Turnstile] Cleanup error:", err);
        }
      }
      widgetIdRef.current = null;
    };
  }, [turnstileSiteKey]);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % t.chatbot.loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading, t.chatbot.loadingMessages.length]);

  const [jobStatus, setJobStatus] = useState<string>("");
  const [thoughtHistory, setThoughtHistory] = useState<string[]>([]);

  useEffect(() => {
    if (!jobId || !isLoading) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/roast?jobId=${jobId}`);
        const data = await res.json();
        if (data.status === "completed") {
          setResult(data.result);
          setCacheInfo(data.result.cached ? { cachedAt: data.result.cachedAt, cacheKey: data.result.cacheKey, translated: data.result.translated } : null);
          setIsLoading(false);
          setJobId(null);
          clearInterval(timer);
        } else if (data.status === "failed") {
          setError(data.error || "Processing failed");
          setIsLoading(false);
          setJobId(null);
          clearInterval(timer);
        } else {
          setJobStatus(data.status);
          if (data.progress) {
            setThoughtHistory((prev) => {
              if (prev[prev.length - 1] === data.progress) return prev;
              return [...prev, data.progress];
            });
          }
        }
      } catch {
        console.error("[Poll] Error");
      }
    }, 2000);
    return () => clearInterval(timer);
  }, [jobId, isLoading]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!cacheInfo) return;
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, [cacheInfo]);

  const cacheAgeMin = cacheInfo ? Math.round((now - new Date(cacheInfo.cachedAt).getTime()) / 60000) : 0;
  const cacheClearInMin = cacheInfo ? Math.ceil(30 - (now - new Date(cacheInfo.cachedAt).getTime()) / 60000) : 0;
  const isCacheOld = cacheInfo ? now - new Date(cacheInfo.cachedAt).getTime() >= 30 * 60 * 1000 : false;

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setLoadingMsgIdx(0);
    setError(null);
    setResult(null);
    setCacheInfo(null);
    setJobId(null);
    setThoughtHistory([]);

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, categories: selectedCategories, locale, turnstileToken }),
      });

      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        // On any 403 (captcha error), invalidate token and force a fresh widget
        if (response.status === 403) {
          setTurnstileToken(null);
          setIsTurnstileLoading(true);
          setIsTurnstileExpired(false);
          setTimeout(() => renderTurnstileRef.current?.(), 150);
        }
        throw new Error((data.error as string) || "Request failed");
      }

      // Token was consumed — reset widget to get a fresh one for the next roast
      if (turnstileToken && window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.reset(widgetIdRef.current);
          setTurnstileToken(null);
          setIsTurnstileLoading(true);
        } catch (resetErr) {
          console.warn("[Turnstile] Reset after use failed:", resetErr);
        }
      }

      if (data.jobId) {
        setJobId(data.jobId as string);
      } else if (data.overall_score !== undefined) {
        setResult(data as unknown as RoastResult);
        if (data.cached) setCacheInfo({ cachedAt: data.cachedAt as string, cacheKey: data.cacheKey as string, translated: data.translated as boolean | undefined });
        setIsLoading(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        const temp = document.createElement("div");
        temp.textContent = "Copied!";
        temp.className = "fixed top-4 right-4 bg-emerald-600 text-white text-sm px-4 py-2.5 rounded-xl shadow-xl border border-emerald-500/50 z-50";
        document.body.appendChild(temp);
        setTimeout(() => temp.remove(), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        alert("Failed to copy prompt");
      });
  };

  const clearCache = async () => {
    if (!cacheInfo) return;
    try {
      const res = await fetch(`/api/roast/cache?key=${encodeURIComponent(cacheInfo.cacheKey)}`, { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        setCacheInfo(null);
        setResult(null);
      } else {
        alert(data.error || "Failed to clear cache");
      }
    } catch {
      alert("Failed to clear cache");
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-muted-foreground";
    if (score >= 8) return "text-green-500";
    if (score >= 5) return "text-yellow-500";
    return "text-red-500";
  };

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border p-4 bg-card inferno-card">
        <div className="flex flex-col gap-2">
          <label htmlFor="url" className="text-sm font-medium">
            {t.chatbot.urlLabel}
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder={t.chatbot.urlPlaceholder}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium">{t.chatbot.categoriesLabel}</label>
          {Object.entries(groups).map(([group, cats]) => (
            <div key={group} className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                {t.chatbot.groups[group as keyof typeof t.chatbot.groups] || group}
              </span>
              <div className="flex flex-wrap gap-2">
                {cats.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md border cursor-pointer transition-colors ${
                      selectedCategories.includes(cat.id)
                        ? "border-primary bg-primary/10"
                        : "border-border hover:bg-muted"
                    }`}
                  >
                    <span className="text-sm">
                      {t.chatbot.categories[cat.id as keyof typeof t.chatbot.categories] || cat.id}
                    </span>
                    <Check
                      className={`w-4 h-4 transition-colors ${
                        selectedCategories.includes(cat.id)
                          ? "text-primary"
                          : "text-muted-foreground/40"
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {turnstileSiteKey && (
          <div ref={turnstileRef} className="flex justify-center min-h-[70px]"></div>
        )}

        {turnstileSiteKey && !turnstileToken && isTurnstileLoading && !isTurnstileExpired && (
          <div className="text-center text-xs text-amber-400/70">
            {t.chatbot.verifyingRobot}
          </div>
        )}

        {isTurnstileExpired && (
          <div className="text-center text-xs text-amber-400 bg-amber-500/10 border border-amber-500/30 rounded p-2">
            ↻ {t.errors.captchaExpired}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !url || selectedCategories.length === 0 || (turnstileSiteKey && !turnstileToken)}
        >
          {isLoading ? t.chatbot.buttonLoading : t.chatbot.buttonRoast}
        </Button>

        {isLoading && (
          <div className="flex flex-col gap-2">
            <ThinkingPanel thoughts={thoughtHistory} isLoading={isLoading} />
            <div className="text-center text-sm text-orange-400/80 animate-pulse">
              {t.chatbot.loadingMessages[loadingMsgIdx]}
            </div>
            {jobStatus === "resuming" && (
              <div className="text-center text-xs text-amber-400/80">
                Resuming stuck analysis...
              </div>
            )}
          </div>
        )}
      </form>

      {error && (
        <div className={`p-4 rounded-lg border text-sm inferno-card ${
          isTurnstileLoading
            ? "bg-amber-500/10 border-amber-500/40 text-amber-300"
            : "bg-destructive/10 border-destructive text-destructive"
        }`}>
          <p>{error}</p>
          {isTurnstileLoading && (
            <p className="mt-1.5 text-xs text-amber-400/70 animate-pulse">
              ↻ CAPTCHA in aggiornamento, attendi...
            </p>
          )}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-6 inferno-card">
          {cacheInfo && (
            <div className="text-xs text-muted-foreground border-b pb-2 mb-2 flex items-center justify-between">
              <span>
                {cacheInfo.translated ? "Translated" : "Cached"} result
                {" "}from {new Date(cacheInfo.cachedAt).toLocaleString()}
                {" "}({cacheAgeMin} min ago)
              </span>
              {isCacheOld ? (
                <button onClick={clearCache} className="text-xs text-orange-400 hover:text-orange-300 underline">
                  Clear cache
                </button>
              ) : (
                <span className="text-xs text-amber-400/70">
                  Wait {cacheClearInMin} min to clear
                </span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold">
                {t.chatbot.overallScore.replace("{score}", String(result.overall_score))}
              </h2>
              <p className="text-muted-foreground mt-1">{result.verdict}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
              <div className="flex gap-1 text-3xl">
                {"🔥".repeat(Math.ceil(result.overall_score / 2))}
              </div>
              {result.rankingId && (
                <a
                  href={`/${locale}/rankings/${result.rankingId}`}
                  className="flex items-center gap-1.5 text-xs text-orange-400/70 hover:text-orange-300 transition-colors border border-orange-500/20 hover:border-orange-400/40 rounded-md px-2.5 py-1"
                >
                  {t.rankings.shareRoast}
                </a>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 py-4 border-t">
            {Object.entries(result.scores).map(([cat, score]) => (
              <div
                key={cat}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted"
              >
                <span className="text-sm capitalize">
                  {t.chatbot.categories[cat as keyof typeof t.chatbot.categories] || cat}
                </span>
                <span className={`font-bold ${getScoreColor(score)}`}>
                  {score !== null ? score : "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t">
            <h3 className="font-medium text-lg">{t.chatbot.detailedRoasts}</h3>
            {result.roasts.map((roast, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 rounded-lg bg-muted/50">
                <div className="flex gap-3">
                  <span className="text-2xl">{roast.emoji}</span>
                  <div className="flex-1">
                    <h4 className="font-medium capitalize">
                      {t.chatbot.categories[roast.category as keyof typeof t.chatbot.categories] || roast.category}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">{roast.critique}</p>
                  </div>
                </div>
                {roast.fix_prompt && (
                  <div className="ml-10 mt-2 p-3 rounded-md bg-background border border-orange-500/20 relative group">
                    <button
                      onClick={() => copyToClipboard(roast.fix_prompt!)}
                      className="absolute top-2 right-2 p-1.5 text-orange-400/70 hover:text-orange-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Copia prompt"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-xs text-muted-foreground mb-1 pr-6">{t.chatbot.fixPrompt}</p>
                    <code className="text-xs text-orange-400 break-all block whitespace-pre-wrap font-mono">{roast.fix_prompt}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
