export const prerender = false;

import type { APIRoute } from "astro";
import { getRankings, getRankingsCount } from "@/lib/redis";

export const GET: APIRoute = async ({ request }) => {
  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") || "100", 10), 500);
    const includeResults = url.searchParams.get("results") === "true";

    const [count, roasts] = await Promise.all([
      getRankingsCount(),
      getRankings(limit)
    ]);

    const validRoasts = roasts.filter(Boolean) as NonNullable<typeof roasts[number]>[];

    const scores = validRoasts.map(r => r.score).filter(s => s != null);
    const avgScore = scores.length > 0 
      ? scores.reduce((a, b) => a + b, 0) / scores.length 
      : 0;

    const categoryCounts: Record<string, number> = {};
    validRoasts.forEach(r => {
      r.cats?.forEach(cat => {
        categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      });
    });

    const topScores = [...validRoasts]
      .sort((a, b) => b.score - a.score)
      .slice(0, 10)
      .map(r => ({ url: r.normUrl || r.url, score: r.score, verdict: r.verdict }));

    const lowestScores = [...validRoasts]
      .sort((a, b) => a.score - b.score)
      .slice(0, 10)
      .map(r => ({ url: r.normUrl || r.url, score: r.score, verdict: r.verdict }));

    const summary = {
      metadata: {
        totalRoasts: count,
        displayedRoasts: validRoasts.length,
        averageScore: Math.round(avgScore * 10) / 10,
        generatedAt: new Date().toISOString(),
        version: "1.0.0"
      },
      statistics: {
        scoreDistribution: {
          excellent: scores.filter(s => s >= 8).length,
          good: scores.filter(s => s >= 6 && s < 8).length,
          fair: scores.filter(s => s >= 4 && s < 6).length,
          poor: scores.filter(s => s >= 2 && s < 4).length,
          terrible: scores.filter(s => s < 2).length
        },
        topCategories: Object.entries(categoryCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([cat, count]) => ({ category: cat, count }))
      },
      rankings: {
        topRated: topScores,
        lowestRated: lowestScores
      },
      recentRoasts: includeResults 
        ? validRoasts.map(r => ({
            uuid: r.uuid,
            url: r.normUrl || r.url,
            score: r.score,
            verdict: r.verdict,
            completedAt: r.completedAt,
            result: r.result
          }))
        : validRoasts.slice(0, 20).map(r => ({
            uuid: r.uuid,
            url: r.normUrl || r.url,
            score: r.score,
            verdict: r.verdict,
            completedAt: r.completedAt
          }))
    };

    return new Response(JSON.stringify(summary, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60",
        "Vary": "Accept, X-Agent"
      }
    });
  } catch (err) {
    console.error("[Summary API] Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
