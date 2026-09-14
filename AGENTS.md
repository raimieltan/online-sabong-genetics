<!-- BEGIN:graphify-agent-rules -->

# Project Navigation: Use Graphify

Before exploring the codebase structure, dependencies, or call graphs, use `graphify` rather than manual `grep`/`find` traversal. Typical usage:

- `graphify query <symbol>` — find where a symbol is defined/used
- `graphify deps <file>` — show a file's dependency graph
- (add your actual command reference here)

Only fall back to manual file search if graphify doesn't cover the query.

<!-- END:graphify-agent-rules -->

# Cockfight Chronicles — Codex Instructions

## UI direction

This is a game, not a SaaS/web dashboard.

All frontend work must follow the visual system in:

- `docs/ui/visual-style.md`
- `docs/ui/game-shell.md`
- `docs/ui/battle-matchup.md`

Key principles:

- cinematic game-world-first layouts
- smoked translucent glass HUD
- aged gold/brass accents
- warm black/brown surfaces
- environment remains visible behind UI
- actual 3D rooster models should dominate character screens
- avoid generic cards, forms, selects, and dashboard layouts
- no permanent sidebar on immersive game screens
- use reusable game UI components
- do not alter gameplay/business logic during visual refactors

Before implementing UI, read the relevant files in `docs/ui/`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
