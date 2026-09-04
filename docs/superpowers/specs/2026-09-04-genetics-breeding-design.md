# Genetics + Breeding (+ UI) — Design Spec

**Date**: 2026-09-04
**Status**: Draft
**Architecture Path**: Architectural (new backend, new subsystem)
**Baseline**: `docs/superpowers/specs/gamefowl_dynasty_full_mechanics.md` (sections 4–9)
**Roadmap items covered**: 🔴2 Genetics, 🔴3 Breeding (stops at Egg — item 4 Hatching/Growth is out of scope)

---

## Context

Item 1 (Chicken data model) is done: `lib/types.ts` has the full `Chicken` type (IV/EV/traits/parentage/bloodline/record) and `lib/chickenGenerator.ts` generates gen-0 chickens with random IVs. This round adds:

1. A real backend (Postgres in Docker + Prisma + Next.js API routes) — the app is currently client-only (localStorage), and the user explicitly asked to move persistence server-side for this subsystem.
2. The genetics inheritance algorithm (breeding two chickens into an Egg).
3. A trait pool with inheritance.
4. UI to browse a coop and breed chickens.

Out of scope for this round: hatching/incubation timers (item 4), training/EV growth (item 5), wiring traits into `BattleEngine` (item 6), auth/multiple players (deferred until economy/marketplace/tournaments need it).

---

## 1. Architecture

- **Docker Compose** runs a single Postgres service for local dev.
- **Prisma** is the ORM and migration tool.
- **Next.js API routes** (`app/api/**/route.ts`) are the only server — no separate backend service.
- **Single implicit player**: one `Player` row is created (or fetched) on first use; there is no login. All chickens/eggs belong to that row. This keeps the round focused — real auth becomes its own sub-project when economy/marketplace/tournaments require distinguishing players.
- Server is authoritative for genetics (matches baseline spec section 50): all inheritance math runs in the API route, never the client.

## 2. Data model (Prisma schema)

```prisma
model Player {
  id        String    @id @default(uuid())
  createdAt DateTime  @default(now())
  chickens  Chicken[]
  eggs      Egg[]
}

model Chicken {
  id           String   @id @default(uuid())
  playerId     String
  player       Player   @relation(fields: [playerId], references: [id])
  name         String
  sex          String   // "rooster" | "hen"
  generation   Int
  fatherId     String?
  motherId     String?
  bloodlineId  String
  iv           Json     // StatBlock
  ev           Json     // StatBlock
  traits       Json     // Trait[]
  age          Int
  health       Int
  energy       Int
  record       Json     // CombatRecord
  status       String   // ChickenStatus
  createdAt    DateTime @default(now())
}

model Egg {
  id          String   @id @default(uuid())
  playerId    String
  player      Player   @relation(fields: [playerId], references: [id])
  fatherId    String
  motherId    String
  bloodlineId String
  generation  Int
  sex         String   // locked at conception
  iv          Json     // StatBlock
  traits      Json     // Trait[]
  laidAt      DateTime @default(now())
  status      String   // "incubating" (only status until item 4 adds hatching)
}
```

These field shapes mirror `lib/types.ts` (`StatBlock`, `Trait`, `CombatRecord`, `ChickenStatus`) so existing generator/logic code can serialize straight into the DB rows.

## 3. Genetics inheritance algorithm

For each `GeneticStatKey` independently (power, speed, stamina, defense, accuracy, agility):

1. **Weighted parent contribution**: draw `w ~ U(0.35, 0.65)`, randomized per stat and per breeding. `weighted = father.iv[stat] * w + mother.iv[stat] * (1 - w)`. This avoids a flat 50/50 average while keeping both parents meaningfully represented (spec section 8: "should not simply receive the average").
2. **Genetic variance**: add symmetric noise — sum of a few `U(-1,1)` draws scaled to roughly ±8 — for a bell-shaped rather than uniform spread.
3. **Mutation**: ~3% independent chance per stat to add a further +10–20 bonus. This is what allows a child to exceed both parents ("jackpot genetics", spec section 8's worked example).
4. Clamp the final value to `[1, 99]`.

`bloodlineId` is inherited from the **rooster** (paternal-line convention) — every egg's bloodline traces to its sire's bloodline. Full multi-ancestor pedigree tracking is item 7 (Bloodlines/Pedigree) and out of scope here; this round only needs `fatherId`/`motherId` recorded, which is already sufficient to build a pedigree tree later.

## 4. Traits

Seed a fixed pool of 7 traits from spec section 6, each with an assigned rarity (not specified in the baseline doc, so assigned here for balance):

| Trait | Rarity |
|---|---|
| Iron Stamina | common |
| Calm | common |
| Quick Starter | uncommon |
| Counter Fighter | uncommon |
| Heavy Striker | rare |
| Survivor | rare |
| Glass Cannon | epic |

Inheritance: each parent's traits are considered independently, each with a ~40% chance to pass to the egg. Separately, a ~5% chance per breeding of a wild trait appearing (drawn from the full pool weighted by rarity) — this is the "hidden traits" / genetic diversity mechanic from spec section 8.

Traits are pure data this round: stored and displayed, but `BattleEngine` does not read them yet (item 6).

## 5. API routes

- `GET /api/chickens` — list the player's chickens
- `POST /api/chickens` — dev helper: generate a gen-0 chicken via `chickenGenerator`, persist it
- `GET /api/chickens/:id` — chicken detail
- `POST /api/breed` — body `{ fatherId, motherId }`; validates one is a rooster and one is a hen and both are owned by the player, runs the inheritance algorithm, creates an `Egg` row, returns it
- `GET /api/eggs` — list the player's eggs

## 6. UI

Two new routes alongside the existing battle flow, plus a simple top nav to move between them:

- **`/coop`** — grid of owned chickens (name, sex, generation, thumbnail stat summary). Clicking a chicken opens a detail card matching the baseline spec's identity-card layout (section 3): IV block, EV block, traits, combat record, parentage.
- **`/breed`** — pick one hen and one rooster from the coop (two selector panels), see a side-by-side parent stat comparison, "Breed" button calls `/api/breed`. Below that, a "Nest" list shows the player's incubating eggs (their locked-in IVs and traits, sex, parents) — since there's no hatching yet, this list just accumulates.

## 7. Testing

- **Inheritance function**: unit tests on the pure function (no DB) — distribution sanity (weighted average lands in expected range), clamping at 1/99, mutation firing at roughly the expected rate over many trials, bloodline always equals the rooster's.
- **Trait inheritance**: unit tests on pass-through rate and wild-trait rate over many trials.
- **API routes**: tested against a mocked Prisma client (fast, no Docker needed for the main suite). One or two integration tests run against the real Dockerized Postgres to confirm the schema/migrations actually work end to end.
- **UI**: manually verified via the `run` skill / browser automation — breed two chickens, confirm an egg appears in the Nest with plausible stats.
