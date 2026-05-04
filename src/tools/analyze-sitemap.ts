export const analyzeSitemapTool = {
  type: "function",
  function: {
    name: "analyze_sitemap",
    description: "Parse sitemap.xml: URLs listed, lastmod dates, change frequencies, priorities. Identify broken URLs, missing lastmod, outdated content, sitemap index structure.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Target sitemap URL" },
      },
      required: ["url"],
    },
  },
};