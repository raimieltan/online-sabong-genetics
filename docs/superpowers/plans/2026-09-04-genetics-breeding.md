# Genetics + Breeding (+ UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Postgres/Prisma backend, the genetics inheritance + trait system, and Coop/Breed UI so a player can generate chickens, browse them, and breed a hen + rooster into an egg.

**Architecture:** Docker Compose runs Postgres; Prisma is the ORM against a `Player`/`Chicken`/`Egg` schema; Next.js API routes (`app/api/**`) are the only server, using a single implicit `Player` row (no auth). Genetics and trait inheritance are pure, RNG-injectable functions in `lib/`, unit-tested deterministically; API routes get integration tests against the real Dockerized Postgres. UI adds `/coop` and `/breed` pages plus a shared nav.

**Tech Stack:** Next.js 16 (App Router) API routes, Prisma + PostgreSQL (Docker), TypeScript, existing `node --test` runner (no new test framework), Tailwind CSS v4 (matching existing components).

**Spec:** `docs/superpowers/specs/2026-09-04-genetics-breeding-design.md`

## Global Constraints

- Single implicit `Player` row; no login/auth this round.
- Server is authoritative for genetics — all inheritance math runs in API routes, never the client.
- Traits are data-only this round — no `BattleEngine` wiring.
- Breeding stops at `Egg` — no hatching/incubation timers.
- Bloodline is inherited from the rooster (paternal line).
- Follow the existing test pattern: `node --test` via `scripts/test-ts-loader.mjs`, tests live in `lib/__tests__/*.test.ts`, using `node:test` + `node:assert/strict` (see `lib/__tests__/chickenGenerator.test.ts` for the pattern) — do not introduce vitest/jest.
- Use `yarn` (packageManager is pinned to yarn@1.22.22).
- Extensionless relative imports in `lib/**` and `app/**` source (bundler convention) — the test loader handles resolution.

---

### Task 1: Add the `Egg` type

**Files:**
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `EggStatus` (`"incubating"`), `Egg` type — consumed by Tasks 4 (genetics import unaffected), 8 (breed route), 9 (eggs route), 11 (UI).

- [ ] **Step 1: Add the type**

Append to `lib/types.ts`:

```ts
export type EggStatus = "incubating";

/**
 * Genetics are locked in at conception. An egg has no hatching mechanism
 * yet (that's a later roadmap item) — it simply records what a breeding
 * produced.
 */
export type Egg = {
  id: string;
  fatherId: string;
  motherId: string;
  bloodlineId: string;
  generation: number;
  sex: ChickenSex;
  iv: StatBlock;
  traits: Trait[];
  laidAt: number;
  status: EggStatus;
};
```

- [ ] **Step 2: Typecheck**

Run: `yarn tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat: add Egg type"
```

---

### Task 2: Docker Postgres + Prisma schema + migration

**Files:**
- Create: `docker-compose.yml`
- Create: `.env` (gitignored) and `.env.example`
- Create: `prisma/schema.prisma`
- Modify: `package.json` (add deps + scripts)
- Modify: `.gitignore` (ensure `.env` is ignored)

**Interfaces:**
- Produces: Prisma models `Player`, `Chicken`, `Egg` and a generated `@prisma/client` — consumed by every task from Task 3 onward.

- [ ] **Step 1: Install Prisma**

```bash
yarn add @prisma/client
yarn add -D prisma
```

- [ ] **Step 2: Add Docker Compose for Postgres**

Create `docker-compose.yml`:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: rooster
      POSTGRES_PASSWORD: rooster
      POSTGRES_DB: rooster_arena
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

- [ ] **Step 3: Add env files**

Create `.env.example`:

```
DATABASE_URL="postgresql://rooster:rooster@localhost:5432/rooster_arena"
```

Create `.env` with the same content (real local file, not committed).

Check `.gitignore` contains a `.env` line; if not, append it.

- [ ] **Step 4: Write the Prisma schema**

Create `prisma/schema.prisma`:

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Player {
  id        String    @id @default(uuid())
  createdAt DateTime  @default(now())
  chickens  Chicken[]
  eggs      Egg[]
}

model Chicken {
  id          String   @id
  playerId    String
  player      Player   @relation(fields: [playerId], references: [id])
  name        String
  sex         String
  generation  Int
  fatherId    String?
  motherId    String?
  bloodlineId String
  iv          Json
  ev          Json
  traits      Json
  age         Int
  health      Int
  energy      Int
  record      Json
  status      String
  createdAt   DateTime @default(now())
}

