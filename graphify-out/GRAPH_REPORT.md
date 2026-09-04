# Graph Report - rooster-arena  (2026-09-04)

## Corpus Check
- Corpus is ~2,452 words - fits in a single context window. You may not need a graph.

## Summary
- 86 nodes · 73 edges · 17 communities (8 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Configuration Dependencies
- Compiler Setup
- App Layout
- Page Core
- Next Config
- Project metadata
- Agent context
- Claude rules
- File icons
- Globe icons
- Next logos
- Vercel logos
- Window icons
- Empty
- Empty
- Empty

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 16 edges
2. `include` - 7 edges
3. `scripts` - 5 edges
4. `lib` - 4 edges
5. `Rooster Arena Project` - 4 edges
6. `next` - 2 edges
7. `react` - 2 edges
8. `react-dom` - 2 edges
9. `@tailwindcss/postcss` - 2 edges
10. `@types/node` - 2 edges

## Surprising Connections (you probably didn't know these)
- `Rooster Arena Project` --references--> `Agent Rules`  [EXTRACTED]
  . → AGENTS.md
- `Rooster Arena Project` --references--> `Claude Project Context`  [EXTRACTED]
  . → CLAUDE.md
- `Rooster Arena Project` --references--> `README`  [EXTRACTED]
  . → README.md
- `Rooster Arena Project` --references--> `Serena Project Configuration`  [EXTRACTED]
  . → .serena/project.yml

## Import Cycles
- None detected.

## Communities (17 total, 8 thin omitted)

### Community 0 - "Configuration Dependencies"
Cohesion: 0.12
Nodes (17): eslint, eslint-config-next, devDependencies, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, @types/node (+9 more)

### Community 1 - "Compiler Setup"
Cohesion: 0.13
Nodes (15): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, module, moduleResolution (+7 more)

### Community 2 - "App Layout"
Cohesion: 0.20
Nodes (9): name, packageManager, private, scripts, build, dev, lint, start (+1 more)

### Community 3 - "Page Core"
Cohesion: 0.20
Nodes (9): **/*.mts, .next/dev/types/**/*.ts, next-env.d.ts, .next/types/**/*.ts, node_modules, **/*.ts, **/*.tsx, exclude (+1 more)

### Community 4 - "Next Config"
Cohesion: 0.29
Nodes (7): next, dependencies, next, react, react-dom, react, react-dom

### Community 5 - "Project metadata"
Cohesion: 0.40
Nodes (5): Agent Rules, Claude Project Context, README, Rooster Arena Project, Serena Project Configuration

### Community 6 - "Agent context"
Cohesion: 0.40
Nodes (3): geistMono, geistSans, metadata

### Community 7 - "Claude rules"
Cohesion: 0.50
Nodes (4): dom, dom.iterable, esnext, lib

## Knowledge Gaps
- **58 isolated node(s):** `geistSans`, `geistMono`, `metadata`, `eslintConfig`, `nextConfig` (+53 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 64 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `devDependencies` connect `Configuration Dependencies` to `App Layout`?**
  _High betweenness centrality (0.108) - this node is a cross-community bridge._
- **Why does `compilerOptions` connect `Compiler Setup` to `Page Core`, `Claude rules`?**
  _High betweenness centrality (0.092) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Next Config` to `App Layout`?**
  _High betweenness centrality (0.049) - this node is a cross-community bridge._
- **What connects `geistSans`, `geistMono`, `metadata` to the rest of the system?**
  _58 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Configuration Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.11764705882352941 - nodes in this community are weakly interconnected._
- **Should `Compiler Setup` be split into smaller, more focused modules?**
  _Cohesion score 0.13333333333333333 - nodes in this community are weakly interconnected._