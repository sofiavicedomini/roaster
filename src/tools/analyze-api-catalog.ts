export const analyzeApiCatalogTool = {
  type: "function",
  function: {
    name: "analyze_api_catalog",
    description: "Check API Catalog at .well-known/api-catalog. Discover APIs, OpenAPI/Swagger specs, endpoints. Central registry for agent API discovery.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target origin to check for API Catalog" },
      },
      required: ["url"],
    },
  },
};