@AGENTS.md

# Gamefowl Dynasty — Baseline Spec

`docs/superpowers/specs/gamefowl_dynasty_full_mechanics.md` is the authoritative baseline for all game mechanics (genetics, breeding, training, combat, economy, marketplace, tournaments, monetization, social/seasons). Every new subsystem design must follow it unless the user explicitly overrides a section. Sub-project specs (e.g. `2026-09-04-rooster-arena-design.md`) implement pieces of this baseline and should stay consistent with it.

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
