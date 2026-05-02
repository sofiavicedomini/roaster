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