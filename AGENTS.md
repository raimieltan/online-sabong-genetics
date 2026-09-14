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