export const prerender = false;

import type { APIRoute } from "astro";
import { categories, companyInfo } from "../info.ts";

export const GET: APIRoute = async () => {
  const CATEGORIES = categories.map((c) => c.id);

  const openapi = {
    openapi: "3.1.0",
    info: {
      title: "Roast Me API",
      description:
        "AI-powered website critique service. Get brutal, honest analysis of design, performance, SEO, UX, accessibility, security, and AI agent compatibility.\n\nThis is a **human-facing web application**. The API endpoints are internal and used exclusively by the frontend UI. They are not intended for public programmatic consumption and may change without notice.\n\nFor programmatic access, use the [MCP Server](https://stroncami.it/.well-known/mcp.json) at `/api/mcp`.",
      version: "1.0.0",
      contact: {
        name: companyInfo.name,
        url: companyInfo.contactUrl,
      },
      termsOfService: "https://stroncami.it/en/about",
      "x-humanFacingOnly": true,
    },
    servers: [
      {
        url: "https://stroncami.it",
        description: "Production server",
      },
    ],
    paths: {
      "/api/roast": {
        post: {
          summary: "Submit a website for analysis",
          description:
            "Submits a URL for AI-powered website analysis. Returns a job ID for polling. Requires Cloudflare Turnstile CAPTCHA token for bot protection.",
          operationId: "submitRoast",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["url"],
                  properties: {
                    url: {
                      type: "string",
                      format: "uri",
                      description: "The website URL to analyze",
                      example: "https://example.com",
                    },
                    categories: {
                      type: "array",
                      items: {
                        type: "string",
                        enum: CATEGORIES,
                      },
                      description: "Categories to analyze",
                      default: [
                        "design",
                        "performance",
                        "ux",
                        "seo",
                        "agentReadiness",
                      ],
                    },
                    locale: {
                      type: "string",
                      enum: [
                        "en",
                        "it",
                        "fr",
                        "es",
                        "pt",
                        "de",
                        "nl",
                        "ru",
                        "et",
                      ],
                      description: "Language for the roast result",
                      default: "en",
                    },
                    turnstileToken: {
                      type: "string",
                      description: "Cloudflare Turnstile CAPTCHA token",
                    },
                  },
                },
              },
            },
          },
          responses: {
            202: {
              description: "Job accepted for processing",
              content: {
                "application/json": {
                  schema: {
                    $ref: "#/components/schemas/JobResponse",
                  },
                },
              },
            },
            400: {
              description: "Bad request - URL required",
            },
            403: {
              description: "Forbidden - CAPTCHA verification failed",
            },
          },
          "x-rateLimit": {
            limit: 10,
            window: "1h",
            note: "Enforced via CAPTCHA and IP tracking",
          },
        },
        get: {
          summary: "Poll job status",
          description:
            "Poll the status of a roast job using the job ID returned from POST /api/roast.",
          operationId: "getJobStatus",
          parameters: [
            {
              name: "jobId",
              in: "query",
              required: true,
              schema: {
                type: "string",
                description: "The job ID returned from POST /api/roast",
              },
            },
          ],
          responses: {
            200: {
              description: "Job status",
            },
            400: {
              description: "Bad request - jobId required",
            },
            404: {
              description: "Job not found",
            },
          },
        },
      },
      "/api/mcp": {
        post: {
          summary: "MCP Server endpoint",
          description:
            "Model Context Protocol server endpoint for AI agent integration. This is the public, stable API for programmatic access.",
          operationId: "mcpEndpoint",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  $ref: "#/components/schemas/MCPRequest",
                },
              },
            },
          },
          responses: {
            200: {
              description: "MCP method result",
            },
            400: {
              description: "Bad request",
            },
          },
        },
      },
      "/api/summary": {
        get: {
          summary: "Get roast statistics summary",
          description: "Get aggregated statistics about all roasted websites.",
          operationId: "getSummary",
          parameters: [
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                default: 100,
                maximum: 500,
              },
              description: "Number of roasts to include",
            },
            {
              name: "results",
              in: "query",
              schema: {
                type: "boolean",
                default: false,
              },
              description: "Include full roast results",
            },
          ],
          responses: {
            200: {
              description: "Summary statistics",
            },
          },
        },
      },
      "/api/info": {
        get: {
          summary: "Get company and service information",
          description:
            "Retrieve information about Vicedomini Softworks, how the service works, and available analysis categories.",
          operationId: "getInfo",
          parameters: [
            {
              name: "type",
              in: "query",
              schema: {
                type: "string",
                enum: ["full", "minimal"],
                default: "full",
              },
              description: "Response type",
            },
          ],
          responses: {
            200: {
              description: "Company and service information",
            },
          },
        },
      },
      "/.well-known/mcp.json": {
        get: {
          summary: "MCP Server Configuration",
          description:
            "Model Context Protocol server configuration for AI agents.",
          responses: {
            200: {
              description: "MCP configuration",
            },
          },
        },
      },
      "/.well-known/agent.json": {
        get: {
          summary: "Agent Card (A2A)",
          description: "Google Agent2Agent format agent card.",
          responses: {
            200: {
              description: "Agent card",
            },
          },
        },
      },
      "/.well-known/api-catalog": {
        get: {
          summary: "API Catalog",
          description: "Human and machine-readable API catalog.",
          responses: {
            200: {
              description: "API catalog",
            },
          },
        },
      },
    },
    components: {
      schemas: {
        JobResponse: {
          type: "object",
          properties: {
            jobId: { type: "string", description: "Unique job identifier" },
            status: {
              type: "string",
              enum: ["pending", "processing", "resuming"],
              description: "Current job status",
            },
            cached: {
              type: "boolean",
              description: "Whether result was served from cache",
            },
          },
        },
        JobStatusResponse: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["pending", "processing", "completed", "failed"],
              description: "Job status",
            },
            progress: {
              type: "string",
              description: "Current progress message",
            },
            result: { type: "object", nullable: true },
            error: { type: "string", nullable: true },
          },
        },
        MCPRequest: {
          type: "object",
          required: ["method"],
          properties: {
            method: {
              type: "string",
              enum: [
                "initialize",
                "analyzeWebsite",
                "getRoastResult",
                "listRecentRoasts",
                "getRoastWithLocale",
              ],
            },
            params: {
              type: "object",
              properties: {
                url: { type: "string" },
                jobId: { type: "string" },
                rankingId: { type: "string" },
                limit: { type: "number" },
                categories: { type: "array", items: { type: "string" } },
                locale: { type: "string" },
              },
            },
          },
        },
        MCPResponse: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            result: { type: "object" },
            note: { type: "string" },
          },
        },
        McpConfig: {
          type: "object",
          properties: {
            mcpServers: {
              type: "object",
              additionalProperties: {
                type: "object",
                properties: {
                  url: { type: "string" },
                  type: { type: "string" },
                  description: { type: "string" },
                  auth: { type: "string" },
                },
              },
            },
          },
        },
        AgentCard: {
          type: "object",
          properties: {
            name: { type: "string" },
            version: { type: "string" },
            description: { type: "string" },
            instructions: { type: "string" },
            skills: { type: "array", items: { type: "object" } },
            endpoints: { type: "array", items: { type: "object" } },
            capabilities: { type: "array", items: { type: "string" } },
            documentation: { type: "string" },
            contact: { type: "object" },
          },
        },
      },
    },
    "x-agentInstructions": {
      summary: "How to use this API as an AI agent",
      steps: [
        "1. Discover the MCP server at /.well-known/mcp.json or /.well-known/agent.json",
        "2. Use the MCP endpoint at /api/mcp for programmatic access",
        "3. Call 'initialize' to get server info and available methods",
        "4. Use 'analyzeWebsite' to submit a URL for analysis",
        "5. Poll 'getRoastResult' with the returned jobId until status is 'completed'",
        "6. Use 'listRecentRoasts' to browse recently analyzed websites",
      ],
      note: "The /api/roast endpoint is internal and requires CAPTCHA. Use /api/mcp for agent integration.",
    },
  };

  return new Response(JSON.stringify(openapi, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
