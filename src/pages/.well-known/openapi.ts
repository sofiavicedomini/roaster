import { categories } from "@/pages/api/info.ts";

const CATEGORIES = categories.map(c => c.id);

export async function GET() {
    const openapi = {
        openapi: "3.1.0",
        info: {
            title: "Roast Me API",
            description: "AI-powered website critique service. Get brutal, honest analysis of design, performance, SEO, UX, accessibility, security, and AI agent compatibility.\n\nThis is a **human-facing web application**. The API endpoints are internal and used exclusively by the frontend UI. They are not intended for public programmatic consumption and may change without notice.\n\nFor programmatic access, use the [MCP Server](https://stroncami.it/.well-known/mcp.json) at `/api/mcp`.",
            version: "1.0.0",
            contact: {
                name: "Vicedomini Softworks",
                url: "https://vicedominisoftworks.com"
            },
            termsOfService: "https://stroncami.it/en/about",
            "x-humanFacingOnly": true
        },
        servers: [
            {
                url: "https://stroncami.it",
                description: "Production server"
            }
        ],
        paths: {
            "/api/roast": {
                post: {
                    summary: "Submit a website for analysis",
                    description: "Submits a URL for AI-powered website analysis. Returns a job ID for polling. Requires Cloudflare Turnstile CAPTCHA token for bot protection.",
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
                                            example: "https://example.com"
                                        },
                                        categories: {
                                            type: "array",
                                            items: {
                                                type: "string",
                                                enum: CATEGORIES
                                            },
                                            description: "Categories to analyze",
                                            default: ["design", "performance", "ux", "seo", "agentReadiness"]
                                        },
                                        locale: {
                                            type: "string",
                                            enum: ["en", "it", "fr", "es", "pt", "de", "nl", "ru", "et"],
                                            description: "Language for the roast result",
                                            default: "en"
                                        },
                                        turnstileToken: {
                                            type: "string",
                                            description: "Cloudflare Turnstile CAPTCHA token"
                                        }
                                    }
                                }
                            }
                        }
                    },
                    responses: {
                        202: {
                            description: "Job accepted for processing",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/JobResponse"
                                    }
                                }
                            }
                        },
                        400: {
                            description: "Bad request - URL required",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/ErrorResponse"
                                    }
                                }
                            }
                        },
                        403: {
                            description: "Forbidden - CAPTCHA verification failed",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/ErrorResponse"
                                    }
                                }
                            }
                        }
                    },
                    "x-rateLimit": {
                        limit: 10,
                        window: "1h",
                        note: "Enforced via CAPTCHA and IP tracking"
                    }
                },
                get: {
                    summary: "Poll job status",
                    description: "Poll the status of a roast job using the job ID returned from POST /api/roast.",
                    operationId: "getJobStatus",
                    parameters: [
                        {
                            name: "jobId",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string",
                                description: "The job ID returned from POST /api/roast"
                            }
                        }
                    ],
                    responses: {
                        200: {
                            description: "Job status",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/JobStatusResponse"
                                    }
                                }
                            }
                        },
                        400: {
                            description: "Bad request - jobId required",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/ErrorResponse"
                                    }
                                }
                            }
                        },
                        404: {
                            description: "Job not found",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/ErrorResponse"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/mcp": {
                post: {
                    summary: "MCP Server endpoint",
                    description: "Model Context Protocol server endpoint for AI agent integration. This is the public, stable API for programmatic access.",
                    operationId: "mcpEndpoint",
                    requestBody: {
                        required: true,
                        content: {
                            "application/json": {
                                schema: {
                                    $ref: "#/components/schemas/MCPRequest"
                                }
                            }
                        }
                    },
                    responses: {
                        200: {
                            description: "MCP method result",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/MCPResponse"
                                    }
                                }
                            }
                        },
                        400: {
                            description: "Bad request",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/ErrorResponse"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/roast/cache": {
                delete: {
                    summary: "Clear cached result",
                    description: "Clear a cached roast result by cache key. Only available for old caches (>30 min).",
                    operationId: "clearCache",
                    parameters: [
                        {
                            name: "key",
                            in: "query",
                            required: true,
                            schema: {
                                type: "string",
                                description: "The cache key to delete"
                            }
                        }
                    ],
                    responses: {
                        200: {
                            description: "Cache cleared",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/CacheClearResponse"
                                    }
                                }
                            }
                        },
                        400: {
                            description: "Bad request - key required or cache not old enough"
                        }
                    }
                }
            },
            "/.well-known/mcp.json": {
                get: {
                    summary: "MCP Server Configuration",
                    description: "Model Context Protocol server configuration for AI agents.",
                    operationId: "getMcpConfig",
                    responses: {
                        200: {
                            description: "MCP configuration",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/McpConfig"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/.well-known/agent.json": {
                get: {
                    summary: "Agent Card (A2A)",
                    description: "Google Agent2Agent format agent card.",
                    operationId: "getAgentCard",
                    responses: {
                        200: {
                            description: "Agent card",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/AgentCard"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/.well-known/api-catalog": {
                get: {
                    summary: "API Catalog",
                    description: "Human and machine-readable API catalog.",
                    operationId: "getApiCatalog",
                    responses: {
                        200: {
                            description: "API catalog",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/ApiCatalog"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/summary": {
                get: {
                    summary: "Get roast statistics summary",
                    description: "Get aggregated statistics about all roasted websites including averages, score distributions, and top/lowest rated sites.",
                    operationId: "getSummary",
                    parameters: [
                        {
                            name: "limit",
                            in: "query",
                            schema: {
                                type: "integer",
                                default: 100,
                                maximum: 500
                            },
                            description: "Number of roasts to include in the response"
                        },
                        {
                            name: "results",
                            in: "query",
                            schema: {
                                type: "boolean",
                                default: false
                            },
                            description: "Include full roast results in the response"
                        }
                    ],
                    responses: {
                        200: {
                            description: "Summary statistics",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/SummaryResponse"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/info": {
                get: {
                    summary: "Get company and service information",
                    description: "Retrieve information about Vicedomini Softworks, how the service works, and available analysis categories.",
                    operationId: "getInfo",
                    parameters: [
                        {
                            name: "type",
                            in: "query",
                            schema: {
                                type: "string",
                                enum: ["full", "minimal"],
                                default: "full"
                            },
                            description: "Response type - 'full' includes all details, 'minimal' includes only essential info"
                        }
                    ],
                    responses: {
                        200: {
                            description: "Company and service information",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/InfoResponse"
                                    }
                                }
                            }
                        }
                    }
                }
            },
            "/api/company-info": {
                get: {
                    summary: "Get company legal information",
                    description: "Retrieve legal information about Vicedomini Softworks srl including P.IVA, REA, registered office, and share capital. Data is cached for 7 days.",
                    operationId: "getCompanyLegalInfo",
                    responses: {
                        200: {
                            description: "Company legal information",
                            content: {
                                "application/json": {
                                    schema: {
                                        $ref: "#/components/schemas/CompanyLegalInfoResponse"
                                    }
                                }
                            }
                        },
                        "x-cache": {
                            ttl: 604800,
                            note: "Data cached for 7 days in Redis"
                        }
                    }
                }
            }
        },
        components: {
            schemas: {
                JobResponse: {
                    type: "object",
                    properties: {
                        jobId: {
                            type: "string",
                            description: "Unique job identifier"
                        },
                        status: {
                            type: "string",
                            enum: ["pending", "processing", "resuming"],
                            description: "Current job status"
                        },
                        cached: {
                            type: "boolean",
                            description: "Whether result was served from cache"
                        }
                    }
                },
                JobStatusResponse: {
                    type: "object",
                    properties: {
                        status: {
                            type: "string",
                            enum: ["pending", "processing", "completed", "failed"],
                            description: "Job status"
                        },
                        progress: {
                            type: "string",
                            description: "Current progress message"
                        },
                        result: {
                            $ref: "#/components/schemas/RoastResult",
                            nullable: true
                        },
                        error: {
                            type: "string",
                            nullable: true
                        }
                    }
                },
                RoastResult: {
                    type: "object",
                    properties: {
                        overall_score: {
                            type: "number",
                            description: "Overall score 1-10"
                        },
                        verdict: {
                            type: "string",
                            description: "One-sentence summary"
                        },
                        scores: {
                            type: "object",
                            additionalProperties: {
                                type: "number",
                                nullable: true
                            },
                            description: "Scores by category"
                        },
                        roasts: {
                            type: "array",
                            items: {
                                $ref: "#/components/schemas/RoastEntry"
                            }
                        },
                        cached: {
                            type: "boolean"
                        },
                        cachedAt: {
                            type: "string",
                            format: "date-time"
                        },
                        rankingId: {
                            type: "string"
                        }
                    }
                },
                RoastEntry: {
                    type: "object",
                    properties: {
                        category: { type: "string" },
                        emoji: { type: "string" },
                        critique: { type: "string" },
                        fix_prompt: { type: "string" }
                    }
                },
                ErrorResponse: {
                    type: "object",
                    properties: {
                        error: { type: "string" },
                        captchaError: { type: "boolean" }
                    }
                },
                MCPRequest: {
                    type: "object",
                    required: ["method"],
                    properties: {
                        method: {
                            type: "string",
                            enum: ["initialize", "analyzeWebsite", "getRoastResult", "listRecentRoasts"]
                        },
                        params: {
                            type: "object",
                            properties: {
                                url: { type: "string" },
                                jobId: { type: "string" },
                                limit: { type: "number" },
                                categories: {
                                    type: "array",
                                    items: { type: "string", enum: CATEGORIES }
                                },
                                locale: { type: "string" }
                            }
                        }
                    }
                },
                MCPResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        result: { type: "object" },
                        note: { type: "string" }
                    }
                },
                CacheClearResponse: {
                    type: "object",
                    properties: {
                        success: { type: "boolean" },
                        message: { type: "string" }
                    }
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
                                    auth: { type: "string" }
                                }
                            }
                        }
                    }
                },
                AgentCard: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        version: { type: "string" },
                        description: { type: "string" },
                        instructions: { type: "string" },
                        skills: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    description: { type: "string" },
                                    endpoint: { type: "string" },
                                    method: { type: "string" }
                                }
                            }
                        },
                        endpoints: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    url: { type: "string" },
                                    protocol: { type: "string" },
                                    transport: { type: "string" }
                                }
                            }
                        },
                        capabilities: {
                            type: "array",
                            items: { type: "string" }
                        },
                        documentation: { type: "string" },
                        contact: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                url: { type: "string" }
                            }
                        }
                    }
                },
                ApiCatalog: {
                    type: "object",
                    properties: {
                        description: { type: "string" },
                        note: { type: "string" },
                        apis: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    description: { type: "string" },
                                    url: { type: "string" },
                                    methods: { type: "array", items: { type: "string" } },
                                    public: { type: "boolean" },
                                    authentication: { type: "string" },
                                    rateLimit: { type: "string" },
                                    documentation: { type: "string" }
                                }
                            }
                        },
                        humanInterface: {
                            type: "object",
                            properties: {
                                url: { type: "string" },
                                description: { type: "string" }
                            }
                        },
                        contentNegotiation: {
                            type: "object",
                            properties: {
                                endpoint: { type: "string" },
                                formats: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            accept: { type: "string" },
                                            returns: { type: "string" }
                                        }
                                    }
                                }
                            }
                        },
                        agentDiscovery: {
                            type: "object",
                            properties: {
                                mcp: { type: "string" },
                                agentCard: { type: "string" },
                                openapi: { type: "string" },
                                instructions: { type: "string" }
                            }
                        }
                    }
                },
                SummaryResponse: {
                    type: "object",
                    properties: {
                        metadata: {
                            type: "object",
                            properties: {
                                totalRoasts: { type: "integer" },
                                displayedRoasts: { type: "integer" },
                                averageScore: { type: "number" },
                                generatedAt: { type: "string", format: "date-time" },
                                version: { type: "string" }
                            }
                        },
                        statistics: {
                            type: "object",
                            properties: {
                                scoreDistribution: {
                                    type: "object",
                                    properties: {
                                        excellent: { type: "integer" },
                                        good: { type: "integer" },
                                        fair: { type: "integer" },
                                        poor: { type: "integer" },
                                        terrible: { type: "integer" }
                                    }
                                },
                                topCategories: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            category: { type: "string" },
                                            count: { type: "integer" }
                                        }
                                    }
                                }
                            }
                        },
                        rankings: {
                            type: "object",
                            properties: {
                                topRated: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            url: { type: "string" },
                                            score: { type: "number" },
                                            verdict: { type: "string" }
                                        }
                                    }
                                },
                                lowestRated: {
                                    type: "array",
                                    items: {
                                        type: "object",
                                        properties: {
                                            url: { type: "string" },
                                            score: { type: "number" },
                                            verdict: { type: "string" }
                                        }
                                    }
                                }
                            }
                        },
                        recentRoasts: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    uuid: { type: "string" },
                                    url: { type: "string" },
                                    score: { type: "number" },
                                    verdict: { type: "string" },
                                    completedAt: { type: "string", format: "date-time" },
                                    result: { type: "object" }
                                }
                            }
                        }
                    }
                },
                AgentCardFull: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        version: { type: "string" },
                        description: { type: "string" },
                        instructions: { type: "string" },
                        skills: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    description: { type: "string" },
                                    endpoint: { type: "string" },
                                    method: { type: "string" }
                                }
                            }
                        },
                        endpoints: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    url: { type: "string" },
                                    protocol: { type: "string" },
                                    transport: { type: "string" }
                                }
                            }
                        },
                        capabilities: {
                            type: "array",
                            items: { type: "string" }
                        },
                        documentation: { type: "string" },
                        contact: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                url: { type: "string" }
                            }
                        },
                        about: {
                            type: "object",
                            properties: {
                                company: { type: "string" },
                                mission: { type: "string" },
                                location: { type: "string" },
                                services: { type: "string" },
                                contactUrl: { type: "string" }
                            }
                        },
                        howItWorks: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    step: { type: "integer" },
                                    title: { type: "string" },
                                    description: { type: "string" }
                                }
                            }
                        }
                    }
                },
                InfoResponse: {
                    type: "object",
                    properties: {
                        company: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                legalName: { type: "string" },
                                description: { type: "string" },
                                mission: { type: "string" },
                                location: { type: "string" },
                                address: { type: "string" },
                                postalCode: { type: "string" },
                                city: { type: "string" },
                                country: { type: "string" },
                                piva: { type: "string" },
                                rea: { type: "string" },
                                capital: { type: "string" },
                                fullLegalAddress: { type: "string" },
                                team: { type: "string" },
                                services: { type: "string" },
                                contactUrl: { type: "string" },
                                founded: { type: "string" }
                            }
                        },
                        howItWorks: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    step: { type: "integer" },
                                    title: { type: "string" },
                                    description: { type: "string" },
                                    details: { type: "string" }
                                }
                            }
                        },
                        categories: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    id: { type: "string" },
                                    name: { type: "string" },
                                    description: { type: "string" }
                                }
                            }
                        },
                        metadata: {
                            type: "object",
                            properties: {
                                version: { type: "string" },
                                generatedAt: { type: "string", format: "date-time" }
                            }
                        }
                    }
                },
                CompanyLegalInfoResponse: {
                    type: "object",
                    properties: {
                        company: {
                            type: "object",
                            properties: {
                                name: { type: "string" },
                                legalName: { type: "string" },
                                address: { type: "string" },
                                postalCode: { type: "string" },
                                city: { type: "string" },
                                country: { type: "string" },
                                piva: { type: "string" },
                                rea: { type: "string" },
                                capital: { type: "string" },
                                fullAddress: { type: "string" },
                                website: { type: "string" },
                                fetchedAt: { type: "string", format: "date-time" }
                            }
                        },
                        metadata: {
                            type: "object",
                            properties: {
                                source: { type: "string" },
                                cached: { type: "boolean" },
                                generatedAt: { type: "string", format: "date-time" },
                                expiresAt: { type: "string", format: "date-time" }
                            }
                        }
                    }
                }
            }
        },
        "x-agentInstructions": {
            summary: "How to use this API as an AI agent",
            steps: [
                "1. Discover the MCP server at /.well-known/mcp.json or /.well-known/agent.json",
                "2. Use the MCP endpoint at /api/mcp for programmatic access",
                "3. Call 'initialize' to get server info and available methods",
                "4. Use 'analyzeWebsite' to submit a URL for analysis",
                "5. Poll 'getRoastResult' with the returned jobId until status is 'completed'",
                "6. Use 'listRecentRoasts' to browse recently analyzed websites"
            ],
            note: "The /api/roast endpoint is internal and requires CAPTCHA. Use /api/mcp for agent integration."
        }
    };

    return new Response(JSON.stringify(openapi), {
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=3600",
        },
    });
}