# AGENTS.md

## Dev Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # ESLint check
npm run format       # Prettier format (ts, tsx, astro)
npm run typecheck    # Astro type check
```

## Project Structure

- **Framework**: Astro 5 with React integration
- **UI**: shadcn/ui with radix-maia style, hugeicons
- **Styling**: TailwindCSS v4 (via @tailwindcss/vite)
- **Path alias**: `@/*` maps to `src/*`

## Entry Points

- `src/pages/index.astro` - main page
- `src/layouts/main.astro` - main layout
- `src/components/ui/` - shadcn components
- `src/lib/utils.ts` - utility functions (cn, etc.)

## Commands Order

`lint -> typecheck -> build` before committing

## Adding Components

```bash
npx shadcn@latest add button
```

This adds components to `src/components/ui/`.

## Notes

- ESLint ignores `dist` and `.astro` directories
- TypeScript extends `astro/tsconfigs/strict`
- CSS variables defined in `src/styles/global.css`