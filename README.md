# Website Roaster

Get an honest, no-BS critique of any website. Powered by AI with a fiery UI built on Astro + React + TypeScript + shadcn/ui.

## Quick Start

```bash
npm install
npm run dev
```

## Environment

Copy `.env.example` to `.env` and configure:

```bash
OPENAI_API_BASE=http://localhost:11434/v1  # OpenAI-compatible endpoint (Ollama, LM Studio, etc.)
OPENAI_API_KEY=dummy                       # API key (dummy works for local Ollama)
OPENAI_MODEL=llama3                        # Model to use
```

Defaults to local Ollama if not set.

## Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run lint         # ESLint check (ts, tsx only)
npm run typecheck    # Astro type check
```

## Adding shadcn Components

```bash
npx shadcn@latest add <component>
```

Components are added to `src/components/ui/`.

## How It Works

1. User enters a URL and selects critique categories
2. `/api/roast.ts` reads `prompt.md` and calls an OpenAI-compatible API
3. AI returns a JSON roast with scores and critiques
4. Results displayed in the Chatbot UI

Customize the roast prompt by editing `prompt.md` in the project root.
