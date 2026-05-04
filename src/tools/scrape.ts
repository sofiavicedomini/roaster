export const scrapeUrlTool = {
  type: "function",
  function: {
    name: "scrape_url",
    description: "Fetch the content of a URL to gather real evidence: homepage HTML, robots.txt, sitemap.xml, llms.txt, CSS, JS, etc. Returns raw content (truncated if large). Call this multiple times to build evidence.",
    parameters: {
      type: "object",
      properties: {
        url: { type: "string", description: "Absolute URL to fetch" },
      },
      required: ["url"],
    },
  },
};