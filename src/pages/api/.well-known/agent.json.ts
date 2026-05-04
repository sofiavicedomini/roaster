export const prerender = false;

import type { APIRoute } from "astro";
import { companyInfo, howItWorks } from "../info.ts";

export const GET: APIRoute = async () => {
  const agent = {
    name: "Roast Me",
    version: "1.0.0",
    description:
      "AI-powered website critique service. Get brutal, honest analysis of design, performance, SEO, UX, accessibility, security, and AI agent compatibility.",
    instructions:
      "Use this service to analyze any website and receive a detailed, honest critique with scores and actionable fixes.",
    skills: [
      {
        id: "analyze-website",
        name: "Analyze Website",
        description:
          "Analyze any public website for design, performance, SEO, UX, accessibility, security, and AI agent readiness",
        endpoint: "/api/mcp",
        method: "POST",
      },
      {
        id: "get-roast-results",
        name: "Get Roast Results",
        description:
          "Retrieve detailed roast results by job ID or ranking UUID",
        endpoint: "/api/mcp",
        method: "POST",
      },
      {
        id: "list-recent-roasts",
        name: "List Recent Roasts",
        description: "Get the list of recently analyzed websites with scores",
        endpoint: "/api/mcp",
        method: "POST",
      },
      {
        id: "get-summary",
        name: "Get Roast Summary",
        description: "Get a summary of all roast statistics",
        endpoint: "/api/summary",
        method: "GET",
      },
      {
        id: "get-info",
        name: "Get Service Info",
        description:
          "Get company information and available analysis categories",
        endpoint: "/api/info",
        method: "GET",
      },
    ],
    endpoints: [
      {
        url: "https://stroncami.it/api/mcp",
        protocol: "mcp/1.0",
        transport: "http",
      },
      {
        url: "https://stroncami.it/api/summary",
        protocol: "rest/1.0",
        transport: "http",
      },
      {
        url: "https://stroncami.it/api/info",
        protocol: "rest/1.0",
        transport: "http",
      },
    ],
    capabilities: [
      "website-analysis",
      "scoring",
      "critique-generation",
      "fix-recommendations",
      "statistics-aggregation",
    ],
    documentation: "https://stroncami.it/en/how-it-works",
    contact: {
      name: companyInfo.name,
      url: companyInfo.contactUrl,
    },
    about: {
      company: companyInfo.name,
      legalName: companyInfo.legalName,
      mission: companyInfo.mission,
      location: companyInfo.location,
      address: companyInfo.address,
      postalCode: companyInfo.postalCode,
      city: companyInfo.city,
      country: companyInfo.country,
      piva: companyInfo.piva,
      rea: companyInfo.rea,
      capital: companyInfo.capital,
      fullLegalAddress: companyInfo.fullLegalAddress,
      services: companyInfo.services,
      contactUrl: companyInfo.contactUrl,
    },
    howItWorks: howItWorks.map((h) => ({
      step: h.step,
      title: h.title,
      description: h.description,
    })),
  };

  return new Response(JSON.stringify(agent, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "public, max-age=3600",
    },
  });
};