model Egg {
  id          String   @id
  playerId    String
  player      Player   @relation(fields: [playerId], references: [id])
  fatherId    String
  motherId    String
  bloodlineId String
  generation  Int
  sex         String
  iv          Json
  traits      Json
  laidAt      DateTime @default(now())
  status      String
}
```

Note: `Chicken.id`/`Egg.id` use `@id` without `@default(uuid())` because app code (`chickenGenerator.ts`, the breed route) generates the id itself before insert.

- [ ] **Step 5: Add package.json scripts**

Add to `"scripts"` in `package.json`:

```json
"db:up": "docker compose up -d",
"postinstall": "prisma generate"
```

- [ ] **Step 6: Start Postgres and run the migration**

```bash
yarn db:up
npx prisma migrate dev --name init
```

Expected: migration succeeds, `prisma/migrations/<timestamp>_init/` is created, `@prisma/client` is generated.

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml .env.example prisma package.json yarn.lock .gitignore
git commit -m "feat: add Postgres/Prisma backend scaffolding"
```

---

### Task 3: Prisma client singleton + player helper

**Files:**
- Create: `lib/db.ts`
- Create: `lib/player.ts`
- Test: `lib/__tests__/player.test.ts`

**Interfaces:**
- Consumes: `@prisma/client` (Task 2's generated client)
- Produces: `prisma` (PrismaClient instance), `getOrCreatePlayer(): Promise<Player>` — consumed by Tasks 6–9 (all API routes)

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/player.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";

test("getOrCreatePlayer creates a player once and returns it on subsequent calls", async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();

  const first = await getOrCreatePlayer();
  const second = await getOrCreatePlayer();

  assert.equal(first.id, second.id);

  const count = await prisma.player.count();
  assert.equal(count, 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL — `../db` and `../player` do not exist yet.

- [ ] **Step 3: Implement**

Create `lib/db.ts`:

```ts
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
```

Create `lib/player.ts`:

```ts
import type { Player } from "@prisma/client";

import { prisma } from "./db";

export async function getOrCreatePlayer(): Promise<Player> {
  const existing = await prisma.player.findFirst();
  if (existing) return existing;
  return prisma.player.create({ data: {} });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn db:up` (if not already running), then `yarn test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/db.ts lib/player.ts lib/__tests__/player.test.ts
git commit -m "feat: add Prisma client singleton and player helper"
```

---

### Task 4: Genetics inheritance (`lib/genetics.ts`)

**Files:**
- Create: `lib/genetics.ts`
- Test: `lib/__tests__/genetics.test.ts`

**Interfaces:**
- Consumes: `GENETIC_STAT_KEYS`, `StatBlock` from `./types`
- Produces: `type Rng = () => number`, `inheritStat(fatherValue: number, motherValue: number, rng?: Rng): number`, `inheritStatBlock(father: StatBlock, mother: StatBlock, rng?: Rng): StatBlock` — consumed by Task 8 (breed route)

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/genetics.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { inheritStat, inheritStatBlock } from "../genetics";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

function queueRng(values: number[]): () => number {
  const queue = [...values];
  return () => {
    const next = queue.shift();
    if (next === undefined) {
      throw new Error("queueRng exhausted");
    }
    return next;
  };
}

test("inheritStat averages parents with zero noise and no mutation", () => {
  const rng = queueRng([0.5, 0.5, 0.5, 0.5, 0.5]);
  assert.equal(inheritStat(80, 60, rng), 70);
});

test("inheritStat applies a mutation bonus when the mutation roll succeeds", () => {
  const rng = queueRng([0.5, 0.5, 0.5, 0.5, 0.0, 0.5]);
  assert.equal(inheritStat(50, 50, rng), 65);
});

test("inheritStat clamps to 99", () => {
  const rng = queueRng([0.5, 1, 1, 1, 0.9]);
  assert.equal(inheritStat(99, 99, rng), 99);
});

test("inheritStat clamps to 1", () => {
  const rng = queueRng([0.5, 0, 0, 0, 0.9]);
  assert.equal(inheritStat(1, 1, rng), 1);
});

test("inheritStat stays within [1, 99] over many random trials", () => {
  for (let i = 0; i < 1000; i++) {
    const value = inheritStat(50, 50);
    assert.ok(value >= 1 && value <= 99, `value ${value} out of range`);
  }
});

test("inheritStatBlock fills every genetic stat key", () => {
  const father: StatBlock = { power: 90, speed: 82, stamina: 70, defense: 60, accuracy: 75, agility: 65 };
  const mother: StatBlock = { power: 80, speed: 94, stamina: 66, defense: 58, accuracy: 70, agility: 72 };
  const child = inheritStatBlock(father, mother);
  for (const key of GENETIC_STAT_KEYS) {
    assert.ok(Number.isInteger(child[key]));
    assert.ok(child[key] >= 1 && child[key] <= 99);
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test`
Expected: FAIL — `../genetics` does not exist.

- [ ] **Step 3: Implement**

Create `lib/genetics.ts`:

```ts
import { GENETIC_STAT_KEYS, type StatBlock } from "./types";

export type Rng = () => number;

const MUTATION_CHANCE = 0.03;
const MUTATION_MIN_BONUS = 10;
const MUTATION_MAX_BONUS = 20;
const VARIANCE_SPREAD = 8;
const MIN_STAT = 1;
const MAX_STAT = 99;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * inheritStat draws weight, three noise samples, and a mutation check (and,
 * only if mutation fires, a magnitude) from rng in that exact order — tests
 * rely on this sequence to drive deterministic fake rngs.
 */
export function inheritStat(fatherValue: number, motherValue: number, rng: Rng = Math.random): number {
  const weight = 0.35 + rng() * 0.3;
  const weighted = fatherValue * weight + motherValue * (1 - weight);

  const noise = ((rng() - 0.5) + (rng() - 0.5) + (rng() - 0.5)) / 1.5;
  let result = weighted + noise * VARIANCE_SPREAD;

  if (rng() < MUTATION_CHANCE) {
    result += MUTATION_MIN_BONUS + rng() * (MUTATION_MAX_BONUS - MUTATION_MIN_BONUS);
  }

  return Math.round(clamp(result, MIN_STAT, MAX_STAT));
}

export function inheritStatBlock(father: StatBlock, mother: StatBlock, rng: Rng = Math.random): StatBlock {
  const result = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => {
    result[key] = inheritStat(father[key], mother[key], rng);
  });
  return result;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/genetics.ts lib/__tests__/genetics.test.ts
git commit -m "feat: add genetic stat inheritance algorithm"
```

---

### Task 5: Trait pool + inheritance (`lib/traits.ts`)

**Files:**
- Create: `lib/traits.ts`
- Test: `lib/__tests__/traits.test.ts`

**Interfaces:**
- Consumes: `Trait`, `TraitRarity` from `./types`
- Produces: `TRAIT_POOL: readonly Trait[]`, `inheritTraits(fatherTraits: readonly Trait[], motherTraits: readonly Trait[], rng?: Rng): Trait[]` — consumed by Task 8 (breed route)

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/traits.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { TRAIT_POOL, inheritTraits } from "../traits";
import type { Trait } from "../types";

function queueRng(values: number[]): () => number {
  const queue = [...values];
  return () => {
    const next = queue.shift();
    if (next === undefined) {
      throw new Error("queueRng exhausted");
    }
    return next;
  };
}

const IRON_STAMINA = TRAIT_POOL.find((t) => t.id === "iron-stamina") as Trait;
const CALM = TRAIT_POOL.find((t) => t.id === "calm") as Trait;

test("TRAIT_POOL has 7 seeded traits", () => {
  assert.equal(TRAIT_POOL.length, 7);
});

test("inheritTraits passes through a parent trait when the roll succeeds", () => {
  // father has 1 trait (roll 0.0 -> pass), mother has none, wild roll 0.9 -> no wild trait
  const rng = queueRng([0.0, 0.9]);
  const result = inheritTraits([IRON_STAMINA], [], rng);
  assert.deepEqual(result, [IRON_STAMINA]);
});

test("inheritTraits drops a parent trait when the roll fails", () => {
  const rng = queueRng([0.9, 0.9]);
  const result = inheritTraits([IRON_STAMINA], [], rng);
  assert.deepEqual(result, []);
});

test("inheritTraits does not duplicate a trait shared by both parents", () => {
  // both parents have IRON_STAMINA; first occurrence passes (0.0), second is
  // already seen so its roll is never consumed; wild roll 0.9 -> none
  const rng = queueRng([0.0, 0.9]);
  const result = inheritTraits([IRON_STAMINA], [IRON_STAMINA], rng);
  assert.deepEqual(result, [IRON_STAMINA]);
});

test("inheritTraits can add a wild trait", () => {
  // no parent traits to roll; wild roll 0.0 -> fires; weighted pick roll 0.0 -> first pool entry
  const rng = queueRng([0.0, 0.0]);
  const result = inheritTraits([], [], rng);
  assert.deepEqual(result, [TRAIT_POOL[0]]);
});

test("inheritTraits over many trials only returns traits from the input pools plus TRAIT_POOL", () => {
  const validIds = new Set([IRON_STAMINA.id, CALM.id, ...TRAIT_POOL.map((t) => t.id)]);
  for (let i = 0; i < 200; i++) {
    const result = inheritTraits([IRON_STAMINA], [CALM]);
    for (const trait of result) {
      assert.ok(validIds.has(trait.id));
    }
  }
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test`
Expected: FAIL — `../traits` does not exist.

- [ ] **Step 3: Implement**

Create `lib/traits.ts`:

```ts
import type { Trait, TraitRarity } from "./types";

export type Rng = () => number;

export const TRAIT_POOL: readonly Trait[] = [
  { id: "iron-stamina", name: "Iron Stamina", rarity: "common", description: "Reduced stamina consumption." },
  { id: "calm", name: "Calm", rarity: "common", description: "Less likely to make inefficient attacks." },
  { id: "quick-starter", name: "Quick Starter", rarity: "uncommon", description: "Higher performance during the opening phase." },
  { id: "counter-fighter", name: "Counter Fighter", rarity: "uncommon", description: "Higher counterattack probability." },
  { id: "heavy-striker", name: "Heavy Striker", rarity: "rare", description: "Higher damage but higher stamina consumption." },
  { id: "survivor", name: "Survivor", rarity: "rare", description: "More resistant to injury effects." },
  { id: "glass-cannon", name: "Glass Cannon", rarity: "epic", description: "Very high attack potential but lower durability." },
];

const PASS_THROUGH_CHANCE = 0.4;
const WILD_TRAIT_CHANCE = 0.05;

const RARITY_WEIGHT: Record<TraitRarity, number> = {
  common: 10,
  uncommon: 6,
  rare: 3,
  epic: 1,
  legendary: 0,
};

function pickWeightedTrait(pool: readonly Trait[], rng: Rng): Trait {
  const totalWeight = pool.reduce((sum, t) => sum + RARITY_WEIGHT[t.rarity], 0);
  let roll = rng() * totalWeight;
  for (const trait of pool) {
    roll -= RARITY_WEIGHT[trait.rarity];
    if (roll < 0) return trait;
  }
  return pool[pool.length - 1];
}

/**
 * Each parent trait gets an independent pass-through roll (consumed in
 * father-then-mother order, duplicates skipped without consuming a roll),
 * then one wild-trait roll (and, only if it fires, one weighted-pick roll).
 * Tests rely on this exact rng consumption order.
 */
export function inheritTraits(
  fatherTraits: readonly Trait[],
  motherTraits: readonly Trait[],
  rng: Rng = Math.random
): Trait[] {
  const inherited: Trait[] = [];
  const seen = new Set<string>();

  for (const trait of [...fatherTraits, ...motherTraits]) {
    if (seen.has(trait.id)) continue;
    seen.add(trait.id);
    if (rng() < PASS_THROUGH_CHANCE) {
      inherited.push(trait);
    }
  }

  if (rng() < WILD_TRAIT_CHANCE) {
    const wild = pickWeightedTrait(TRAIT_POOL, rng);
    if (!seen.has(wild.id)) {
      inherited.push(wild);
    }
  }

  return inherited;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/traits.ts lib/__tests__/traits.test.ts
git commit -m "feat: add trait pool and trait inheritance"
```

---

### Task 6: `GET/POST /api/chickens`

**Files:**
- Create: `app/api/chickens/route.ts`
- Test: `lib/__tests__/chickens-route.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 3), `getOrCreatePlayer` (Task 3), `generateRandomChicken` (existing `lib/chickenGenerator.ts`)
- Produces: `GET(): Promise<Response>`, `POST(): Promise<Response>` — consumed by Task 10/11 (UI fetches `/api/chickens`)

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/chickens-route.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../db";
import { GET, POST } from "../../app/api/chickens/route";

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/chickens creates a chicken owned by the implicit player", async () => {
  const response = await POST();
  assert.equal(response.status, 201);
  const chicken = await response.json();
  assert.ok(chicken.id);
  assert.equal(chicken.generation, 0);

  const stored = await prisma.chicken.findUnique({ where: { id: chicken.id } });
  assert.ok(stored);
});

test("GET /api/chickens lists chickens for the player", async () => {
  await POST();
  await POST();

  const response = await GET();
  const chickens = await response.json();
  assert.equal(chickens.length, 2);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn db:up && npx prisma migrate deploy && yarn test`
Expected: FAIL — `../../app/api/chickens/route` does not exist.

- [ ] **Step 3: Implement**

Create `app/api/chickens/route.ts`:

```ts
import { NextResponse } from "next/server";

import { generateRandomChicken } from "@/lib/chickenGenerator";
import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";

export async function GET() {
  const player = await getOrCreatePlayer();
  const chickens = await prisma.chicken.findMany({
    where: { playerId: player.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(chickens);
}

export async function POST() {
  const player = await getOrCreatePlayer();
  const generated = generateRandomChicken();

  const chicken = await prisma.chicken.create({
    data: {
      id: generated.id,
      playerId: player.id,
      name: generated.name,
      sex: generated.sex,
      generation: generated.generation,
      fatherId: generated.parents.fatherId,
      motherId: generated.parents.motherId,
      bloodlineId: generated.bloodlineId,
      iv: generated.iv,
      ev: generated.ev,
      traits: generated.traits,
      age: generated.age,
      health: generated.health,
      energy: generated.energy,
      record: generated.record,
      status: generated.status,
    },
  });

  return NextResponse.json(chicken, { status: 201 });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/chickens/route.ts lib/__tests__/chickens-route.test.ts
git commit -m "feat: add GET/POST /api/chickens"
```

---

### Task 7: `GET /api/chickens/:id`

**Files:**
- Create: `app/api/chickens/[id]/route.ts`
- Test: `lib/__tests__/chicken-detail-route.test.ts`

**Interfaces:**
- Consumes: `prisma` (Task 3)
- Produces: `GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response>` — consumed by Task 10 (UI detail view, if extended to fetch by id; the coop page in this plan renders detail from the already-fetched list, so this route is exercised directly by tests and available for future use)

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/chicken-detail-route.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../db";
import { POST as createChicken } from "../../app/api/chickens/route";
import { GET } from "../../app/api/chickens/[id]/route";

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("GET /api/chickens/:id returns the chicken", async () => {
  const created = await (await createChicken()).json();

  const response = await GET(new Request("http://localhost/api/chickens/" + created.id), {
    params: Promise.resolve({ id: created.id }),
  });

  assert.equal(response.status, 200);
  const chicken = await response.json();
  assert.equal(chicken.id, created.id);
});

test("GET /api/chickens/:id returns 404 for an unknown id", async () => {
  const response = await GET(new Request("http://localhost/api/chickens/missing"), {
    params: Promise.resolve({ id: "missing" }),
  });
  assert.equal(response.status, 404);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL — `../../app/api/chickens/[id]/route` does not exist.

- [ ] **Step 3: Implement**

Create `app/api/chickens/[id]/route.ts`:

```ts
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chicken = await prisma.chicken.findUnique({ where: { id } });

  if (!chicken) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  return NextResponse.json(chicken);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add "app/api/chickens/[id]/route.ts" lib/__tests__/chicken-detail-route.test.ts
git commit -m "feat: add GET /api/chickens/:id"
```

---

### Task 8: `POST /api/breed`

**Files:**
- Create: `app/api/breed/route.ts`
- Test: `lib/__tests__/breed-route.test.ts`

**Interfaces:**
- Consumes: `prisma`, `getOrCreatePlayer` (Task 3), `inheritStatBlock` (Task 4), `inheritTraits` (Task 5), `StatBlock`/`Trait` (`lib/types.ts`)
- Produces: `POST(req: Request): Promise<Response>` — consumed by Task 11 (UI breed page)

- [ ] **Step 1: Write the failing tests**

Create `lib/__tests__/breed-route.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { POST } from "../../app/api/breed/route";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

function zeroBlock(): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = 50));
  return block;
}

async function seedChicken(overrides: Partial<{ sex: string; generation: number; bloodlineId: string }>) {
  const player = await getOrCreatePlayer();
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id,
      playerId: player.id,
      name: "Test",
      sex: overrides.sex ?? "rooster",
      generation: overrides.generation ?? 0,
      bloodlineId: overrides.bloodlineId ?? id,
      iv: zeroBlock(),
      ev: zeroBlock(),
      traits: [],
      age: 1,
      health: 100,
      energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
    },
  });
  return id;
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/breed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/breed creates an egg with the rooster's bloodline and generation + 1", async () => {
  const fatherId = await seedChicken({ sex: "rooster", generation: 2, bloodlineId: "father-line" });
  const motherId = await seedChicken({ sex: "hen", generation: 1 });

  const response = await POST(postRequest({ fatherId, motherId }));
  assert.equal(response.status, 201);

  const egg = await response.json();
  assert.equal(egg.bloodlineId, "father-line");
  assert.equal(egg.generation, 3);
  assert.equal(egg.status, "incubating");
  for (const key of GENETIC_STAT_KEYS) {
    assert.ok(egg.iv[key] >= 1 && egg.iv[key] <= 99);
  }
});

test("POST /api/breed rejects two roosters", async () => {
  const fatherId = await seedChicken({ sex: "rooster" });
  const secondRoosterId = await seedChicken({ sex: "rooster" });

  const response = await POST(postRequest({ fatherId, motherId: secondRoosterId }));
  assert.equal(response.status, 400);
});

test("POST /api/breed rejects a missing parent id", async () => {
  const fatherId = await seedChicken({ sex: "rooster" });

  const response = await POST(postRequest({ fatherId, motherId: "does-not-exist" }));
  assert.equal(response.status, 404);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `yarn test`
Expected: FAIL — `../../app/api/breed/route` does not exist.

- [ ] **Step 3: Implement**

Create `app/api/breed/route.ts`:

```ts
import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { inheritStatBlock } from "@/lib/genetics";
import { getOrCreatePlayer } from "@/lib/player";
import { inheritTraits } from "@/lib/traits";
import type { StatBlock, Trait } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { fatherId?: string; motherId?: string };
  const { fatherId, motherId } = body;

  if (!fatherId || !motherId) {
    return NextResponse.json({ error: "fatherId and motherId are required" }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  const [father, mother] = await Promise.all([
    prisma.chicken.findUnique({ where: { id: fatherId } }),
    prisma.chicken.findUnique({ where: { id: motherId } }),
  ]);

  if (!father || !mother) {
    return NextResponse.json({ error: "Both parents must exist" }, { status: 404 });
  }
  if (father.playerId !== player.id || mother.playerId !== player.id) {
    return NextResponse.json({ error: "Both parents must be owned by the player" }, { status: 403 });
  }
  if (father.sex !== "rooster" || mother.sex !== "hen") {
    return NextResponse.json(
      { error: "fatherId must be a rooster and motherId must be a hen" },
      { status: 400 }
    );
  }

  const iv = inheritStatBlock(father.iv as unknown as StatBlock, mother.iv as unknown as StatBlock);
  const traits = inheritTraits(father.traits as unknown as Trait[], mother.traits as unknown as Trait[]);
  const generation = Math.max(father.generation, mother.generation) + 1;

  const egg = await prisma.egg.create({
    data: {
      id: randomUUID(),
      playerId: player.id,
      fatherId: father.id,
      motherId: mother.id,
      bloodlineId: father.bloodlineId,
      generation,
      sex: Math.random() < 0.5 ? "rooster" : "hen",
      iv,
      traits,
      status: "incubating",
    },
  });

  return NextResponse.json(egg, { status: 201 });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `yarn test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/breed/route.ts lib/__tests__/breed-route.test.ts
git commit -m "feat: add POST /api/breed"
```

---

### Task 9: `GET /api/eggs`

**Files:**
- Create: `app/api/eggs/route.ts`
- Test: `lib/__tests__/eggs-route.test.ts`

**Interfaces:**
- Consumes: `prisma`, `getOrCreatePlayer` (Task 3)
- Produces: `GET(): Promise<Response>` — consumed by Task 11 (UI breed page's Nest list)

- [ ] **Step 1: Write the failing test**

Create `lib/__tests__/eggs-route.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { GET } from "../../app/api/eggs/route";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("GET /api/eggs lists the player's eggs", async () => {
  const player = await getOrCreatePlayer();
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = 50));

  await prisma.egg.create({
    data: {
      id: randomUUID(),
      playerId: player.id,
      fatherId: randomUUID(),
      motherId: randomUUID(),
      bloodlineId: "line-1",
      generation: 1,
      sex: "hen",
      iv: block,
      traits: [],
      status: "incubating",
    },
  });

  const response = await GET();
  const eggs = await response.json();
  assert.equal(eggs.length, 1);
  assert.equal(eggs[0].bloodlineId, "line-1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test`
Expected: FAIL — `../../app/api/eggs/route` does not exist.

- [ ] **Step 3: Implement**

Create `app/api/eggs/route.ts`:

```ts
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";

export async function GET() {
  const player = await getOrCreatePlayer();
  const eggs = await prisma.egg.findMany({
    where: { playerId: player.id },
    orderBy: { laidAt: "asc" },
  });
  return NextResponse.json(eggs);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add app/api/eggs/route.ts lib/__tests__/eggs-route.test.ts
git commit -m "feat: add GET /api/eggs"
```

---

### Task 10: Nav + Coop page

**Files:**
- Create: `components/Nav.tsx`
- Modify: `app/layout.tsx` (render `<Nav />`)
- Create: `app/coop/page.tsx`
- Create: `app/coop/ChickenCard.tsx`

**Interfaces:**
- Consumes: `Chicken` type (`lib/types.ts`), `GET/POST /api/chickens` (Task 6)
- Produces: `/coop` route, `<ChickenCard>` component (rendered only here this round)

- [ ] **Step 1: Create the nav**

Create `components/Nav.tsx`:

```tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Battle" },
  { href: "/coop", label: "Coop" },
  { href: "/breed", label: "Breed" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 border-b border-neutral-800 px-4 py-3">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            pathname === link.href
              ? "font-semibold text-amber-400"
              : "text-neutral-400 hover:text-neutral-200"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
```

- [ ] **Step 2: Render the nav in the layout**

Open `app/layout.tsx`, find the `<body>` element, and add `<Nav />` as its first child (import `{ Nav } from "@/components/Nav"` at the top).

- [ ] **Step 3: Create the chicken card**

Create `app/coop/ChickenCard.tsx`:

```tsx
import type { Chicken } from "@/lib/types";

export function ChickenCard({ chicken, onSelect }: { chicken: Chicken; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="rounded border border-neutral-800 bg-neutral-900 p-4 text-left hover:border-amber-500"
    >
      <p className="font-semibold text-neutral-100">{chicken.name}</p>
      <p className="text-sm text-neutral-400">
        {chicken.sex} · Gen {chicken.generation}
      </p>
    </button>
  );
}
```

- [ ] **Step 4: Create the coop page**

Create `app/coop/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

import type { Chicken } from "@/lib/types";

import { ChickenCard } from "./ChickenCard";

export default function CoopPage() {
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [selected, setSelected] = useState<Chicken | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/chickens")
      .then((res) => res.json())
      .then((data: Chicken[]) => setChickens(data))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    const res = await fetch("/api/chickens", { method: "POST" });
    const chicken: Chicken = await res.json();
    setChickens((prev) => [...prev, chicken]);
  }

  if (loading) {
    return <p className="p-6 text-neutral-400">Loading coop...</p>;
  }

  return (
    <main className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-100">Coop</h1>
        <button
          onClick={handleGenerate}
          className="rounded bg-amber-500 px-4 py-2 font-semibold text-neutral-900 hover:bg-amber-400"
        >
          Generate Chicken
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {chickens.map((chicken) => (
          <ChickenCard key={chicken.id} chicken={chicken} onSelect={() => setSelected(chicken)} />
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-w-md rounded bg-neutral-900 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-2 text-xl font-bold text-neutral-100">{selected.name}</h2>
            <p className="text-neutral-400">
              {selected.sex} · Gen {selected.generation}
            </p>

            <h3 className="mt-4 font-semibold text-neutral-200">IV</h3>
            <ul className="text-sm text-neutral-400">
              {Object.entries(selected.iv).map(([stat, value]) => (
                <li key={stat}>
                  {stat}: {value}
                </li>
              ))}
            </ul>

            <h3 className="mt-4 font-semibold text-neutral-200">EV</h3>
            <ul className="text-sm text-neutral-400">
              {Object.entries(selected.ev).map(([stat, value]) => (
                <li key={stat}>
                  {stat}: {value}
                </li>
              ))}
            </ul>

            <h3 className="mt-4 font-semibold text-neutral-200">Traits</h3>
            <p className="text-sm text-neutral-400">
              {selected.traits.length ? selected.traits.map((t) => t.name).join(", ") : "None"}
            </p>

            <h3 className="mt-4 font-semibold text-neutral-200">Record</h3>
            <p className="text-sm text-neutral-400">
              {selected.record.wins}W - {selected.record.losses}L · {selected.record.championships}{" "}
              championships
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
```

- [ ] **Step 5: Typecheck**

Run: `yarn tsc --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add components/Nav.tsx app/layout.tsx app/coop
git commit -m "feat: add nav and Coop page"
```

---

### Task 11: Breed page

**Files:**
- Create: `app/breed/page.tsx`

**Interfaces:**
- Consumes: `Chicken`, `Egg` types (`lib/types.ts`), `GET /api/chickens` (Task 6), `POST /api/breed` (Task 8), `GET /api/eggs` (Task 9)
- Produces: `/breed` route

- [ ] **Step 1: Create the breed page**

Create `app/breed/page.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

import type { Chicken, Egg } from "@/lib/types";

export default function BreedPage() {
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [fatherId, setFatherId] = useState("");
  const [motherId, setMotherId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/chickens").then((res) => res.json()).then(setChickens);
    fetch("/api/eggs").then((res) => res.json()).then(setEggs);
  }, []);

  const roosters = chickens.filter((c) => c.sex === "rooster");
  const hens = chickens.filter((c) => c.sex === "hen");

  async function handleBreed() {
    setError(null);
    const res = await fetch("/api/breed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fatherId, motherId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Breeding failed");
      return;
    }

    const egg: Egg = await res.json();
    setEggs((prev) => [...prev, egg]);
  }

  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-neutral-100">Breed</h1>

      <div className="mb-6 flex gap-4">
        <select
          value={fatherId}
          onChange={(event) => setFatherId(event.target.value)}
          className="rounded bg-neutral-800 p-2 text-neutral-100"
        >
          <option value="">Select rooster</option>
          {roosters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={motherId}
          onChange={(event) => setMotherId(event.target.value)}
          className="rounded bg-neutral-800 p-2 text-neutral-100"
        >
          <option value="">Select hen</option>
          {hens.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleBreed}
          disabled={!fatherId || !motherId}
          className="rounded bg-amber-500 px-4 py-2 font-semibold text-neutral-900 hover:bg-amber-400 disabled:opacity-50"
        >
          Breed
        </button>
      </div>

      {error && <p className="mb-4 text-red-400">{error}</p>}

      <h2 className="mb-2 text-xl font-bold text-neutral-100">Nest</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {eggs.map((egg) => (
          <div key={egg.id} className="rounded border border-neutral-800 bg-neutral-900 p-4">
            <p className="font-semibold text-neutral-100">Egg · {egg.sex}</p>
            <p className="text-sm text-neutral-400">
              Gen {egg.generation} · {egg.status}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `yarn tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add app/breed
git commit -m "feat: add Breed page"
```

---

### Task 12: Manual verification

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `yarn db:up && npx prisma migrate deploy && yarn test`
Expected: all tests pass.

- [ ] **Step 2: Run the app and exercise the flow with the `run` skill / browser automation**

Start the dev server, then in-browser:
1. Go to `/coop`, click "Generate Chicken" at least 4 times until at least one rooster and one hen exist (regenerate if the random sex doesn't cooperate).
2. Click a chicken card, confirm the detail modal shows IV, EV, traits, and record.
3. Go to `/breed`, select a rooster and a hen, click "Breed".
4. Confirm a new egg appears in the Nest with a generation of `max(parent generations) + 1` and IV values in range.
5. Try breeding two roosters (via direct API call if the UI prevents it, e.g. `fetch("/api/breed", {method:"POST", headers:{"Content-Type":"application/json"}, body: JSON.stringify({fatherId: "<id>", motherId: "<same-sex-id>"})})` in the browser console) and confirm a 400 error.

- [ ] **Step 3: Report results**

Confirm all steps above worked as expected before considering the plan complete.
