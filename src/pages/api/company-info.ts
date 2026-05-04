import type { APIRoute } from "astro";
import { cacheDb } from "@/lib/redis";
import {companyInfo} from "@/pages/api/info.ts";

const CACHE_KEY = "company:legal-info";
const CACHE_TTL = 7 * 24 * 3600; // 7 days

const companyLegalInfo = {...companyInfo, fetchedAt: new Date('2026-05-04')};

export const GET: APIRoute = async () => {
  try {
    // Try to get from cache first
    const cached = await cacheDb.get(CACHE_KEY);
    if (cached) {
      return new Response(cached, {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=604800"
        }
      });
    }

    // If not cached, return the static data and cache it
    const responseData = JSON.stringify({
      company: companyLegalInfo,
      metadata: {
        source: "vicedominisoftworks.com",
        cached: false,
        generatedAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + CACHE_TTL * 1000).toISOString()
      }
    }, null, 2);

    // Cache the data
    await cacheDb.setex(CACHE_KEY, CACHE_TTL, responseData);

    return new Response(responseData, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=604800",
        "X-Cache": "MISS"
      }
    });
  } catch (err) {
    console.error("[Company Info API] Error:", err);
    
    // Fallback to static data even if Redis fails
    const fallbackResponse = JSON.stringify({
      company: companyLegalInfo,
      metadata: {
        source: "vicedominisoftworks.com",
        cached: false,
        fallback: true,
        generatedAt: new Date().toISOString()
      }
    }, null, 2);

    return new Response(fallbackResponse, {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8"
      }
    });
  }
};
