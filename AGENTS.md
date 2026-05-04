# AGENTS.md

## Dev Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check (ts, tsx only)
npm run format       # Prettier format (ts, tsx, astro)
npm run typecheck    # Astro type check
```

## Commit Order

`lint -> typecheck -> build`

## Entry Points

- `src/pages/index.astro` - main page (uses Chatbot React component)
- `src/pages/api/roast.ts` - API endpoint, reads `prompt.md` from root
- `src/layouts/main.astro` - main layout

## Adding shadcn Components

```bash
npx shadcn@latest add <component>
```

Components added to `src/components/ui/`.

## Config Notes

- **Output**: Server-side via Node adapter (`output: "server"` in astro.config.mjs)
- **Path alias**: `@/*` → `src/*`
- **TailwindCSS v4**: Theme via `@theme` in `src/styles/global.css`
- **ESLint**: Only checks `.ts`/`.tsx` files, ignores `.astro` and `dist`
- **TypeScript**: Extends `astro/tsconfigs/strict`

## Environment

API route uses OpenAI-compatible endpoint. Defaults to local Ollama:
- `OPENAI_API_BASE` (default: `http://localhost:11434/v1`)
- `OPENAI_API_KEY` (default: `dummy`)
- `OPENAI_MODEL` (default: `llama3`)

See `.env.example` for setup.

## Security

- `src/middleware.ts` - sets CSP, HSTS, X-Content-Type-Options, X-Frame-Options, HTTPS redirect
- `/api/security-check?url=<target>` - analyze target's security headers (live fetch)
- `src/lib/security-analyzer.ts` - reusable analysis functions

## Agent Readiness Checks

`checkAgentReadiness()` in `src/pages/api/roast.ts` categorizes checks:
- `robots` → robots.txt, sitemap.xml
- `mcp` → mcp, webmcp, agentskills
- `apiDiscovery` → llms.txt, llms-full.txt, api-catalog
- `botAuth` → oauth, oauth-protected, agent-card, a2a
- `security` → CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy

## Internal Agent Tools

LLM agent tools in `/api/roast` (defined in `AGENT_TOOLS`):
- `scrape_url` - fetch URL content for evidence (homepage, robots.txt, etc.)
- `analyze_security_headers` - fetch & analyze CSP, HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, Permissions-Policy
- `submit_roast` - submit final analysis with scores & critiques

Categories for roast: `design`, `performance`, `mobile`, `ux`, `accessibility`, `conversion`, `seo`, `copy`, `brand`, `credibility`, `security`, `agentReadiness`, `robots`, `mcp`, `apiDiscovery`, `botAuth`, `code` (18 total)