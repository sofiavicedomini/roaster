export const prerender = false;

import type { APIRoute } from "astro";

export const companyInfo = {
  name: "Vicedomini Softworks",
  legalName: "Vicedomini Softworks srl",
  description:
    "An Italian software company that builds things people actually use.",
  mission:
    "Where Engineering Meets Care. Software engineering — from domain to deploy.",
  location: "Italy",
  address: "Circonvallazione Clodia 163/167",
  postalCode: "00195",
  city: "Roma",
  country: "Italia",
  piva: "IT 18432801001",
  rea: "RM-1784316",
  capital: "€ 100,00 i.v.",
  fullLegalAddress: "Circonvallazione Clodia 163/167, 00195 Roma, Italy, EU",
  team: "Based in Italy & Europe. Powered by curiosity, strong coffee, and a deep contempt for bad UX. We build web apps, sites, and custom software for clients who aren't afraid of the truth.",
  services: "Web apps, sites, and custom software development",
  contactUrl: "https://vicedominisoftworks.com",
  founded: "2024",
};

export const howItWorks = [
  {
    step: 1,
    title: "Enter your URL",
    description:
      "Paste any public website address. If it's your own site, brace yourself.",
    details:
      "The URL must be a valid, publicly accessible website. The AI will analyze whatever it can reach.",
  },
  {
    step: 2,
    title: "AI Scrapes & Analyzes",
    description:
      "Our AI fetches your site's content, checks robots.txt, sitemap, performance, agent compatibility, and everything it can find.",
    details:
      "The AI reads everything. It judges everything. It checks design, performance, code quality, mobile responsiveness, UX, accessibility, SEO, copywriting, brand credibility, security, and AI agent readiness.",
  },
  {
    step: 3,
    title: "The Roast",
    description:
      "Each selected category gets a score from 1 to 10, a brutal critique, and a prompt you can give an AI agent to actually fix it.",
    details:
      "No sugar-coating. The critique is honest, specific, and evidence-based. The fix prompt is actionable and can be given to an AI agent to implement.",
  },
  {
    step: 4,
    title: "Your Score",
    description:
      "Get your overall score, share the result, or quietly fix your site in the dark.",
    details:
      "The overall score is an average of all category scores. Share it proudly (or hide it in shame). Either way, you now know what needs fixing.",
  },
];

export const categories = [
  {
    id: "design",
    name: "Design & UI",
    description:
      "Visual design, layout, color choices, typography, and overall aesthetic appeal",
  },
  {
    id: "performance",
    name: "Performance & Speed",
    description: "Page load times, resource optimization, and overall speed",
  },
  {
    id: "code",
    name: "Code Quality",
    description: "Code structure, maintainability, and best practices",
  },
  {
    id: "mobile",
    name: "Mobile & Responsive",
    description: "Mobile-friendliness and responsive design implementation",
  },
  {
    id: "ux",
    name: "User Experience",
    description: "User flow, navigation, and overall usability",
  },
  {
    id: "accessibility",
    name: "Accessibility",
    description:
      "WCAG compliance and accessibility for users with disabilities",
  },
  {
    id: "conversion",
    name: "Conversions & CTAs",
    description: "Call-to-action effectiveness and conversion optimization",
  },
  {
    id: "seo",
    name: "SEO & Indexing",
    description: "Search engine optimization and discoverability",
  },
  {
    id: "copy",
    name: "Copywriting & Messaging",
    description: "Content quality, clarity, and messaging effectiveness",
  },
  {
    id: "brand",
    name: "Brand Identity",
    description: "Brand consistency and visual identity",
  },
  {
    id: "credibility",
    name: "Credibility & Professionalism",
    description: "Trust signals and professional appearance",
  },
  {
    id: "security",
    name: "Security & Privacy",
    description: "Security measures and privacy practices",
  },
  {
    id: "agentReadiness",
    name: "AI Agent Readiness",
    description: "Overall compatibility with AI agents and automated tools",
  },
  {
    id: "robots",
    name: "Robots.txt & Sitemap",
    description:
      "Proper robots.txt and sitemap.xml configuration for AI crawlers",
  },
  {
    id: "mcp",
    name: "MCP & Agent Skills",
    description: "Model Context Protocol support and agent skill definitions",
  },
  {
    id: "apiDiscovery",
    name: "API Discovery",
    description:
      "API documentation and discovery mechanisms (llms.txt, OpenAPI)",
  },
  {
    id: "botAuth",
    name: "Bot Authentication",
    description: "OAuth discovery and bot authentication mechanisms",
  },
];

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const type = url.searchParams.get("type") || "full";

  const response = {
    company: companyInfo,
    howItWorks,
    categories,
    metadata: {
      version: "1.0.0",
      generatedAt: new Date().toISOString(),
    },
  };

  if (type === "minimal") {
    const minimalResponse = {
      company: {
        name: companyInfo.name,
        legalName: companyInfo.legalName,
        fullLegalAddress: companyInfo.fullLegalAddress,
        description: companyInfo.description,
        contactUrl: companyInfo.contactUrl,
      },
      howItWorks: howItWorks.map((h) => ({
        step: h.step,
        title: h.title,
        description: h.description,
      })),
      metadata: response.metadata,
    };
    return new Response(JSON.stringify(minimalResponse, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=300",
      },
    });
  }

  return new Response(JSON.stringify(response, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
};
