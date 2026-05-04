export const analyzeHtmlStructureTool = {
  type: "function",
  function: {
    name: "analyze_html_structure",
    description: "Analyze HTML structure: semantic tags (header,nav,main,article,section,footer), doctype, lang attribute, meta charset, viewport, meta description, Open Graph tags.",
    parameters: {
      type: "object",
      properties: {
        html: { type: "string", description: "Raw HTML content to analyze" },
      },
      required: ["html"],
    },
  },
};