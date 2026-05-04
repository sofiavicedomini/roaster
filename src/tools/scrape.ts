export const scrapeUrlTool = {
  type: "function",
  function: {
    name: "scrape_url",
    description:
      "Fetch and fully render a URL using headless Chrome (JS executed, networkidle). Returns structured page content: title, meta, Open Graph, JSON-LD, headings, visible text, links, images, forms, scripts, stylesheets, and real browser timing (TTFB, DOMContentLoaded, Load). Falls back to plain HTTP fetch if Chrome fails. Use for homepage, pricing page, about page, etc.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Absolute URL to fetch" },
      },
      required: ["url"],
    },
  },
};
