export const analyzeHtmlStructureTool = {
  type: "function",
  function: {
    name: "analyze_html_structure",
    description:
      "Analyze HTML structure: semantic tags (header,nav,main,article,section,footer), doctype, lang attribute, meta charset, viewport, meta description, Open Graph tags.",
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
