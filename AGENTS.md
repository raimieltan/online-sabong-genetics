<!-- BEGIN:graphify-agent-rules -->

# Project Navigation: Use Graphify

Before exploring the codebase structure, dependencies, or call graphs, use `graphify` rather than manual `grep`/`find` traversal. Typical usage:

- `graphify query <symbol>` — find where a symbol is defined/used
- `graphify deps <file>` — show a file's dependency graph
- (add your actual command reference here)

Only fall back to manual file search if graphify doesn't cover the query.

<!-- END:graphify-agent-rules -->