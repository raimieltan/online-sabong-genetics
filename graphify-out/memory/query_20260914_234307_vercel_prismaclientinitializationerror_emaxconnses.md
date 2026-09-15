---
type: "query"
date: "2026-09-14T23:43:07.262084+00:00"
question: "Vercel PrismaClientInitializationError EMAXCONNSESSION max clients reached in session mode, pool_size 15"
contributor: "graphify"
outcome: "useful"
source_nodes: ["prisma", "db.ts", "player.ts", "Vercel (Recommended)"]
---

# Q: Vercel PrismaClientInitializationError EMAXCONNSESSION max clients reached in session mode, pool_size 15

## Answer

Expanded from original query via graph vocab: [prisma, player, database, pool, client, postgres, supabase, vercel]. Root cause: the Vercel serverless deployment is using Supabase Supavisor session mode, capped at 15 clients. Each Vercel function instance has its own Prisma pool. Use Supavisor transaction mode on port 6543 for DATABASE_URL, append pgbouncer=true and start with connection_limit=1; reserve a direct or session URL as DIRECT_URL for Prisma CLI migrations and add directUrl to the Prisma datasource. The player.findFirst call is where the exhausted connection was observed, not the cause.

## Outcome

- Signal: useful

## Source Nodes

- prisma
- db.ts
- player.ts
- Vercel (Recommended)