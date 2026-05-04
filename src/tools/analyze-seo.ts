export const analyzeSeoTool = {
  type: "function",
  function: {
    name: "analyze_seo",
    description:
      "Analyze SEO: title tag, meta description, canonical URL, Open Graph, Twitter Cards, structured data (JSON-LD), heading hierarchy, internal links, mobile usability.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "URL to fetch and analyze (preferred — fetches live HTML)",
        },
        html: {
          type: "string",
          description: "Raw HTML content (fallback if url not provided)",
        },
      },
      required: [],
    },
  },
};
