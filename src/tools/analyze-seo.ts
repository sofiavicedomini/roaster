export const analyzeSeoTool = {
  type: "function",
  function: {
    name: "analyze_seo",
    description: "Analyze SEO: title tag, meta description, canonical URL, Open Graph, Twitter Cards, structured data (JSON-LD), heading hierarchy, internal links, mobile usability.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Raw HTML content to analyze" },
        url: { type: "string", description: "Page URL for context" },
      },
      required: ["html", "url"],
    },
  },
};