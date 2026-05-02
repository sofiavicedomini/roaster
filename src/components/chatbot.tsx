import { useState } from "react";
import { Button } from "@/components/ui/button";

interface RoastResult {
  overall_score: number;
  verdict: string;
  scores: Record<string, number | null>;
  roasts: Array<{
    category: string;
    emoji: string;
    critique: string;
  }>;
}

const CATEGORIES = [
  { id: "design", label: "Design", group: "Technical" },
  { id: "performance", label: "Performance", group: "Technical" },
  { id: "code", label: "Code", group: "Technical" },
  { id: "mobile", label: "Mobile", group: "Technical" },
  { id: "ux", label: "UX", group: "Experience" },
  { id: "accessibility", label: "Accessibility", group: "Experience" },
  { id: "conversion", label: "Conversion", group: "Experience" },
  { id: "seo", label: "SEO", group: "Content" },
  { id: "copy", label: "Copy", group: "Content" },
  { id: "brand", label: "Brand", group: "Trust" },
  { id: "credibility", label: "Credibility", group: "Trust" },
  { id: "security", label: "Security", group: "Trust" },
];

export function Chatbot() {
  const [url, setUrl] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([
    "design",
    "performance",
    "ux",
    "seo",
  ]);

  const groups = CATEGORIES.reduce((acc, cat) => {
    if (!acc[cat.group]) acc[cat.group] = [];
    acc[cat.group].push(cat);
    return acc;
  }, {} as Record<string, typeof CATEGORIES>);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<RoastResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!url) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, categories: selectedCategories }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to get roast");
      }

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
      <form onSubmit={handleSubmit} className="flex flex-col gap-4 rounded-lg border p-4 bg-card">
        <div className="flex flex-col gap-2">
          <label htmlFor="url" className="text-sm font-medium">
            Website URL
          </label>
          <input
            id="url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com"
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          />
        </div>

        <div className="flex flex-col gap-3">
          <label className="text-sm font-medium">Categories to analyze</label>
          {Object.entries(groups).map(([group, cats]) => (
            <div key={group} className="flex flex-col gap-2">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{group}</span>
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
                    <span className="text-sm">{cat.label}</span>
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

        <Button type="submit" disabled={isLoading || !url || selectedCategories.length === 0}>
          {isLoading ? "Roasting..." : "Roast this site"}
        </Button>
      </form>

      {error && (
        <div className="p-4 rounded-lg bg-destructive/10 border border-destructive text-destructive text-sm">
          {error}
        </div>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded-lg border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Overall Score: {result.overall_score}/10</h2>
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
                <span className="text-sm capitalize">{cat}</span>
                <span className={`font-bold ${getScoreColor(score)}`}>
                  {score !== null ? score : "—"}
                </span>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-4 pt-4 border-t">
            <h3 className="font-medium text-lg">Detailed Roasts</h3>
            {result.roasts.map((roast, i) => (
              <div key={i} className="flex gap-3 p-3 rounded-lg bg-muted/50">
                <span className="text-2xl">{roast.emoji}</span>
                <div>
                  <h4 className="font-medium capitalize">{roast.category}</h4>
                  <p className="text-sm text-muted-foreground mt-1">{roast.critique}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}