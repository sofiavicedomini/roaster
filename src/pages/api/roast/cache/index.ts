export const prerender = false;

import type { APIRoute } from "astro";
import { cacheDb } from "@/lib/redis";

const MIN_CACHE_AGE_MS = 30 * 60 * 1000;

export const DELETE: APIRoute = async ({ request }) => {
  const key = new URL(request.url).searchParams.get("key");
  if (!key) {
    return new Response(JSON.stringify({ error: "key required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    const raw = await cacheDb.get(key);
    if (!raw) {
      return new Response(JSON.stringify({ error: "Cache not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    const cached = JSON.parse(raw) as { cachedAt?: string };
    const cachedAt = new Date(cached.cachedAt ?? 0).getTime();
    const now = Date.now();

    if (now - cachedAt < MIN_CACHE_AGE_MS) {
      const remaining = Math.ceil(
        (MIN_CACHE_AGE_MS - (now - cachedAt)) / 60000,
      );
      return new Response(
        JSON.stringify({
          error: `Wait ${remaining} more minutes before clearing cache`,
        }),
        { status: 403, headers: { "Content-Type": "application/json" } },
      );
    }

    await cacheDb.del(key);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
