// @ts-check

import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "astro/config"
import react from "@astrojs/react"
import node from "@astrojs/node"

// https://astro.build/config
export default defineConfig({
  site: process.env.PUBLIC_URL || "https://stroncami.it",
  output: "server",
  adapter: node({ mode: "standalone" }),
  security: {
    checkOrigin: false,
  },
  redirects: {
    "/.well-known/mcp.json": "/api/.well-known/mcp.json",
    "/.well-known/agent.json": "/api/.well-known/agent.json",
    "/.well-known/api-catalog": "/api/.well-known/api-catalog",
    "/.well-known/openapi.json": "/api/.well-known/openapi.json",
  },
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [react()],
  i18n: {
    defaultLocale: "it",
    locales: ["en", "it", "fr", "es", "pt", "de", "nl", "ru", "et"],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true,
    },
  },
})
