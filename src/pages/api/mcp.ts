export const prerender = false;

import type { APIRoute } from "astro";
import { getRankings, getRanking } from "@/lib/redis";

interface MCPRequest {
  method: string;
  params?: {
    url?: string;
    jobId?: string;
    rankingId?: string;
    locale?: string;
    limit?: number;
    categories?: string[];
  };
}

interface MCPServerInfo {
  name: string;
  version: string;
  description: string;
  endpoints: Array<{
    name: string;
    description: string;
    method: string;
    parameters: Record<
      string,
      { type: string; description: string; required: boolean }
    >;
  }>;
}

const SERVER_INFO: MCPServerInfo = {
  name: "Roast Me MCP Server",
  version: "1.0.0",
  description:
    "AI-powered website critique service. Analyze websites for design, performance, SEO, UX, accessibility, security, and AI agent compatibility.",
  endpoints: [
    {
      name: "analyzeWebsite",
      description:
        "Submit a website URL for comprehensive AI analysis and receive a brutal, honest roast",
      method: "POST",
      parameters: {
        url: {
          type: "string",
          description: "The website URL to analyze (e.g., https://example.com)",
          required: true,
        },
        categories: {
          type: "array",
          description:
            "Categories to analyze: design, performance, code, mobile, ux, accessibility, conversion, seo, copy, brand, credibility, security, agentReadiness, robots, mcp, apiDiscovery, botAuth",
          required: false,
        },
        locale: {
          type: "string",
          description:
            "Language for the roast result (en, it, fr, es, pt, de, nl, ru, et)",
          required: false,
        },
      },
    },
    {
      name: "getRoastResult",
      description:
        "Retrieve a completed roast result by job ID or ranking UUID. For detailed roasts, user must access the ranking page directly.",
      method: "POST",
      parameters: {
        jobId: {
          type: "string",
          description: "The job ID or ranking UUID to retrieve",
          required: true,
        },
      },
    },
    {
      name: "listRecentRoasts",
      description:
        "Get a list of recently analyzed websites with their scores and verdicts",
      method: "POST",
      parameters: {
        limit: {
          type: "number",
          description:
            "Number of recent roasts to return (default: 10, max: 50)",
          required: false,
        },
      },
    },
    {
      name: "getRoastWithLocale",
      description:
        "Get instructions for accessing a roast in the user's preferred language. Returns the ranking URL and available language options.",
      method: "POST",
      parameters: {
        rankingId: {
          type: "string",
          description: "The ranking UUID to access",
          required: true,
        },
        userLanguage: {
          type: "string",
          description: "User's preferred language for instructions",
          required: false,
        },
      },
    },
  ],
};

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as MCPRequest;
    const { method, params } = body;

    if (!method) {
      return new Response(
        JSON.stringify({
          error: "Method parameter required",
          availableMethods: Object.keys(SERVER_INFO.endpoints).map(
            (_, i) => SERVER_INFO.endpoints[i].name,
          ),
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    switch (method) {
      case "analyzeWebsite": {
        if (!params?.url) {
          return new Response(
            JSON.stringify({
              error: "URL parameter required for analyzeWebsite",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            success: false,
            error: "Remote analysis not available",
            message:
              "The analyzeWebsite method cannot be executed remotely because it requires human interaction (CAPTCHA verification).",
            instructions: {
              en: "Please visit https://stroncami.it and use the web interface to analyze the website. Click 'Roast Me', enter the URL, complete the CAPTCHA, and submit.",
              it: "Visitare https://stroncami.it e usare l'interfaccia web per analizzare il sito. Cliccare 'Roast Me', inserire l'URL, completare il CAPTCHA e inviare.",
              action:
                "Open https://stroncami.it in a web browser and manually submit the URL for analysis.",
            },
            url: params.url,
            note: "This is a human-facing web application. The analysis requires CAPTCHA protection against automated abuse.",
          }),
          {
            status: 400,
            headers: {
              "Content-Type": "application/json",
              "X-MCP-Method": "analyzeWebsite",
            },
          },
        );
      }

      case "getRoastResult": {
        if (!params?.jobId) {
          return new Response(
            JSON.stringify({
              error: "jobId parameter required for getRoastResult",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const response = await fetch(
          `https://stroncami.it/api/roast?jobId=${encodeURIComponent(params.jobId)}`,
        );
        const data = await response.json();

        return new Response(
          JSON.stringify({
            success: true,
            result: data,
          }),
          {
            status: response.status,
            headers: {
              "Content-Type": "application/json",
              "X-MCP-Method": "getRoastResult",
            },
          },
        );
      }

      case "listRecentRoasts": {
        const limit = Math.min(params?.limit || 10, 50);
        const roasts = await getRankings(limit);

        return new Response(
          JSON.stringify({
            success: true,
            result: {
              count: roasts.filter(Boolean).length,
              roasts: roasts.filter(Boolean),
            },
            metadata: {
              server: SERVER_INFO.name,
              version: SERVER_INFO.version,
              timestamp: new Date().toISOString(),
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-MCP-Method": "listRecentRoasts",
            },
          },
        );
      }

      case "getRoastWithLocale": {
        if (!params?.rankingId) {
          return new Response(
            JSON.stringify({
              error: "rankingId parameter required for getRoastWithLocale",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const ranking = await getRanking(params.rankingId);
        if (!ranking) {
          return new Response(JSON.stringify({ error: "Ranking not found" }), {
            status: 404,
            headers: { "Content-Type": "application/json" },
          });
        }

        const localeNames: Record<string, string> = {
          en: "English",
          it: "Italiano",
          fr: "Français",
          es: "Español",
          pt: "Portuguguês",
          de: "Deutsch",
          nl: "Nederlands",
          ru: "Русский",
          et: "Eesti",
        };

        const availableLocales = [
          "en",
          "it",
          "fr",
          "es",
          "pt",
          "de",
          "nl",
          "ru",
          "et",
        ];
        const rankingLocale = ranking.locale || "en";

        // Build language options with links
        const languageOptions = availableLocales.map((loc) => ({
          locale: loc,
          name: localeNames[loc] || loc,
          url: `https://stroncami.it/${loc}/rankings/${params.rankingId}`,
          recommended: loc === rankingLocale,
        }));

        return new Response(
          JSON.stringify({
            success: true,
            result: {
              rankingId: params.rankingId,
              url: ranking.normUrl || ranking.url,
              score: ranking.score,
              verdict: ranking.verdict,
              completedAt: ranking.completedAt,
              instructions: {
                message:
                  "To view the full roast details, please open one of the language-specific ranking pages below. Select the language that best matches your preference or the language you want the roast displayed in.",
                action:
                  "Open the URL that corresponds to your preferred language in a web browser to see the complete roast analysis with scores, critiques, and fix prompts.",
              },
              languageOptions,
            },
            metadata: {
              server: SERVER_INFO.name,
              version: SERVER_INFO.version,
              timestamp: new Date().toISOString(),
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-MCP-Method": "getRoastWithLocale",
            },
          },
        );
      }

      case "initialize": {
        return new Response(
          JSON.stringify({
            success: true,
            result: SERVER_INFO,
            protocolVersion: "1.0.0",
            capabilities: {
              tools: true,
              resources: true,
              prompts: false,
            },
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "X-MCP-Method": "initialize",
            },
          },
        );
      }

      default:
        return new Response(
          JSON.stringify({
            error: `Unknown method: ${method}`,
            availableMethods: SERVER_INFO.endpoints.map((e) => e.name),
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
    }
  } catch (err) {
    console.error("[MCP API] Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal server error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const path = url.pathname;

  if (path === "/api/mcp/info") {
    return new Response(
      JSON.stringify({
        server: SERVER_INFO,
        documentation: "https://stroncami.it/en/how-it-works",
        wellKnownFiles: {
          "agent.json": "https://stroncami.it/.well-known/agent.json",
          "mcp.json": "https://stroncami.it/.well-known/mcp.json",
          "api-catalog": "https://stroncami.it/.well-known/api-catalog",
          openapi: "https://stroncami.it/.well-known/openapi.json",
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({
      error: "Use POST for MCP methods",
      availableMethods: SERVER_INFO.endpoints.map((e) => e.name),
      info: "/api/mcp/info",
    }),
    { status: 405, headers: { "Content-Type": "application/json" } },
  );
};
