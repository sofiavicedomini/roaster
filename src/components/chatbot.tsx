import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { getTranslations, type Locale } from "@/i18n/utils";

// Type declarations for Cloudflare Turnstile
declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, options: TurnstileOptions) => void;
      reset: () => void;
    };
    onTurnstileLoad?: () => void;
  }

  interface TurnstileOptions {
    sitekey: string;
    callback: (token: string) => void;
    "expired-callback"?: () => void;
    "error-callback"?: () => void;
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
}

interface ChatbotProps {
  locale?: Locale;
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
  { id: "agent-readiness", group: "aiAgents" },
  { id: "robots", group: "aiAgents" },
  { id: "mcp", group: "aiAgents" },
  { id: "api-discovery", group: "aiAgents" },
  { id: "bot-auth", group: "aiAgents" },
];

export function Chatbot({ locale = "en" }: ChatbotProps) {
  const t = getTranslations(locale);
  const [url, setUrl] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "design",
    "performance",
    "ux",
    "seo",
    "agent-readiness",
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
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileSiteKey = typeof import.meta !== "undefined" && import.meta.env?.PUBLIC_TURNSTILE_SITE_KEY
    ? import.meta.env.PUBLIC_TURNSTILE_SITE_KEY
    : "";

  // Turnstile render function
  const renderTurnstile = useCallback(() => {
    if (!turnstileRef.current || !window.turnstile) return;

    window.turnstile.render(turnstileRef.current, {
      sitekey: turnstileSiteKey,
      callback: (token: string) => setTurnstileToken(token),
      "expired-callback": () => setTurnstileToken(null),
      "error-callback": () => setTurnstileToken(null),
    });
  }, [turnstileSiteKey]);

  // Load Turnstile script
  useEffect(() => {
    if (!turnstileSiteKey) return;

    const scriptId = "cf-turnstile-script";
    if (document.getElementById(scriptId)) {
      // Script already loaded, render widget
      renderTurnstile();
      return;
    }

    const script = document.createElement("script");
    script.id = scriptId;
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
    script.async = true;
    script.defer = true;

    window.onTurnstileLoad = () => renderTurnstile();

    document.head.appendChild(script);

    return () => {
      delete window.onTurnstileLoad;
    };
  }, [turnstileSiteKey, renderTurnstile]);

  useEffect(() => {
    if (!isLoading) return;
    const interval = setInterval(() => {
      setLoadingMsgIdx((prev) => (prev + 1) % t.chatbot.loadingMessages.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [isLoading, t.chatbot.loadingMessages.length]);

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

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, categories: selectedCategories, locale, turnstileToken }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get roast");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errors.unknown);
    } finally {
      setIsLoading(false);
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
                    {selectedCategories.includes(cat.id) && (
                      <svg className="w-4 h-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {turnstileSiteKey && (
          <div ref={turnstileRef} className="flex justify-center"></div>
        )}

        <Button type="submit" disabled={isLoading || !url || selectedCategories.length === 0 || (turnstileSiteKey && !turnstileToken)}>
          {isLoading ? t.chatbot.buttonLoading : t.chatbot.buttonRoast}
        </Button>

        {isLoading && (
          <div className="text-center text-sm text-orange-400/80 animate-pulse">
            {t.chatbot.loadingMessages[loadingMsgIdx]}
          </div>
        )}
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm inferno-card">
          {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-6 inferno-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                {t.chatbot.overallScore.replace("{score}", String(result.overall_score))}
              </h2>
              <p className="text-muted-foreground mt-1">{result.verdict}</p>
            </div>
            <div className="flex gap-1 text-3xl">
              {"🔥".repeat(Math.ceil(result.overall_score / 2))}
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
                  <div className="ml-10 mt-2 p-3 rounded-md bg-background border border-orange-500/20">
                    <p className="text-xs text-muted-foreground mb-1">{t.chatbot.fixPrompt}</p>
                    <code className="text-xs text-orange-400 break-all">{roast.fix_prompt}</code>
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