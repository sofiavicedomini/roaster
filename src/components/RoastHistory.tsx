import { useState, useEffect } from "react";
import { getTranslations, type Locale } from "@/i18n/utils";

interface HistoryEntry {
  url: string;
  score: number;
  verdict: string;
  rankingId: string;
  date: string;
}

interface Props {
  locale?: Locale;
}

export function RoastHistory({ locale = "en" }: Props) {
  const t = getTranslations(locale);
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("roastHistory") || "[]");
      setHistory(stored);
    } catch { /* no-op */ }
  }, []);

  const clearAll = () => {
    try { localStorage.removeItem("roastHistory"); } catch { /* no-op */ }
    setHistory([]);
  };

  if (history.length === 0) return null;

  const scoreColor = (s: number) =>
    s >= 8 ? "text-green-500" : s >= 5 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-orange-400/60 uppercase tracking-wider">{t.history.title}</h2>
        <button onClick={clearAll} aria-label="Clear all analysis history" className="text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors">
          {t.history.clearAll}
        </button>
      </div>
      <div className="flex flex-col gap-1.5">
        {history.map((h, i) => (
          <a
            key={i}
            href={`/${locale}/rankings/${h.rankingId}`}
            aria-label={`View roast for ${h.url}, score ${h.score}/10`}
            className="flex items-center gap-3 p-2.5 rounded-md border border-orange-500/10 bg-card/30 hover:bg-muted/10 hover:border-orange-500/20 transition-colors no-underline"
          >
            <span className={`text-sm font-bold tabular-nums shrink-0 ${scoreColor(h.score)}`}>{h.score}<span className="text-xs font-normal opacity-60">/10</span></span>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-foreground/70 truncate">{h.url}</div>
              <div className="text-xs text-muted-foreground/50 truncate">{h.verdict}</div>
            </div>
            <span className="text-xs text-muted-foreground/40 shrink-0">{new Date(h.date).toLocaleDateString(locale, { day: "2-digit", month: "short" })}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
