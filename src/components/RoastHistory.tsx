import { useState } from "react";
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
  const [history, setHistory] = useState<HistoryEntry[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("roastHistory") || "[]");
    } catch { return []; }
  });

  const clearAll = () => {
    try { localStorage.removeItem("roastHistory"); } catch { /* no-op */ }
    setHistory([]);
  };

  if (history.length === 0) return null;

  const scoreColor = (s: number) =>
    s >= 8 ? "text-green-500" : s >= 5 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="mt-8 pt-6 border-t border-orange-500/10">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-bold text-orange-400/50 uppercase tracking-widest">{t.history.title}</h2>
        <button onClick={clearAll} aria-label="Clear all analysis history" className="text-xs text-orange-300/40 hover:text-orange-300 transition-colors font-medium">
          {t.history.clearAll}
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {history.map((h, i) => (
          <a
            key={i}
            href={`/${locale}/rankings/${h.rankingId}`}
            aria-label={`View roast for ${h.url}, score ${h.score}/10`}
            className="flex items-center gap-3.5 p-3 rounded-lg border border-orange-500/10 bg-gradient-to-br from-orange-500/5 to-transparent hover:from-orange-500/10 hover:border-orange-500/25 transition-all duration-200 no-underline group"
          >
            <span className={`text-base font-bold tabular-nums shrink-0 px-2 py-1 rounded bg-orange-500/10 ${scoreColor(h.score)}`}>{h.score}<span className="text-sm font-normal opacity-60">/10</span></span>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-orange-100/70 truncate group-hover:text-orange-100 transition-colors">{h.url}</div>
              <div className="text-xs text-orange-300/45 truncate mt-0.5">{h.verdict}</div>
            </div>
            <span className="text-xs text-orange-300/35 shrink-0">{new Date(h.date).toLocaleDateString(locale, { day: "2-digit", month: "short" })}</span>
          </a>
        ))}
      </div>
    </div>
  );
}
