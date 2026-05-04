export const analyzePerformanceTool = {
  type: "function",
  function: {
    name: "analyze_performance",
    description:
      "Analyze performance: real browser metrics (TTFB, DOMContentLoaded, Load time), network resource counts, render-blocking resources, missing lazy loading, unoptimized images. Pass url for real browser metrics via headless Chrome; optionally pass html for static analysis.",
    parameters: {
      type: "object",
      properties: {
        url: {
          type: "string",
          description:
            "URL to fetch and measure with headless Chrome (preferred — gives real TTFB, load time, resource counts)",
        },
        html: {
          type: "string",
          description:
            "Raw HTML to analyze statically (used if url not provided or Puppeteer fails)",
        },
      },
      required: [],
    },
  },
};
