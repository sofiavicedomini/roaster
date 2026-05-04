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
    <div className="rounded-lg border border-orange-500/15 bg-gradient-to-br from-orange-500/5 to-transparent overflow-hidden">
      <button
        type="button"
        onClick={() => setIsExpanded((v) => !v)}
        aria-expanded={isExpanded}
        aria-controls="thinking-panel"
        className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-orange-500/8 transition-colors"
      >
        {isLoading ? (
          <span className="relative flex h-2.5 w-2.5 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500" />
          </span>
        ) : (
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80 shrink-0" />
        )}
        <span className="text-sm text-orange-200/90 font-semibold flex-1">
          {isLoading
            ? `Thinking... (${thoughts.length} steps)`
            : `Thought for ${thoughts.length} steps`}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-orange-400/60 transition-transform shrink-0 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>
      {isExpanded && (
        <div
          id="thinking-panel"
          ref={scrollRef}
          className="border-t border-orange-500/10 px-4 py-3 max-h-48 overflow-y-auto scroll-smooth"
        >
          {thoughts.map((thought, i) => (
            <div
              key={i}
              className={`flex gap-2.5 text-sm font-mono py-1.5 leading-relaxed rounded px-2 -mx-2 ${
                i === thoughts.length - 1 
                  ? "text-orange-100/90 bg-orange-500/5" 
                  : "text-orange-300/55 hover:text-orange-300/70"
              }`}
            >
              <span className="text-orange-500/50 select-none shrink-0 font-bold">›</span>
              <span>{thought}</span>
            </div>
          ))}
          {isLoading && (
            <div className="flex gap-2.5 text-sm font-mono py-1.5 text-orange-400/60">
              <span className="text-orange-500/50 select-none shrink-0 font-bold">›</span>
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
          const r = data.result as RoastResult;
          setResult(r);
          setCacheInfo(r.cached ? { cachedAt: r.cachedAt!, cacheKey: r.cacheKey!, translated: r.translated } : null);
          if (r.rankingId && !r.cached) {
            try {
              const history = JSON.parse(localStorage.getItem("roastHistory") || "[]");
              history.unshift({ url: url, score: r.overall_score, verdict: r.verdict, rankingId: r.rankingId, date: new Date().toISOString() });
              localStorage.setItem("roastHistory", JSON.stringify(history.slice(0, 5)));
            } catch { /* localStorage unavailable */ }
          }
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
            // Split multi-line thinking into individual steps
            const thinkingSteps = data.progress.split("\n").filter((line: string) => line.trim());
            setThoughtHistory((prev) => {
              const newSteps = thinkingSteps.filter((step: string) =>
                !prev.some(existing => existing.trim() === step.trim())
              );
              return [...prev, ...newSteps];
            });
          }
        }
      } catch {
        console.error("[Poll] Error");
      }
    }, 1500);
    return () => clearInterval(timer);
  }, [jobId, isLoading, url]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!cacheInfo) return;
    const t = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(t);
  }, [cacheInfo]);

  const cachedAtMs = cacheInfo ? (typeof cacheInfo.cachedAt === "number" ? cacheInfo.cachedAt : new Date(cacheInfo.cachedAt).getTime()) : 0;
  const cacheAgeMin = cacheInfo ? Math.round((now - cachedAtMs) / 60000) : 0;
  const cacheClearInMin = cacheInfo ? Math.ceil(30 - (now - cachedAtMs) / 60000) : 0;
  const isCacheOld = cacheInfo ? (now - cachedAtMs) >= 30 * 60 * 1000 : false;
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isCategoryDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isCategoryDropdownOpen]);

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
       <form onSubmit={handleSubmit} aria-label={t.chatbot.urlLabel} className="flex flex-col gap-5 rounded-xl border border-orange-500/15 p-5 bg-gradient-to-br from-background to-orange-500/5 shadow-lg" aria-busy={isLoading}>

        <div className="flex flex-col gap-3">
          <label htmlFor="site-url" className="text-sm font-semibold tracking-tight text-orange-200/90">{t.chatbot.urlLabel}</label>
          <input
            id="site-url"
            type="url"
            required
            placeholder={t.chatbot.urlPlaceholder}
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="w-full rounded-lg border border-orange-500/20 bg-background/80 px-4 py-3 text-sm placeholder:text-orange-300/40 focus:outline-none focus:ring-2 focus:ring-orange-500/40 transition-all"
            disabled={isLoading}
          />
          {t.chatbot.urlHint && (
            <p className="text-xs text-orange-300/50 mt-0.5">{t.chatbot.urlHint}</p>
          )}
        </div>

          <div className="flex flex-col gap-3">
            <label className="text-sm font-semibold tracking-tight text-orange-200/90">{t.chatbot.categoriesLabel}</label>

          {/* Mobile: dropdown with larger touch targets */}
          <div ref={dropdownRef} className="md:hidden relative">
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg border border-border bg-background text-sm font-medium"
            >
              <span>
                {selectedCategories.length > 0
                  ? `${selectedCategories.length} selected`
                  : "Select categories"}
              </span>
              <ChevronDown className={`w-5 h-5 transition-transform ${isCategoryDropdownOpen ? "rotate-180" : ""}`} />
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute z-50 w-full mt-2 p-3 rounded-lg border bg-background shadow-lg max-h-80 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORIES.map((cat) => (
                    <label
                      key={cat.id}
                      className="flex items-center gap-3 p-3 rounded-md cursor-pointer hover:bg-muted/50 transition-colors min-h-[48px]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="w-5 h-5 rounded border-input accent-primary"
                      />
                      <span className="text-sm font-medium">
                        {t.chatbot.categories[cat.id as keyof typeof t.chatbot.categories] || cat.id}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Desktop: inline buttons */}
          <div className="hidden md:flex flex-col gap-3">
            {Object.entries(groups).map(([group, cats]) => (
              <div key={group} className="flex flex-col gap-2">
                <span className="text-[0.65rem] font-bold text-orange-300/50 uppercase tracking-widest">
                  {t.chatbot.groups[group as keyof typeof t.chatbot.groups] || group}
                </span>
                <div className="flex flex-wrap gap-2">
                  {cats.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => toggleCategory(cat.id)}
                      aria-pressed={selectedCategories.includes(cat.id)}
                      aria-label={`${t.chatbot.categories[cat.id as keyof typeof t.chatbot.categories] || cat.id} ${selectedCategories.includes(cat.id) ? "selected" : "not selected"}`}
                      className={`flex items-center gap-2 px-3.5 py-2 rounded-lg border cursor-pointer transition-all duration-200 ease-out text-sm ${
                        selectedCategories.includes(cat.id)
                          ? "border-orange-500/50 bg-orange-500/20 shadow-[0_0_16px_oklch(0.837_0.128_66.29_/_0.3)] scale-[1.02] text-orange-100"
                          : "border-orange-500/15 bg-orange-500/5 hover:bg-orange-500/10 hover:border-orange-500/25 hover:shadow-[0_0_8px_oklch(0.705_0.213_47.604_/_0.2)] hover:scale-[1.01] text-orange-200/60"
                      }`}
                    >
                      <span className="font-medium">
                        {t.chatbot.categories[cat.id as keyof typeof t.chatbot.categories] || cat.id}
                      </span>
                      <Check
                        className={`w-4 h-4 transition-all duration-200 ${
                          selectedCategories.includes(cat.id)
                            ? "text-orange-400 scale-100"
                            : "text-orange-300/30 scale-75"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {turnstileSiteKey && (
          <div ref={turnstileRef} className="flex justify-center min-h-[70px]"></div>
        )}

        {turnstileSiteKey && !turnstileToken && isTurnstileLoading && !isTurnstileExpired && (
          <div className="text-center text-xs text-amber-300/90 font-medium" role="status" aria-live="polite">
            ↻ {t.chatbot.verifyingRobot}
          </div>
        )}

        {isTurnstileExpired && (
          <div className="text-center text-xs text-amber-300 bg-amber-500/15 border border-amber-500/50 rounded p-2 font-medium" role="alert" aria-live="assertive">
            ↻ {t.errors.captchaExpired}
          </div>
        )}

        <Button
          type="submit"
          disabled={isLoading || !url || selectedCategories.length === 0 || (turnstileSiteKey && !turnstileToken)}
          aria-disabled={isLoading || !url || selectedCategories.length === 0 || (turnstileSiteKey && !turnstileToken)}
        >
          {isLoading ? t.chatbot.buttonLoading : t.chatbot.buttonRoast}
        </Button>

        {isLoading && (
          <div className="flex flex-col gap-2" aria-live="polite" aria-atomic="true">
            <ThinkingPanel thoughts={thoughtHistory} isLoading={isLoading} />
            <div className="text-center text-sm text-orange-300/90 font-medium">
              {t.chatbot.loadingMessages[loadingMsgIdx]}
            </div>
            {jobStatus === "resuming" && (
              <div className="text-center text-xs text-amber-300/90 font-medium" role="status">
                ↻ Resuming stuck analysis...
              </div>
            )}
          </div>
        )}
      </form>

        {error && (
          <div
            className={`p-4 rounded-lg border text-sm ${
              isTurnstileLoading
                ? "bg-amber-500/10 border-amber-500/40 text-amber-200"
                : "bg-red-500/10 border-red-500/40 text-red-200"
            }`}
            role="alert"
            aria-live="assertive"
          >
            <p className="font-semibold">{error}</p>
            {isTurnstileLoading && (
              <p className="mt-1.5 text-xs text-amber-300/80 font-medium">
                ↻ {t.errors.captchaExpired}
              </p>
            )}
          </div>
        )}

      {result && (
        <div className="flex flex-col gap-4 rounded-xl border border-orange-500/15 p-6 bg-gradient-to-br from-background to-orange-500/5 shadow-lg inferno-card" aria-live="polite" aria-atomic="true">
          {cacheInfo && (
            <div className="text-xs text-orange-300/50 border-b border-orange-500/10 pb-2 mb-2 flex items-center justify-between">
              <span className="font-medium">
                {cacheInfo.translated ? "Translated" : "Cached"} result
                {" "}from {new Date(cacheInfo.cachedAt).toLocaleString()}
                {" "}({cacheAgeMin} min ago)
              </span>
              {isCacheOld ? (
                <button onClick={clearCache} aria-label={`Clear cached result for ${url}`} className="text-xs font-semibold text-orange-400 hover:text-orange-300 hover:underline underline-offset-2 transition-all">
                  Clear cache
                </button>
              ) : (
                <span className="text-xs text-orange-400/60 font-medium">
                  Wait {cacheClearInMin} min to clear
                </span>
              )}
            </div>
          )}
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <h2 className="text-4xl font-extrabold tracking-tight text-orange-100" aria-live="polite" aria-atomic="true">
                {t.chatbot.overallScore.replace("{score}", String(result.overall_score))}
              </h2>
              <p className="text-orange-200/60 mt-2 text-base" id="roast-verdict">{result.verdict}</p>
            </div>
            <div className="flex flex-col items-end gap-2 shrink-0 ml-4">
              <div className="flex gap-1 text-4xl">
                {"🔥".repeat(Math.ceil(result.overall_score / 2))}
              </div>
              {result.rankingId && (() => {
                const rankingUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/${locale}/rankings/${result.rankingId}`;
                const shareText = encodeURIComponent(`${url} got ${result.overall_score}/10 🔥 ${result.verdict}`);
                const shareUrl = encodeURIComponent(rankingUrl);
                return (
                  <div className="flex flex-col items-end gap-1.5">
                    <a
                      href={`/${locale}/rankings/${result.rankingId}`}
                      aria-label={t.rankings.shareRoast}
                      className="flex items-center gap-1.5 text-xs font-semibold text-orange-400/80 hover:text-orange-300 transition-colors border border-orange-500/30 hover:border-orange-400/50 rounded-md px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/15"
                    >
                      {t.rankings.shareRoast}
                    </a>
                    <div className="flex gap-2">
                      <a href={`https://twitter.com/intent/tweet?url=${shareUrl}&text=${shareText}`} target="_blank" rel="noopener noreferrer" aria-label="Share on X / Twitter" className="text-xs px-2.5 py-1 rounded border border-orange-500/20 text-orange-300/60 hover:text-orange-300 hover:border-orange-400/40 hover:bg-orange-500/10 transition-colors font-semibold">𝕏</a>
                      <a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share on WhatsApp" className="text-xs px-2.5 py-1 rounded border border-orange-500/20 text-orange-300/60 hover:text-orange-300 hover:border-orange-400/40 hover:bg-orange-500/10 transition-colors font-semibold">WA</a>
                      <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noopener noreferrer" aria-label="Share on LinkedIn" className="text-xs px-2.5 py-1 rounded border border-orange-500/20 text-orange-300/60 hover:text-orange-300 hover:border-orange-400/40 hover:bg-orange-500/10 transition-colors font-semibold">in</a>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 py-4 border-t border-orange-500/10">
            {Object.entries(result.scores).map(([cat, score]) => (
              <div
                key={cat}
                className="flex items-center gap-2.5 px-3.5 py-2 rounded-lg bg-orange-500/5 border border-orange-500/10"
              >
                <span className="text-sm font-semibold capitalize text-orange-200/80">
                  {t.chatbot.categories[cat as keyof typeof t.chatbot.categories] || cat}
                </span>
                <span className={`font-bold ${getScoreColor(score)}`}>
                  {score !== null ? score : "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t border-orange-500/10">
            <h3 className="font-bold text-lg tracking-tight text-orange-100">{t.chatbot.detailedRoasts}</h3>
            {result.roasts.map((roast, i) => (
              <div key={i} className="flex flex-col gap-2.5 p-4.5 rounded-lg bg-orange-500/5 border border-orange-500/10 hover:bg-orange-500/10 hover:border-orange-500/20 transition-all duration-200">
                <div className="flex gap-3.5">
                  <span className="text-3xl">{roast.emoji}</span>
                  <div className="flex-1">
                    <h4 className="font-bold capitalize text-base text-orange-100">
                      {t.chatbot.categories[roast.category as keyof typeof t.chatbot.categories] || roast.category}
                    </h4>
                    <p className="text-sm text-orange-200/60 mt-1.5 leading-relaxed">{roast.critique}</p>
                  </div>
                </div>
                {roast.fix_prompt && (
                  <div className="ml-10 mt-2 p-3.5 rounded-lg bg-background/50 border border-orange-500/25 relative group">
                    <button
                      onClick={() => copyToClipboard(roast.fix_prompt!)}
                      aria-label="Copy fix prompt"
                      className="absolute top-2.5 right-2.5 p-1.5 text-orange-400/70 hover:text-orange-400 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-all"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <p className="text-xs text-orange-300/50 mb-1.5 pr-8 font-medium">{t.chatbot.fixPrompt}</p>
                    <code className="text-xs text-orange-300 break-all block whitespace-pre-wrap font-mono bg-orange-950/30 rounded p-2">{roast.fix_prompt}</code>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {result && (
        <div className="mt-6 pt-6 border-t border-orange-500/10 text-center">
          <p className="text-sm text-orange-400/70 font-medium">
            {t.about?.cta || "Want something built right? Contact us →"}
          </p>
        </div>
      )}
    </div>
  );
}
