export const prerender = false;

import type { APIRoute } from "astro";
import { categories } from "../info.ts";

export const GET: APIRoute = async () => {
  const data = {
    description: "Roast Me — API Catalog",
    note: "This is a human-facing web application. The /api/roast endpoint is internal and used exclusively by the frontend UI. For programmatic access, use the MCP Server at /api/mcp.",
    apis: [
      {
        id: "mcp-public",
        name: "MCP Server (Public)",
        description:
          "Model Context Protocol server for AI agent integration. Stable, public API for programmatic access.",
        url: "/api/mcp",
        methods: ["POST"],
        public: true,
        authentication: "None required",
        rateLimit: "None enforced",
        documentation: "https://stroncami.it/.well-known/openapi.json",
        methods_detail: [
          "initialize",
          "analyzeWebsite",
          "getRoastResult",
          "listRecentRoasts",
          "getRoastWithLocale",
        ],
      },
      {
        id: "summary-public",
        name: "Summary API",
        description:
          "Get aggregated statistics about all roasted websites including averages, score distributions, and top/lowest rated sites.",
        url: "/api/summary",
        methods: ["GET"],
        public: true,
        authentication: "None required",
        rateLimit: "None enforced",
        documentation: "https://stroncami.it/.well-known/openapi.json",
      },
      {
        id: "info-public",
        name: "Info API",
        description:
          "Get company information (including legal data), how the service works, and available analysis categories.",
        url: "/api/info",
        methods: ["GET"],
        public: true,
        authentication: "None required",
        rateLimit: "None enforced",
        documentation: "https://stroncami.it/.well-known/openapi.json",
        categories: categories.map((c) => c.id),
      },
      {
        id: "company-info-public",
        name: "Company Legal Info API",
        description:
          "Get legal information about Vicedomini Softworks srl (P.IVA, REA, registered office, share capital).",
        url: "/api/company-info",
        methods: ["GET"],
        public: true,
        authentication: "None required",
        rateLimit: "None enforced",
        cacheTTL: "7 days (604800 seconds)",
        documentation: "https://stroncami.it/.well-known/openapi.json",
      },
      {
        id: "roast-internal",
        name: "Roast Internal API",
        description:
          "Internal endpoint used by the Roast Me UI. Submits a URL for AI-powered analysis. Not intended for public use.",
        url: "/api/roast",
        methods: ["POST", "GET"],
        public: false,
        authentication: "Cloudflare Turnstile CAPTCHA (bot protection)",
        rateLimit: "Enforced — use the MCP server instead",
      },
    ],
    humanInterface: {
      url: "https://stroncami.it",
      description:
        "Use the web UI to analyze websites. Results are available as JSON or Markdown via content negotiation on individual ranking pages (/[lang]/rankings/[uuid]) by sending Accept: application/json or Accept: text/markdown.",
    },
    contentNegotiation: {
      endpoint: "/[lang]/rankings/[uuid]",
      formats: [
        { accept: "text/html", returns: "Full HTML page (default)" },
        { accept: "application/json", returns: "Raw roast result as JSON" },
        {
          accept: "application/vnd.api+json",
          returns: "Raw roast result with agent metadata",
        },
        { accept: "text/markdown", returns: "Roast report as Markdown" },
      ],
    },
    agentDiscovery: {
      mcp: "/.well-known/mcp.json",
      agentCard: "/.well-known/agent.json",
      openapi: "/.well-known/openapi.json",
      apiCatalog: "/.well-known/api-catalog",
      instructions:
        "AI agents should discover the MCP server at /.well-known/mcp.json and use /api/mcp for all API interactions. Use /api/summary for statistics and /api/info for company/service information.",
    },
    headers: {
      "X-Content-Signals": "agent-readable=true",
      "X-MCP-Endpoint": "https://stroncami.it/api/mcp",
      Link: '</.well-known/mcp.json>; rel="mcp", </.well-known/agent.json>; rel="agent-card", </.well-known/openapi.json>; rel="service-desc"',
    },
  };

  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
