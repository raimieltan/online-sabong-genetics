# Facilities System — Phase 1: Training Facility Foundation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent, extensible Facility framework and its first facility — the Training Gym — that wraps the existing instant-training system in server-authoritative, duration-based, offline-friendly training sessions, without altering genetics, growth, fatigue formulas, or breaking any existing route.

**Architecture:** Two new Prisma models (`Facility`, `TrainingSession`) sit alongside the existing `Chicken`/`Player` models. A new `lib/facilities/` module holds config (levels, programs, upgrade costs), a service layer (ownership, capacity, session lifecycle, lazy offline completion), and typed errors. New API routes expose facility/session operations; a new `/training` page and a link from the chicken detail page expose them to players. All stat math is delegated to the **existing** `lib/training/development.ts` (`applyDevelopment`), `lib/training/limits.ts` (`trainingEffectiveness`, `canAffordTrainingPoints`, `overtrainingInjuryChance`), `lib/growth.ts` (`canTrain`, `growthFactor`), and `lib/career/aging.ts` (`declineMultiplier`, `deriveLifeStage`) — the facility only multiplies `baseGain` before it enters that pipeline and swaps the flat per-session energy/fatigue/duration constants for per-program values.

**Tech Stack:** Next.js App Router API routes, Prisma/PostgreSQL, `node:test` + `node:assert/strict` (matches existing `lib/__tests__/*.test.ts` convention — flat directory, non-recursive glob), Tailwind (existing `panel-wood` / `panel-parchment` / `--color-gold*` design tokens).

**Spec:** The Phase 1 spec is the user's message that opened this session (sections 1–72, "Facilities System — Phase 1: Training Facility Foundation"). No separate file exists on disk; this plan is the durable artifact of that spec. Quotes below reference its section numbers (e.g. "§59").

## Global Constraints

- Test files must live flat in `lib/__tests__/*.test.ts` — `package.json`'s `test` script glob (`lib/__tests__/*.test.ts`) is **not** recursive; a nested folder's tests will silently never run.
- Tests run against a real Postgres via Prisma (`docker-compose.yml`) — no mocking framework exists in this repo; follow `lib/__tests__/train-route.test.ts`'s pattern of calling route handlers directly with real `Request` objects against the real (test) database, with a `test.beforeEach` that truncates via `prisma.<model>.deleteMany()`.
- Never introduce a second stat-growth or diminishing-returns formula (§13, §68) — every adaptation calculation must call the existing `applyDevelopment()` / `trainingEffectiveness()`.
- Never let the client supply `facilityLevel`, `adaptationAmount`, `fatigueAmount`, `completionTime`, or `trainingResult` as authoritative (§27) — routes only ever accept `chickenId`, `programId`, and (for the three Level-5 programs only) a `category` selection.
- Do not touch Medical/Research/Genetics/Nutrition systems, construction timers, or a second currency (§3, §26).
- Do not delete or modify `app/api/chickens/[id]/train/route.ts` or its test — it stays as-is; the new UI simply stops calling it (§42's "route through the facility" is satisfied by the UI, not by removing the legacy endpoint, to avoid regressing its existing passing test).
- Existing players must never lose chickens/stats/genetics/history (§41) — the Training Gym is lazily created on first access (`getOrCreateTrainingGym`), mirroring `lib/player.ts`'s `getOrCreatePlayer` pattern.

---

## File Structure

```
prisma/schema.prisma                                  # + Facility, TrainingSession models
prisma/migrations/<ts>_add_facilities/migration.sql    # generated + hand-added partial unique index

lib/facilities/
  types.ts        # FacilityType, ProgramId, TrainingSessionStatus, ProgramDefinition, FacilityLevelConfig
  config.ts       # TRAINING_GYM_LEVELS, TRAINING_GYM_UPGRADES, TRAINING_PROGRAMS (single source of truth)
  errors.ts       # FacilityError (code + http status)
  service.ts       # getOrCreateTrainingGym, facilityView, claimExpiredSessions, startTrainingSession,
                    # cancelTrainingSession, upgradeFacility

lib/dev.ts        # isDevModeEnabled() — the one gate every dev-only route checks

app/api/facilities/route.ts                      # GET  — current player's gym + active sessions (claims expired first)
app/api/facilities/[id]/upgrade/route.ts         # POST — upgrade
app/api/training-sessions/route.ts               # GET list / POST start
app/api/training-sessions/[id]/cancel/route.ts   # POST cancel
app/api/dev/facilities/route.ts                  # POST — dev-only actions, no-op outside dev mode

app/training/page.tsx           # Facility dashboard + program grid + start-session flow
app/chicken/[chickenId]/page.tsx  # MODIFY — Stats tab: replace per-stat instant Train buttons with a
                                    # "Go to Training Gym" link; Info tab: training history line stays,
                                    # extended to show programId when present
app/page.tsx                    # MODIFY — add a "🏋️ Training Gym" home link

lib/types.ts                    # MODIFY — TrainingState.history entries gain optional `programId?: string`

lib/__tests__/facility-config.test.ts
lib/__tests__/facility-service.test.ts
lib/__tests__/facility-routes.test.ts
lib/__tests__/dev-facility-route.test.ts
```

---

### Task 1: Prisma schema — `Facility` and `TrainingSession`

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration via `prisma migrate dev` (name it `add_facilities`)

**Interfaces:**
- Produces: Prisma models `Facility { id, playerId, type, level, createdAt, updatedAt }` and `TrainingSession { id, playerId, chickenId, facilityId, programId, category, status, startedAt, durationMinutes, energyCost, fatigueCost, workload, adaptationResult, completedAt, createdAt }`. Every later task's Prisma calls (`prisma.facility.*`, `prisma.trainingSession.*`) depend on these exact field names.

`TrainingSession.chickenId` is a **plain string, not a Prisma relation** — the `Chicken` model is not modified, per the Global Constraints ("do not duplicate existing Chicken... data" / avoid any risk to existing Chicken migrations).

- [ ] **Step 1: Add the models**

In `prisma/schema.prisma`, add after the `Egg` model:

```prisma
model Facility {
  id        String   @id @default(uuid())
  playerId  String
  player    Player   @relation(fields: [playerId], references: [id])
  type      String
  level     Int      @default(1)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  sessions  TrainingSession[]

  @@unique([playerId, type])
}

model TrainingSession {
  id               String    @id @default(uuid())
  playerId         String
  chickenId        String
  facilityId       String
  facility         Facility  @relation(fields: [facilityId], references: [id])
  programId        String
  category         String
  status           String    @default("ACTIVE")
  startedAt        DateTime  @default(now())
  durationMinutes  Int
  energyCost       Int
  fatigueCost      Int
  workload         Int       @default(1)
  adaptationResult Json?
  completedAt      DateTime?
  createdAt        DateTime  @default(now())
}
```

And add the back-relation on `Player`:

```prisma
model Player {
  id               String    @id @default(uuid())
  createdAt        DateTime  @default(now())
  credits          Int       @default(1000)
  tournamentTokens Int       @default(0)
  chickens         Chicken[]
  eggs             Egg[]
  facilities       Facility[]
}
```

- [ ] **Step 2: Generate the migration**

Run: `npx prisma migrate dev --name add_facilities`
Expected: a new `prisma/migrations/<timestamp>_add_facilities/migration.sql` is created and applied to the dev DB without error.

- [ ] **Step 3: Add the partial unique index (concurrency guard, §29)**

Open the generated `migration.sql` and append:

```sql
CREATE UNIQUE INDEX "TrainingSession_active_chicken_idx"
  ON "TrainingSession" ("chickenId")
  WHERE "status" = 'ACTIVE';
```

Re-run `npx prisma migrate dev` (it will detect the file changed under a still-unapplied-in-shadow-db state — if Prisma complains the migration already applied, instead run the SQL directly: `npx prisma db execute --file <path-to-sql-snippet> --schema prisma/schema.prisma`, or simply hand-edit the migration file **before** the first `migrate dev` apply). Confirm via:

```bash
npx prisma db execute --stdin <<< "select indexname from pg_indexes where tablename='TrainingSession';" --schema prisma/schema.prisma
```

Expected: `TrainingSession_active_chicken_idx` is listed.

- [ ] **Step 4: Regenerate the Prisma client**

Run: `npx prisma generate`
Expected: no errors; `@prisma/client` now exports `Facility` and `TrainingSession` types.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(facilities): add Facility and TrainingSession models"
```

---

### Task 2: Central facility/program configuration

**Files:**
- Create: `lib/facilities/types.ts`
- Create: `lib/facilities/config.ts`
- Test: `lib/__tests__/facility-config.test.ts`

**Interfaces:**
- Consumes: `TrainingCategory`, `TRAINING_CATEGORIES` from `lib/types.ts`.
- Produces: `FacilityType`, `ProgramId`, `TrainingSessionStatus`, `ProgramDefinition`, `TRAINING_GYM_LEVELS`, `TRAINING_GYM_UPGRADES`, `TRAINING_PROGRAMS`, `programsUnlockedAtLevel(level)`, `isProgramUnlocked(programId, level)` — every later task imports from here, never redefines a number inline.

- [ ] **Step 1: Write `lib/facilities/types.ts`**

```typescript
import type { TrainingCategory } from "../types";

export type FacilityType = "TRAINING_GYM";

export const FACILITY_TYPES: readonly FacilityType[] = ["TRAINING_GYM"];

export type TrainingSessionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export type ProgramId =
  | "STRENGTH"
  | "SPEED"
  | "ENDURANCE"
  | "AGILITY"
  | "REACTION"
  | "BALANCE"
  | "POWER_CONDITIONING"
  | "SPRINT"
  | "ADVANCED_REACTION"
  | "EXPLOSIVE_CONDITIONING"
  | "ADVANCED_AGILITY"
  | "ADVANCED_ENDURANCE"
  | "RECOVERY_TRAINING"
  | "PRECISION_STRENGTH"
  | "PRECISION_SPEED"
  | "PRECISION_REACTION"
  | "ADVANCED_CONDITIONING"
  | "CUSTOM_TRAINING"
  | "SPECIALIZED_CONDITIONING"
  | "ADVANCED_ADAPTATION";

/** "custom" means the player supplies `category` (any TrainingCategory) at session start (§56-58). */
export type ProgramCategory = TrainingCategory | "custom";

export type ProgramDefinition = {
  id: ProgramId;
  name: string;
  description: string;
  category: ProgramCategory;
  requiredFacilityType: FacilityType;
  requiredFacilityLevel: number;
  durationMinutes: number;
  energyCost: number;
  fatigueCost: number;
  workload: number;
  /** Base adaptation gain fed into applyDevelopment()'s baseGain, before facility efficiency (§59). */
  baseGain: number;
};

export type FacilityLevelConfig = {
  capacity: number;
  efficiency: number;
  programs: ProgramId[];
};
```

- [ ] **Step 2: Write `lib/facilities/config.ts`**

```typescript
import type { FacilityLevelConfig, ProgramDefinition, ProgramId } from "./types";

export const TRAINING_PROGRAMS: Record<ProgramId, ProgramDefinition> = {
  STRENGTH: {
    id: "STRENGTH", name: "Strength Training", description: "Develop physical strength.",
    category: "strength", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 30, energyCost: 18, fatigueCost: 14, workload: 1, baseGain: 2.0,
  },
  SPEED: {
    id: "SPEED", name: "Speed Training", description: "Develop movement speed.",
    category: "speed", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 30, energyCost: 17, fatigueCost: 13, workload: 1, baseGain: 2.0,
  },
  ENDURANCE: {
    id: "ENDURANCE", name: "Endurance Training", description: "Improve sustained performance.",
    category: "stamina", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 45, energyCost: 24, fatigueCost: 18, workload: 1, baseGain: 2.5,
  },
  AGILITY: {
    id: "AGILITY", name: "Agility Training", description: "Improve movement and directional changes.",
    category: "agility", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 30, energyCost: 16, fatigueCost: 12, workload: 1, baseGain: 2.0,
  },
  REACTION: {
    id: "REACTION", name: "Reaction Training", description: "Improve reaction-oriented physical development.",
    category: "technique", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 25, energyCost: 15, fatigueCost: 10, workload: 1, baseGain: 2.0,
  },
  BALANCE: {
    id: "BALANCE", name: "Balance Training", description: "Improve stability and physical control.",
    category: "discipline", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 1,
    durationMinutes: 25, energyCost: 14, fatigueCost: 9, workload: 1, baseGain: 1.75,
  },
  POWER_CONDITIONING: {
    id: "POWER_CONDITIONING", name: "Power Conditioning", description: "High-output strength/power development.",
    category: "strength", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 2,
    durationMinutes: 40, energyCost: 25, fatigueCost: 20, workload: 1, baseGain: 3.0,
  },
  SPRINT: {
    id: "SPRINT", name: "Sprint Training", description: "Stronger than basic speed work, more taxing.",
    category: "speed", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 2,
    durationMinutes: 35, energyCost: 23, fatigueCost: 18, workload: 1, baseGain: 2.75,
  },
  ADVANCED_REACTION: {
    id: "ADVANCED_REACTION", name: "Advanced Reaction Drills", description: "Gateway toward Phase 2 behavioral development.",
    category: "technique", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 2,
    durationMinutes: 35, energyCost: 22, fatigueCost: 16, workload: 1, baseGain: 3.0,
  },
  EXPLOSIVE_CONDITIONING: {
    id: "EXPLOSIVE_CONDITIONING", name: "Explosive Conditioning", description: "Maximum physical development, expensive.",
    category: "strength", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 3,
    durationMinutes: 45, energyCost: 30, fatigueCost: 24, workload: 1, baseGain: 3.5,
  },
  ADVANCED_AGILITY: {
    id: "ADVANCED_AGILITY", name: "Advanced Agility", description: "Deeper agility/balance/movement work.",
    category: "agility", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 3,
    durationMinutes: 40, energyCost: 22, fatigueCost: 16, workload: 1, baseGain: 3.0,
  },
  ADVANCED_ENDURANCE: {
    id: "ADVANCED_ENDURANCE", name: "Advanced Endurance", description: "The longest basic conditioning session.",
    category: "stamina", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 3,
    durationMinutes: 60, energyCost: 32, fatigueCost: 25, workload: 1, baseGain: 3.5,
  },
  RECOVERY_TRAINING: {
    id: "RECOVERY_TRAINING", name: "Recovery Training",
    description: "Low-intensity training that assists normal recovery. Not medical treatment — cannot heal injuries.",
    category: "recovery", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 3,
    durationMinutes: 30, energyCost: 8, fatigueCost: 3, workload: 1, baseGain: 1.0,
  },
  PRECISION_STRENGTH: {
    id: "PRECISION_STRENGTH", name: "Precision Strength", description: "Efficiency over raw output.",
    category: "strength", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 4,
    durationMinutes: 40, energyCost: 22, fatigueCost: 16, workload: 1, baseGain: 3.0,
  },
  PRECISION_SPEED: {
    id: "PRECISION_SPEED", name: "Precision Speed", description: "Efficiency over raw output.",
    category: "speed", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 4,
    durationMinutes: 40, energyCost: 21, fatigueCost: 15, workload: 1, baseGain: 3.0,
  },
  PRECISION_REACTION: {
    id: "PRECISION_REACTION", name: "Precision Reaction", description: "Efficiency over raw output.",
    category: "technique", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 4,
    durationMinutes: 35, energyCost: 19, fatigueCost: 13, workload: 1, baseGain: 3.25,
  },
  ADVANCED_CONDITIONING: {
    id: "ADVANCED_CONDITIONING", name: "Advanced Conditioning", description: "Endurance-led all-round conditioning.",
    category: "stamina", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 4,
    durationMinutes: 50, energyCost: 28, fatigueCost: 21, workload: 1, baseGain: 2.5,
  },
  CUSTOM_TRAINING: {
    id: "CUSTOM_TRAINING", name: "Custom Training", description: "Player-directed specialization.",
    category: "custom", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 5,
    durationMinutes: 45, energyCost: 24, fatigueCost: 17, workload: 1, baseGain: 3.25,
  },
  SPECIALIZED_CONDITIONING: {
    id: "SPECIALIZED_CONDITIONING", name: "Specialized Conditioning", description: "Powerful and expensive; caps still apply.",
    category: "custom", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 5,
    durationMinutes: 60, energyCost: 34, fatigueCost: 25, workload: 1, baseGain: 4.0,
  },
  ADVANCED_ADAPTATION: {
    id: "ADVANCED_ADAPTATION", name: "Advanced Adaptation Program", description: "One of the strongest Phase 1 programs; heavily diminished near potential.",
    category: "custom", requiredFacilityType: "TRAINING_GYM", requiredFacilityLevel: 5,
    durationMinutes: 75, energyCost: 40, fatigueCost: 30, workload: 1, baseGain: 4.5,
  },
};

function programsUpTo(level: number): ProgramId[] {
  return (Object.values(TRAINING_PROGRAMS) as ProgramDefinition[])
    .filter((p) => p.requiredFacilityLevel <= level)
    .map((p) => p.id);
}

export const TRAINING_GYM_LEVELS: Record<number, FacilityLevelConfig> = {
  1: { capacity: 2, efficiency: 1.0, programs: programsUpTo(1) },
  2: { capacity: 3, efficiency: 1.05, programs: programsUpTo(2) },
  3: { capacity: 4, efficiency: 1.1, programs: programsUpTo(3) },
  4: { capacity: 5, efficiency: 1.15, programs: programsUpTo(4) },
  5: { capacity: 6, efficiency: 1.2, programs: programsUpTo(5) },
};

export const TRAINING_GYM_MAX_LEVEL = 5;

export const TRAINING_GYM_UPGRADES: Record<number, { cost: number }> = {
  2: { cost: 1000 },
  3: { cost: 2500 },
  4: { cost: 5000 },
  5: { cost: 10000 },
};

export function isProgramUnlocked(programId: ProgramId, level: number): boolean {
  return TRAINING_GYM_LEVELS[level]?.programs.includes(programId) ?? false;
}
```

- [ ] **Step 3: Write the failing test first**

`lib/__tests__/facility-config.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";

import {
  TRAINING_GYM_LEVELS,
  TRAINING_GYM_UPGRADES,
  TRAINING_PROGRAMS,
  isProgramUnlocked,
} from "../facilities/config";

test("level 1 unlocks exactly the six basic programs", () => {
  assert.deepEqual(
    [...TRAINING_GYM_LEVELS[1].programs].sort(),
    ["AGILITY", "BALANCE", "ENDURANCE", "REACTION", "SPEED", "STRENGTH"],
  );
});

test("level 2 programs are locked at level 1", () => {
  assert.equal(isProgramUnlocked("POWER_CONDITIONING", 1), false);
  assert.equal(isProgramUnlocked("POWER_CONDITIONING", 2), true);
});

test("capacity and efficiency increase monotonically with level", () => {
  for (let level = 1; level < 5; level++) {
    assert.ok(TRAINING_GYM_LEVELS[level + 1].capacity > TRAINING_GYM_LEVELS[level].capacity);
    assert.ok(TRAINING_GYM_LEVELS[level + 1].efficiency > TRAINING_GYM_LEVELS[level].efficiency);
  }
});

test("every program declares a positive duration, energy, fatigue and baseGain", () => {
  for (const program of Object.values(TRAINING_PROGRAMS)) {
    assert.ok(program.durationMinutes > 0, program.id);
    assert.ok(program.energyCost > 0, program.id);
    assert.ok(program.fatigueCost > 0, program.id);
    assert.ok(program.baseGain > 0, program.id);
  }
});

test("upgrade costs are configured for levels 2-5 only", () => {
  assert.deepEqual(Object.keys(TRAINING_GYM_UPGRADES).map(Number).sort(), [2, 3, 4, 5]);
  assert.equal(TRAINING_GYM_UPGRADES[5].cost, 10000);
});
```

- [ ] **Step 4: Run test to verify it fails, then implement, then verify it passes**

Run: `npm test -- lib/__tests__/facility-config.test.ts` — actually the script hardcodes the glob, so run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/facility-config.test.ts`
Expected before Step 1/2: FAIL (module not found). After: PASS, all 5 tests green.

- [ ] **Step 5: Commit**

```bash
git add lib/facilities/types.ts lib/facilities/config.ts lib/__tests__/facility-config.test.ts
git commit -m "feat(facilities): add centralized Training Gym level/program configuration"
```

---

### Task 3: Errors + `getOrCreateTrainingGym` + `facilityView`

**Files:**
- Create: `lib/facilities/errors.ts`
- Create: `lib/facilities/service.ts` (this task only: the two functions below; Task 4/5 add the rest to the same file)
- Test: `lib/__tests__/facility-service.test.ts` (this task's tests only; Task 4/5 append)

**Interfaces:**
- Consumes: `prisma` from `lib/db`, `TRAINING_GYM_LEVELS` / `FacilityType` from Task 2.
- Produces: `FacilityError`, `getOrCreateTrainingGym(playerId: string): Promise<Facility>` (Prisma `Facility` row), `facilityView(facility: Facility): { id, type, level, capacity, efficiency, unlockedPrograms }` — Task 4/6 both call these by these exact names.

- [ ] **Step 1: Write `lib/facilities/errors.ts`**

```typescript
export type FacilityErrorCode =
  | "FACILITY_NOT_FOUND"
  | "FACILITY_NOT_OWNED"
  | "PROGRAM_LOCKED"
  | "PROGRAM_NOT_FOUND"
  | "FACILITY_CAPACITY_FULL"
  | "CHICKEN_NOT_FOUND"
  | "CHICKEN_NOT_OWNED"
  | "CHICKEN_ALREADY_TRAINING"
  | "CHICKEN_NOT_ELIGIBLE"
  | "INSUFFICIENT_ENERGY"
  | "TRAINING_LIMIT_REACHED"
  | "FACILITY_MAX_LEVEL"
  | "INSUFFICIENT_RESOURCES"
  | "SESSION_NOT_FOUND"
  | "SESSION_NOT_ACTIVE"
  | "INVALID_CATEGORY";

const STATUS_BY_CODE: Record<FacilityErrorCode, number> = {
  FACILITY_NOT_FOUND: 404,
  FACILITY_NOT_OWNED: 404,
  PROGRAM_LOCKED: 400,
  PROGRAM_NOT_FOUND: 400,
  FACILITY_CAPACITY_FULL: 400,
  CHICKEN_NOT_FOUND: 404,
  CHICKEN_NOT_OWNED: 404,
  CHICKEN_ALREADY_TRAINING: 400,
  CHICKEN_NOT_ELIGIBLE: 400,
  INSUFFICIENT_ENERGY: 400,
  TRAINING_LIMIT_REACHED: 400,
  FACILITY_MAX_LEVEL: 400,
  INSUFFICIENT_RESOURCES: 400,
  SESSION_NOT_FOUND: 404,
  SESSION_NOT_ACTIVE: 400,
  INVALID_CATEGORY: 400,
};

export class FacilityError extends Error {
  code: FacilityErrorCode;
  status: number;

  constructor(code: FacilityErrorCode) {
    super(code);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}
```

- [ ] **Step 2: Write the failing test**

`lib/__tests__/facility-service.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { getOrCreateTrainingGym, facilityView } from "../facilities/service";

test.beforeEach(async () => {
  await prisma.trainingSession.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("getOrCreateTrainingGym creates a level-1 gym for a new player", async () => {
  const player = await getOrCreatePlayer();
  const facility = await getOrCreateTrainingGym(player.id);

  assert.equal(facility.type, "TRAINING_GYM");
  assert.equal(facility.level, 1);
  assert.equal(facility.playerId, player.id);
});

test("getOrCreateTrainingGym is idempotent — a second call returns the same row", async () => {
  const player = await getOrCreatePlayer();
  const first = await getOrCreateTrainingGym(player.id);
  const second = await getOrCreateTrainingGym(player.id);

  assert.equal(first.id, second.id);
  const count = await prisma.facility.count({ where: { playerId: player.id } });
  assert.equal(count, 1);
});

test("facilityView derives capacity/efficiency/unlockedPrograms from level, never stores them", async () => {
  const player = await getOrCreatePlayer();
  const facility = await getOrCreateTrainingGym(player.id);
  const view = facilityView(facility);

  assert.equal(view.capacity, 2);
  assert.equal(view.efficiency, 1.0);
  assert.ok(view.unlockedPrograms.includes("STRENGTH"));
  assert.equal(view.unlockedPrograms.includes("POWER_CONDITIONING"), false);
});

test("each player owns their own gym — two players get two separate facilities", async () => {
  const playerA = await getOrCreatePlayer();
  const playerB = await prisma.player.create({ data: {} });

  const facilityA = await getOrCreateTrainingGym(playerA.id);
  const facilityB = await getOrCreateTrainingGym(playerB.id);

  assert.notEqual(facilityA.id, facilityB.id);
});
```

- [ ] **Step 3: Run to verify failure**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/facility-service.test.ts`
Expected: FAIL — `../facilities/service` not found.

- [ ] **Step 4: Write `lib/facilities/service.ts` (this task's slice)**

```typescript
import type { Facility } from "@prisma/client";

import { prisma } from "../db";
import { TRAINING_GYM_LEVELS } from "./config";
import type { FacilityType, ProgramId } from "./types";

const TRAINING_GYM: FacilityType = "TRAINING_GYM";

export async function getOrCreateTrainingGym(playerId: string): Promise<Facility> {
  const existing = await prisma.facility.findUnique({
    where: { playerId_type: { playerId, type: TRAINING_GYM } },
  });
  if (existing) return existing;

  return prisma.facility.create({ data: { playerId, type: TRAINING_GYM, level: 1 } });
}

export function facilityView(facility: Facility): {
  id: string;
  type: string;
  level: number;
  capacity: number;
  efficiency: number;
  unlockedPrograms: ProgramId[];
} {
  const config = TRAINING_GYM_LEVELS[facility.level];
  return {
    id: facility.id,
    type: facility.type,
    level: facility.level,
    capacity: config.capacity,
    efficiency: config.efficiency,
    unlockedPrograms: config.programs,
  };
}
```

Note: `playerId_type` is the compound-unique field name Prisma generates for `@@unique([playerId, type])` — confirm the generated name by checking `node_modules/.prisma/client/index.d.ts` after `prisma generate`; if Prisma named it differently, use that name instead (Prisma's convention is `field1_field2` in declaration order).

- [ ] **Step 5: Run to verify it passes**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/facility-service.test.ts`
Expected: PASS, all 4 tests green.

- [ ] **Step 6: Commit**

```bash
git add lib/facilities/errors.ts lib/facilities/service.ts lib/__tests__/facility-service.test.ts
git commit -m "feat(facilities): add FacilityError and lazy Training Gym creation/view"
```

---

### Task 4: `startTrainingSession`, `claimExpiredSessions`, `cancelTrainingSession`

**Files:**
- Modify: `lib/facilities/service.ts` (append)
- Modify: `lib/__tests__/facility-service.test.ts` (append)

**Interfaces:**
- Consumes: `canTrain` (`lib/growth.ts`), `canAffordTrainingPoints`, `overtrainingInjuryChance`, `defaultTrainingState`, `TRAINING_POINT_COST` (`lib/training/limits.ts`), `applyDevelopment` (`lib/training/development.ts`), `declineMultiplier`, `deriveLifeStage` (`lib/career/aging.ts`), `createInjuryRecord` (`lib/combat/injuries.ts`), `MAX_ENERGY` (`lib/training.ts`), `TRAINING_CATEGORIES` (`lib/types.ts`).
- Produces: `startTrainingSession(playerId, chickenId, programId, category?)`, `claimExpiredSessions(playerId)`, `cancelTrainingSession(playerId, sessionId)` — Task 6's routes call these three by these exact signatures and rely on them throwing `FacilityError` on every invalid case rather than returning a sentinel.

Design decisions locked in by this task (documented here so later tasks/reviewers don't re-litigate them):
- **Costs are charged at completion, not at start.** A session only reserves a capacity slot while `ACTIVE`; energy/fatigue/EV are applied once, inside `claimExpiredSessions`, against the chicken's state *at that moment*. This makes `cancelTrainingSession` a pure status flip (no refund logic needed) and keeps `claimExpiredSessions` the single place adaptation ever happens.
- **No literal queue.** A session is created `ACTIVE` immediately or the start request is rejected with `FACILITY_CAPACITY_FULL` — there is no `QUEUED` status produced in Phase 1 (the `TrainingSessionStatus` type still declares it isn't needed; only `"ACTIVE" | "COMPLETED" | "CANCELLED"` are ever written).
- **Diminishing returns reuse `trainingEffectiveness(trainingState.trainingFatigue)`** (the existing 0-100 overtraining-load curve) rather than the spec's potential-percentage table — per the Global Constraints, a second formula is not introduced.
- **Row locking:** `startTrainingSession` locks the facility row (`SELECT ... FOR UPDATE`) inside a transaction before counting active sessions, so two concurrent starts against a facility at capacity cannot both succeed. `claimExpiredSessions` locks each session row it is about to complete the same way, so two concurrent claims of the same session cannot both apply adaptation.

- [ ] **Step 1: Append the failing tests**

Append to `lib/__tests__/facility-service.test.ts`:

```typescript
import { randomUUID } from "node:crypto";

import { startTrainingSession, cancelTrainingSession, claimExpiredSessions } from "../facilities/service";
import { FacilityError } from "../facilities/errors";
import { GENETIC_STAT_KEYS, type GrowthStage, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedChicken(
  playerId: string,
  overrides: { growthStage?: GrowthStage; energy?: number; ev?: StatBlock } = {},
) {
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id, playerId, name: "Test", sex: "rooster", generation: 0, bloodlineId: id,
      iv: statBlock(50), ev: overrides.ev ?? statBlock(0), traits: [], age: 1, health: 100,
      energy: overrides.energy ?? 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active", growthStage: overrides.growthStage ?? "adult",
    },
  });
  return id;
}

test("startTrainingSession creates an ACTIVE session with snapshotted costs", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);

  const session = await startTrainingSession(player.id, chickenId, "STRENGTH");

  assert.equal(session.status, "ACTIVE");
  assert.equal(session.programId, "STRENGTH");
  assert.equal(session.category, "strength");
  assert.equal(session.durationMinutes, 30);
  assert.equal(session.energyCost, 18);
  assert.equal(session.fatigueCost, 14);
});

test("startTrainingSession rejects a program not unlocked at the current level", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);

  await assert.rejects(
    () => startTrainingSession(player.id, chickenId, "POWER_CONDITIONING"),
    (err: unknown) => err instanceof FacilityError && err.code === "PROGRAM_LOCKED",
  );
});

test("startTrainingSession rejects another player's chicken", async () => {
  const player = await getOrCreatePlayer();
  const otherPlayer = await prisma.player.create({ data: {} });
  const chickenId = await seedChicken(otherPlayer.id);

  await assert.rejects(
    () => startTrainingSession(player.id, chickenId, "STRENGTH"),
    (err: unknown) => err instanceof FacilityError && err.code === "CHICKEN_NOT_OWNED",
  );
});

test("startTrainingSession rejects an untrainable growth stage", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id, { growthStage: "chick" });

  await assert.rejects(
    () => startTrainingSession(player.id, chickenId, "STRENGTH"),
    (err: unknown) => err instanceof FacilityError && err.code === "CHICKEN_NOT_ELIGIBLE",
  );
});

test("startTrainingSession rejects insufficient energy", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id, { energy: 5 });

  await assert.rejects(
    () => startTrainingSession(player.id, chickenId, "STRENGTH"),
    (err: unknown) => err instanceof FacilityError && err.code === "INSUFFICIENT_ENERGY",
  );
});

test("startTrainingSession rejects a chicken that is already training", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);
  await startTrainingSession(player.id, chickenId, "STRENGTH");

  await assert.rejects(
    () => startTrainingSession(player.id, chickenId, "SPEED"),
    (err: unknown) => err instanceof FacilityError && err.code === "CHICKEN_ALREADY_TRAINING",
  );
});

test("startTrainingSession enforces facility capacity", async () => {
  const player = await getOrCreatePlayer();
  const chickenA = await seedChicken(player.id);
  const chickenB = await seedChicken(player.id);
  const chickenC = await seedChicken(player.id);

  await startTrainingSession(player.id, chickenA, "STRENGTH");
  await startTrainingSession(player.id, chickenB, "SPEED");

  await assert.rejects(
    () => startTrainingSession(player.id, chickenC, "AGILITY"),
    (err: unknown) => err instanceof FacilityError && err.code === "FACILITY_CAPACITY_FULL",
  );
});

test("concurrent starts cannot bypass facility capacity", async () => {
  const player = await getOrCreatePlayer();
  const chickenA = await seedChicken(player.id);
  const chickenB = await seedChicken(player.id);
  const chickenC = await seedChicken(player.id);

  const results = await Promise.allSettled([
    startTrainingSession(player.id, chickenA, "STRENGTH"),
    startTrainingSession(player.id, chickenB, "SPEED"),
    startTrainingSession(player.id, chickenC, "AGILITY"),
  ]);

  const succeeded = results.filter((r) => r.status === "fulfilled");
  assert.equal(succeeded.length, 2);
});

test("CUSTOM_TRAINING at level 5 requires a valid category and rejects an invalid one", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);
  await prisma.facility.create({ data: { playerId: player.id, type: "TRAINING_GYM", level: 5 } });

  await assert.rejects(
    () => startTrainingSession(player.id, chickenId, "CUSTOM_TRAINING", "not-a-category" as never),
    (err: unknown) => err instanceof FacilityError && err.code === "INVALID_CATEGORY",
  );

  const session = await startTrainingSession(player.id, chickenId, "CUSTOM_TRAINING", "defense");
  assert.equal(session.category, "defense");
});

test("cancelTrainingSession marks the session CANCELLED and frees the capacity slot", async () => {
  const player = await getOrCreatePlayer();
  const chickenA = await seedChicken(player.id);
  const chickenB = await seedChicken(player.id);
  const session = await startTrainingSession(player.id, chickenA, "STRENGTH");

  await cancelTrainingSession(player.id, session.id);

  const cancelled = await prisma.trainingSession.findUnique({ where: { id: session.id } });
  assert.equal(cancelled?.status, "CANCELLED");

  // capacity slot freed — a second chicken can now start even though facility capacity is 2
  await startTrainingSession(player.id, chickenB, "SPEED");
});

test("cancelTrainingSession rejects another player's session", async () => {
  const player = await getOrCreatePlayer();
  const otherPlayer = await prisma.player.create({ data: {} });
  const chickenId = await seedChicken(player.id);
  const session = await startTrainingSession(player.id, chickenId, "STRENGTH");

  await assert.rejects(
    () => cancelTrainingSession(otherPlayer.id, session.id),
    (err: unknown) => err instanceof FacilityError && err.code === "SESSION_NOT_FOUND",
  );
});

test("claimExpiredSessions is a no-op before the session's duration elapses", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);
  await startTrainingSession(player.id, chickenId, "STRENGTH");

  await claimExpiredSessions(player.id);

  const chicken = await prisma.chicken.findUnique({ where: { id: chickenId } });
  assert.equal(chicken?.energy, 100); // untouched — still ACTIVE
});

test("claimExpiredSessions applies adaptation, energy and fatigue once the session's duration has elapsed (offline completion)", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);
  const session = await startTrainingSession(player.id, chickenId, "STRENGTH");

  // Simulate time passing while the player was offline: backdate startedAt.
  await prisma.trainingSession.update({
    where: { id: session.id },
    data: { startedAt: new Date(Date.now() - 31 * 60 * 1000) },
  });

  await claimExpiredSessions(player.id);

  const chicken = await prisma.chicken.findUnique({ where: { id: chickenId } });
  assert.equal(chicken?.energy, 100 - 18); // STRENGTH energyCost
  assert.ok((chicken?.ev as StatBlock).power > 0); // strength category's primary stat

  const completed = await prisma.trainingSession.findUnique({ where: { id: session.id } });
  assert.equal(completed?.status, "COMPLETED");
  assert.ok(completed?.adaptationResult);
});

test("claiming an already-completed session twice does not double-apply adaptation", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);
  const session = await startTrainingSession(player.id, chickenId, "STRENGTH");
  await prisma.trainingSession.update({
    where: { id: session.id },
    data: { startedAt: new Date(Date.now() - 31 * 60 * 1000) },
  });

  await claimExpiredSessions(player.id);
  const afterFirst = await prisma.chicken.findUnique({ where: { id: chickenId } });

  await claimExpiredSessions(player.id);
  const afterSecond = await prisma.chicken.findUnique({ where: { id: chickenId } });

  assert.deepEqual(afterFirst?.ev, afterSecond?.ev);
  assert.equal(afterFirst?.energy, afterSecond?.energy);
});

test("facility efficiency scales baseGain before diminishing returns, never bypassing the MAX_EV cap", async () => {
  const player = await getOrCreatePlayer();
  await prisma.facility.deleteMany({ where: { playerId: player.id } });
  await prisma.facility.create({ data: { playerId: player.id, type: "TRAINING_GYM", level: 3 } }); // 1.10 efficiency
  const chickenId = await seedChicken(player.id, { ev: statBlock(99) }); // near the 100 cap

  const session = await startTrainingSession(player.id, chickenId, "STRENGTH");
  await prisma.trainingSession.update({
    where: { id: session.id },
    data: { startedAt: new Date(Date.now() - 31 * 60 * 1000) },
  });
  await claimExpiredSessions(player.id);

  const chicken = await prisma.chicken.findUnique({ where: { id: chickenId } });
  assert.ok((chicken?.ev as StatBlock).power <= 100);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/facility-service.test.ts`
Expected: FAIL — `startTrainingSession`/`claimExpiredSessions`/`cancelTrainingSession` not exported.

- [ ] **Step 3: Append the implementation to `lib/facilities/service.ts`**

```typescript
import { declineMultiplier, deriveLifeStage } from "../career/aging";
import { createInjuryRecord } from "../combat/injuries";
import { canTrain } from "../growth";
import { applyDevelopment } from "../training/development";
import {
  canAffordTrainingPoints,
  defaultTrainingState,
  overtrainingInjuryChance,
  TRAINING_POINT_COST,
} from "../training/limits";
import { TRAINING_PROGRAMS, isProgramUnlocked } from "./config";
import { FacilityError } from "./errors";
import type { ProgramId } from "./types";
import type {
  Chicken,
  GeneticStatKey,
  GrowthStage,
  InjuryRecord,
  StatBlock,
  TrainingCategory,
  TrainingState,
} from "../types";
import { TRAINING_CATEGORIES } from "../types";

const STAT_TO_CATEGORY: Record<GeneticStatKey, TrainingCategory> = {
  power: "strength",
  speed: "speed",
  agility: "agility",
  defense: "defense",
  stamina: "stamina",
  accuracy: "technique",
};
void STAT_TO_CATEGORY; // kept for readers cross-referencing lib/training.ts's mapping; not used directly here

function resolveCategory(programId: ProgramId, requestedCategory?: TrainingCategory): TrainingCategory {
  const program = TRAINING_PROGRAMS[programId];
  if (program.category !== "custom") return program.category;
  if (!requestedCategory || !TRAINING_CATEGORIES.includes(requestedCategory)) {
    throw new FacilityError("INVALID_CATEGORY");
  }
  return requestedCategory;
}

export async function startTrainingSession(
  playerId: string,
  chickenId: string,
  programId: ProgramId,
  category?: TrainingCategory,
) {
  const program = TRAINING_PROGRAMS[programId];
  if (!program) throw new FacilityError("PROGRAM_NOT_FOUND");

  const facility = await getOrCreateTrainingGym(playerId);
  await claimExpiredSessions(playerId);

  if (!isProgramUnlocked(programId, facility.level)) throw new FacilityError("PROGRAM_LOCKED");
  const resolvedCategory = resolveCategory(programId, category);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "Facility" WHERE id = ${facility.id} FOR UPDATE`;

    const chicken = await tx.chicken.findUnique({ where: { id: chickenId } });
    if (!chicken) throw new FacilityError("CHICKEN_NOT_FOUND");
    if (chicken.playerId !== playerId) throw new FacilityError("CHICKEN_NOT_OWNED");
    if (!canTrain(chicken.growthStage as GrowthStage)) throw new FacilityError("CHICKEN_NOT_ELIGIBLE");
    if (chicken.energy < program.energyCost) throw new FacilityError("INSUFFICIENT_ENERGY");

    const trainingState = (chicken.trainingState as unknown as TrainingState) ?? defaultTrainingState();
    if (!canAffordTrainingPoints(trainingState)) throw new FacilityError("TRAINING_LIMIT_REACHED");

    const alreadyTraining = await tx.trainingSession.findFirst({
      where: { chickenId, status: "ACTIVE" },
    });
    if (alreadyTraining) throw new FacilityError("CHICKEN_ALREADY_TRAINING");

    const activeCount = await tx.trainingSession.count({
      where: { facilityId: facility.id, status: "ACTIVE" },
    });
    if (activeCount >= TRAINING_GYM_LEVELS[facility.level].capacity) {
      throw new FacilityError("FACILITY_CAPACITY_FULL");
    }

    return tx.trainingSession.create({
      data: {
        playerId,
        chickenId,
        facilityId: facility.id,
        programId,
        category: resolvedCategory,
        status: "ACTIVE",
        durationMinutes: program.durationMinutes,
        energyCost: program.energyCost,
        fatigueCost: program.fatigueCost,
        workload: program.workload,
      },
    });
  });
}

export async function cancelTrainingSession(playerId: string, sessionId: string) {
  const session = await prisma.trainingSession.findUnique({ where: { id: sessionId } });
  if (!session || session.playerId !== playerId) throw new FacilityError("SESSION_NOT_FOUND");
  if (session.status !== "ACTIVE") throw new FacilityError("SESSION_NOT_ACTIVE");

  return prisma.trainingSession.update({
    where: { id: sessionId },
    data: { status: "CANCELLED", completedAt: new Date() },
  });
}

export async function claimExpiredSessions(playerId: string): Promise<void> {
  const candidates = await prisma.trainingSession.findMany({
    where: { playerId, status: "ACTIVE" },
  });

  for (const candidate of candidates) {
    const dueAt = candidate.startedAt.getTime() + candidate.durationMinutes * 60_000;
    if (Date.now() < dueAt) continue;

    await prisma.$transaction(async (tx) => {
      const [locked] = await tx.$queryRaw<Array<{ status: string }>>`
        SELECT status FROM "TrainingSession" WHERE id = ${candidate.id} FOR UPDATE
      `;
      if (!locked || locked.status !== "ACTIVE") return; // already claimed by a concurrent call

      const chicken = await tx.chicken.findUnique({ where: { id: candidate.chickenId } });
      if (!chicken) return;

      const program = TRAINING_PROGRAMS[candidate.programId as ProgramId];
      const facility = await tx.facility.findUnique({ where: { id: candidate.facilityId } });
      const efficiency = facility ? TRAINING_GYM_LEVELS[facility.level].efficiency : 1;

      const trainingState = (chicken.trainingState as unknown as TrainingState) ?? defaultTrainingState();
      const lifeStageMultiplier = declineMultiplier(deriveLifeStage(chicken as unknown as Chicken));

      const ev = applyDevelopment({
        ev: chicken.ev as StatBlock,
        category: candidate.category as TrainingCategory,
        baseGain: program.baseGain * efficiency,
        trainingFatigue: trainingState.trainingFatigue,
        lifeStageMultiplier,
      });

      const nextTrainingState: TrainingState = {
        trainingPoints: Math.max(0, trainingState.trainingPoints - TRAINING_POINT_COST),
        trainingFatigue: Math.min(100, trainingState.trainingFatigue + candidate.fatigueCost),
        history: [
          ...trainingState.history,
          { category: candidate.category as TrainingCategory, programId: candidate.programId, at: Date.now() },
        ].slice(-50),
      };

      let injuries = (chicken.injuries as unknown as InjuryRecord[]) ?? [];
      if (Math.random() < overtrainingInjuryChance(nextTrainingState.trainingFatigue)) {
        injuries = [...injuries, createInjuryRecord(Math.random, "minor")];
      }

      const adaptationResult = { ev, category: candidate.category, programId: candidate.programId };

      await tx.chicken.update({
        where: { id: candidate.chickenId },
        data: {
          ev,
          energy: Math.max(0, chicken.energy - candidate.energyCost),
          trainingState: nextTrainingState,
          injuries,
          injured: injuries.some((i) => !i.permanent && i.recoveryRemaining > 0),
        },
      });

      await tx.trainingSession.update({
        where: { id: candidate.id },
        data: { status: "COMPLETED", completedAt: new Date(), adaptationResult },
      });
    });
  }
}
```

Add the two missing imports at the top of the file (`prisma` and `TRAINING_GYM_LEVELS` are already imported from Task 3's slice / Task 2's config — confirm both are present; add `import { TRAINING_GYM_LEVELS } from "./config";` alongside the existing `TRAINING_GYM_LEVELS` import if not already there since Task 3 only imported it implicitly via `facilityView`... actually Task 3's Step 4 code does import `TRAINING_GYM_LEVELS` from `./config` already — reuse that same import line, just add `TRAINING_PROGRAMS`, `isProgramUnlocked` to it).

- [ ] **Step 4: Run to verify it passes**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/facility-service.test.ts`
Expected: PASS, all tests from both this task and Task 3 green (16 total).

- [ ] **Step 5: Commit**

```bash
git add lib/facilities/service.ts lib/__tests__/facility-service.test.ts lib/types.ts
git commit -m "feat(facilities): add session start/claim/cancel with capacity locking and offline completion"
```

(`lib/types.ts` is included because Step 3's `history` push needs `TrainingState.history` entries to accept an optional `programId` — see Task 8 for the exact one-line type change; if executing tasks strictly in order, pull that one-line change forward into this commit instead of waiting for Task 8, since this task's code will not compile without it.)

---

### Task 5: `upgradeFacility`

**Files:**
- Modify: `lib/facilities/service.ts` (append)
- Modify: `lib/__tests__/facility-service.test.ts` (append)

**Interfaces:**
- Consumes: `TRAINING_GYM_UPGRADES`, `TRAINING_GYM_MAX_LEVEL` from Task 2's config.
- Produces: `upgradeFacility(playerId, facilityId): Promise<Facility>` — Task 6's upgrade route calls this exact function.

- [ ] **Step 1: Append the failing tests**

```typescript
import { upgradeFacility } from "../facilities/service";

test("upgradeFacility increments level and deducts the configured cost", async () => {
  const player = await prisma.player.create({ data: { credits: 5000 } });
  const facility = await getOrCreateTrainingGym(player.id);

  const upgraded = await upgradeFacility(player.id, facility.id);

  assert.equal(upgraded.level, 2);
  const updatedPlayer = await prisma.player.findUnique({ where: { id: player.id } });
  assert.equal(updatedPlayer?.credits, 5000 - 1000);
});

test("upgradeFacility rejects insufficient credits", async () => {
  const player = await prisma.player.create({ data: { credits: 100 } });
  const facility = await getOrCreateTrainingGym(player.id);

  await assert.rejects(
    () => upgradeFacility(player.id, facility.id),
    (err: unknown) => err instanceof FacilityError && err.code === "INSUFFICIENT_RESOURCES",
  );
});

test("upgradeFacility rejects upgrading past the max level", async () => {
  const player = await prisma.player.create({ data: { credits: 100000 } });
  const facility = await getOrCreateTrainingGym(player.id);
  await prisma.facility.update({ where: { id: facility.id }, data: { level: 5 } });

  await assert.rejects(
    () => upgradeFacility(player.id, facility.id),
    (err: unknown) => err instanceof FacilityError && err.code === "FACILITY_MAX_LEVEL",
  );
});

test("upgradeFacility rejects another player's facility", async () => {
  const player = await prisma.player.create({ data: { credits: 5000 } });
  const otherPlayer = await prisma.player.create({ data: { credits: 5000 } });
  const facility = await getOrCreateTrainingGym(player.id);

  await assert.rejects(
    () => upgradeFacility(otherPlayer.id, facility.id),
    (err: unknown) => err instanceof FacilityError && err.code === "FACILITY_NOT_OWNED",
  );
});

test("levels persist across process-level reads (upgrade is durable)", async () => {
  const player = await prisma.player.create({ data: { credits: 5000 } });
  const facility = await getOrCreateTrainingGym(player.id);
  await upgradeFacility(player.id, facility.id);

  const reread = await getOrCreateTrainingGym(player.id);
  assert.equal(reread.level, 2);
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/facility-service.test.ts`
Expected: FAIL — `upgradeFacility` not exported.

- [ ] **Step 3: Append the implementation**

```typescript
import { TRAINING_GYM_MAX_LEVEL, TRAINING_GYM_UPGRADES } from "./config";

export async function upgradeFacility(playerId: string, facilityId: string) {
  return prisma.$transaction(async (tx) => {
    const facility = await tx.facility.findUnique({ where: { id: facilityId } });
    if (!facility) throw new FacilityError("FACILITY_NOT_FOUND");
    if (facility.playerId !== playerId) throw new FacilityError("FACILITY_NOT_OWNED");
    if (facility.level >= TRAINING_GYM_MAX_LEVEL) throw new FacilityError("FACILITY_MAX_LEVEL");

    const nextLevel = facility.level + 1;
    const cost = TRAINING_GYM_UPGRADES[nextLevel].cost;

    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player || player.credits < cost) throw new FacilityError("INSUFFICIENT_RESOURCES");

    await tx.player.update({ where: { id: playerId }, data: { credits: player.credits - cost } });
    return tx.facility.update({ where: { id: facilityId }, data: { level: nextLevel } });
  });
}
```

(Merge this `TRAINING_GYM_MAX_LEVEL, TRAINING_GYM_UPGRADES` import into the existing `./config` import line at the top of the file rather than adding a duplicate import statement.)

- [ ] **Step 4: Run to verify it passes**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/facility-service.test.ts`
Expected: PASS, all tests green (21 total).

- [ ] **Step 5: Commit**

```bash
git add lib/facilities/service.ts lib/__tests__/facility-service.test.ts
git commit -m "feat(facilities): add facility upgrade with credit cost and max-level enforcement"
```

---

### Task 6: API routes

**Files:**
- Create: `app/api/facilities/route.ts`
- Create: `app/api/facilities/[id]/upgrade/route.ts`
- Create: `app/api/training-sessions/route.ts`
- Create: `app/api/training-sessions/[id]/cancel/route.ts`
- Test: `lib/__tests__/facility-routes.test.ts`

**Interfaces:**
- Consumes: `getOrCreatePlayer` (`lib/player.ts`), everything from `lib/facilities/service.ts` and `lib/facilities/errors.ts`.
- Produces: the five HTTP endpoints the `/training` page (Task 9) calls.

- [ ] **Step 1: Write the failing route tests**

`lib/__tests__/facility-routes.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { GET as getFacilities } from "../../app/api/facilities/route";
import { POST as upgradeFacility } from "../../app/api/facilities/[id]/upgrade/route";
import { GET as listSessions, POST as startSession } from "../../app/api/training-sessions/route";
import { POST as cancelSession } from "../../app/api/training-sessions/[id]/cancel/route";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedChicken(playerId: string) {
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id, playerId, name: "Test", sex: "rooster", generation: 0, bloodlineId: id,
      iv: statBlock(50), ev: statBlock(0), traits: [], age: 1, health: 100, energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active", growthStage: "adult",
    },
  });
  return id;
}

test.beforeEach(async () => {
  await prisma.trainingSession.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("GET /api/facilities creates and returns a level-1 gym for a first-time player", async () => {
  await getOrCreatePlayer();
  const response = await getFacilities();
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.facility.level, 1);
  assert.equal(body.facility.capacity, 2);
  assert.deepEqual(body.activeSessions, []);
});

test("POST /api/training-sessions starts a session and GET reflects it as active", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);

  const startResponse = await startSession(
    new Request("http://localhost/api/training-sessions", {
      method: "POST",
      body: JSON.stringify({ chickenId, programId: "STRENGTH" }),
    }),
  );
  assert.equal(startResponse.status, 201);
  const session = await startResponse.json();
  assert.equal(session.status, "ACTIVE");

  const listResponse = await listSessions();
  const { activeSessions } = await listResponse.json();
  assert.equal(activeSessions.length, 1);
});

test("POST /api/training-sessions returns FACILITY_CAPACITY_FULL as a 400 with an error code", async () => {
  const player = await getOrCreatePlayer();
  const [a, b, c] = await Promise.all([seedChicken(player.id), seedChicken(player.id), seedChicken(player.id)]);
  const body = (chickenId: string) =>
    new Request("http://localhost/api/training-sessions", {
      method: "POST",
      body: JSON.stringify({ chickenId, programId: "STRENGTH" }),
    });

  await startSession(body(a));
  await startSession(body(b));
  const response = await startSession(body(c));

  assert.equal(response.status, 400);
  const json = await response.json();
  assert.equal(json.error, "FACILITY_CAPACITY_FULL");
});

test("POST /api/training-sessions/:id/cancel cancels an active session", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);
  const startResponse = await startSession(
    new Request("http://localhost/api/training-sessions", {
      method: "POST",
      body: JSON.stringify({ chickenId, programId: "STRENGTH" }),
    }),
  );
  const session = await startResponse.json();

  const cancelResponse = await cancelSession(
    new Request(`http://localhost/api/training-sessions/${session.id}/cancel`, { method: "POST" }),
    { params: Promise.resolve({ id: session.id }) },
  );
  assert.equal(cancelResponse.status, 200);
  const cancelled = await cancelResponse.json();
  assert.equal(cancelled.status, "CANCELLED");
});

test("POST /api/facilities/:id/upgrade upgrades level and returns 400 without enough credits", async () => {
  const player = await prisma.player.create({ data: { credits: 100 } });
  const facilityResponse = await getFacilities();
  void facilityResponse; // ensures a facility exists for player from getOrCreatePlayer's default row; re-fetch explicitly below
  const facility = await prisma.facility.findFirst({ where: { playerId: player.id } });
  assert.ok(facility);

  const response = await upgradeFacility(
    new Request(`http://localhost/api/facilities/${facility.id}/upgrade`, { method: "POST" }),
    { params: Promise.resolve({ id: facility.id }) },
  );
  assert.equal(response.status, 400);
  const json = await response.json();
  assert.equal(json.error, "INSUFFICIENT_RESOURCES");
});

test("client cannot forge facility level or adaptation result via the start payload", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);

  const response = await startSession(
    new Request("http://localhost/api/training-sessions", {
      method: "POST",
      body: JSON.stringify({
        chickenId,
        programId: "STRENGTH",
        facilityLevel: 5,
        adaptationResult: { ev: statBlock(999) },
      }),
    }),
  );
  const session = await response.json();
  assert.equal(session.energyCost, 18); // level-1 STRENGTH cost, ignoring the forged fields entirely
});
```

- [ ] **Step 2: Run to verify failure**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/facility-routes.test.ts`
Expected: FAIL — route modules not found.

- [ ] **Step 3: Write `app/api/facilities/route.ts`**

```typescript
import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { claimExpiredSessions, facilityView, getOrCreateTrainingGym } from "@/lib/facilities/service";
import { prisma } from "@/lib/db";

export async function GET() {
  const player = await getOrCreatePlayer();
  await claimExpiredSessions(player.id);
  const facility = await getOrCreateTrainingGym(player.id);

  const activeSessions = await prisma.trainingSession.findMany({
    where: { playerId: player.id, status: "ACTIVE" },
    orderBy: { startedAt: "asc" },
  });

  return NextResponse.json({ facility: facilityView(facility), activeSessions });
}
```

- [ ] **Step 4: Write `app/api/facilities/[id]/upgrade/route.ts`**

```typescript
import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { upgradeFacility, facilityView } from "@/lib/facilities/service";
import { FacilityError } from "@/lib/facilities/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();

  try {
    const facility = await upgradeFacility(player.id, id);
    return NextResponse.json(facilityView(facility));
  } catch (err) {
    if (err instanceof FacilityError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
}
```

- [ ] **Step 5: Write `app/api/training-sessions/route.ts`**

```typescript
import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { claimExpiredSessions, startTrainingSession } from "@/lib/facilities/service";
import { FacilityError } from "@/lib/facilities/errors";
import { prisma } from "@/lib/db";
import { TRAINING_CATEGORIES, type TrainingCategory } from "@/lib/types";
import type { ProgramId } from "@/lib/facilities/types";
import { TRAINING_PROGRAMS } from "@/lib/facilities/config";

export async function GET() {
  const player = await getOrCreatePlayer();
  await claimExpiredSessions(player.id);
  const activeSessions = await prisma.trainingSession.findMany({
    where: { playerId: player.id, status: "ACTIVE" },
    orderBy: { startedAt: "asc" },
  });
  return NextResponse.json({ activeSessions });
}

export async function POST(request: Request) {
  const player = await getOrCreatePlayer();
  const body = (await request.json()) as { chickenId?: string; programId?: string; category?: string };

  if (!body.chickenId || !body.programId || !(body.programId in TRAINING_PROGRAMS)) {
    return NextResponse.json({ error: "PROGRAM_NOT_FOUND" }, { status: 400 });
  }
  const category =
    body.category && TRAINING_CATEGORIES.includes(body.category as TrainingCategory)
      ? (body.category as TrainingCategory)
      : undefined;

  try {
    const session = await startTrainingSession(player.id, body.chickenId, body.programId as ProgramId, category);
    return NextResponse.json(session, { status: 201 });
  } catch (err) {
    if (err instanceof FacilityError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
}
```

- [ ] **Step 6: Write `app/api/training-sessions/[id]/cancel/route.ts`**

```typescript
import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { cancelTrainingSession } from "@/lib/facilities/service";
import { FacilityError } from "@/lib/facilities/errors";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();

  try {
    const session = await cancelTrainingSession(player.id, id);
    return NextResponse.json(session);
  } catch (err) {
    if (err instanceof FacilityError) return NextResponse.json({ error: err.code }, { status: err.status });
    throw err;
  }
}
```

- [ ] **Step 7: Run to verify all route tests pass**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/facility-routes.test.ts`
Expected: PASS, all 6 tests green.

- [ ] **Step 8: Run the full suite to confirm zero regressions**

Run: `npm test`
Expected: every pre-existing test still passes, plus all new facility tests.

- [ ] **Step 9: Commit**

```bash
git add app/api/facilities app/api/training-sessions lib/__tests__/facility-routes.test.ts
git commit -m "feat(facilities): add facility and training-session API routes"
```

---

### Task 7: Dev-mode controls

**Files:**
- Create: `lib/dev.ts`
- Create: `app/api/dev/facilities/route.ts`
- Test: `lib/__tests__/dev-facility-route.test.ts`

**Interfaces:**
- Produces: `isDevModeEnabled(): boolean`, `POST /api/dev/facilities` accepting `{ action: "SET_LEVEL" | "COMPLETE_SESSION" | "RESET_FACILITY" | "RESET_TRAINING_STATE", ...payload }`.

This repo has no pre-existing dev-mode gate to extend (confirmed: no files matched `*dev*` besides `lib/training/development.ts`), so this task establishes the one gate every dev-only endpoint checks, per §19's "never expose developer controls to normal users."

- [ ] **Step 1: Write `lib/dev.ts`**

```typescript
export function isDevModeEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
```

- [ ] **Step 2: Write the failing test**

`lib/__tests__/dev-facility-route.test.ts`:

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { getOrCreateTrainingGym, startTrainingSession } from "../facilities/service";
import { POST as devFacilities } from "../../app/api/dev/facilities/route";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

test.beforeEach(async () => {
  await prisma.trainingSession.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

function devRequest(body: unknown) {
  return new Request("http://localhost/api/dev/facilities", { method: "POST", body: JSON.stringify(body) });
}

test("dev SET_LEVEL sets the facility to an arbitrary level (e.g. straight to 5)", async () => {
  const player = await getOrCreatePlayer();
  const facility = await getOrCreateTrainingGym(player.id);

  const response = await devFacilities(devRequest({ action: "SET_LEVEL", facilityId: facility.id, level: 5 }));
  assert.equal(response.status, 200);
  const updated = await prisma.facility.findUnique({ where: { id: facility.id } });
  assert.equal(updated?.level, 5);
});

test("dev RESET_FACILITY returns the facility to level 1", async () => {
  const player = await getOrCreatePlayer();
  const facility = await getOrCreateTrainingGym(player.id);
  await prisma.facility.update({ where: { id: facility.id }, data: { level: 5 } });

  await devFacilities(devRequest({ action: "RESET_FACILITY", facilityId: facility.id }));
  const updated = await prisma.facility.findUnique({ where: { id: facility.id } });
  assert.equal(updated?.level, 1);
});

test("dev COMPLETE_SESSION instantly completes an active session regardless of elapsed time", async () => {
  const player = await getOrCreatePlayer();
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id, playerId: player.id, name: "Test", sex: "rooster", generation: 0, bloodlineId: id,
      iv: statBlock(50), ev: statBlock(0), traits: [], age: 1, health: 100, energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active", growthStage: "adult",
    },
  });
  const session = await startTrainingSession(player.id, id, "STRENGTH");

  const response = await devFacilities(devRequest({ action: "COMPLETE_SESSION", sessionId: session.id }));
  assert.equal(response.status, 200);

  const completed = await prisma.trainingSession.findUnique({ where: { id: session.id } });
  assert.equal(completed?.status, "COMPLETED");
});

test("dev RESET_TRAINING_STATE clears a chicken's trainingState back to defaults", async () => {
  const player = await getOrCreatePlayer();
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id, playerId: player.id, name: "Test", sex: "rooster", generation: 0, bloodlineId: id,
      iv: statBlock(50), ev: statBlock(0), traits: [], age: 1, health: 100, energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active", growthStage: "adult",
      trainingState: { trainingPoints: 0, trainingFatigue: 90, history: [{ category: "strength", at: 1 }] },
    },
  });

  await devFacilities(devRequest({ action: "RESET_TRAINING_STATE", chickenId: id }));

  const chicken = await prisma.chicken.findUnique({ where: { id } });
  assert.deepEqual(chicken?.trainingState, { trainingPoints: 100, trainingFatigue: 0, history: [] });
});

test("dev endpoint is disabled outside dev mode", async (t) => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  t.after(() => {
    process.env.NODE_ENV = original;
  });

  const response = await devFacilities(devRequest({ action: "RESET_FACILITY", facilityId: "anything" }));
  assert.equal(response.status, 403);
});
```

- [ ] **Step 3: Run to verify failure**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/dev-facility-route.test.ts`
Expected: FAIL — route module not found.

- [ ] **Step 4: Write `app/api/dev/facilities/route.ts`**

```typescript
import { NextResponse } from "next/server";

import { isDevModeEnabled } from "@/lib/dev";
import { prisma } from "@/lib/db";
import { claimExpiredSessions } from "@/lib/facilities/service";
import { defaultTrainingState } from "@/lib/training/limits";

type DevAction =
  | { action: "SET_LEVEL"; facilityId: string; level: number }
  | { action: "RESET_FACILITY"; facilityId: string }
  | { action: "COMPLETE_SESSION"; sessionId: string }
  | { action: "RESET_TRAINING_STATE"; chickenId: string };

export async function POST(request: Request) {
  if (!isDevModeEnabled()) {
    return NextResponse.json({ error: "DEV_MODE_DISABLED" }, { status: 403 });
  }

  const body = (await request.json()) as DevAction;

  switch (body.action) {
    case "SET_LEVEL": {
      const facility = await prisma.facility.update({ where: { id: body.facilityId }, data: { level: body.level } });
      return NextResponse.json(facility);
    }
    case "RESET_FACILITY": {
      const facility = await prisma.facility.update({ where: { id: body.facilityId }, data: { level: 1 } });
      return NextResponse.json(facility);
    }
    case "COMPLETE_SESSION": {
      await prisma.trainingSession.update({
        where: { id: body.sessionId },
        data: { startedAt: new Date(0) }, // force it into the past so claimExpiredSessions treats it as due
      });
      const session = await prisma.trainingSession.findUnique({ where: { id: body.sessionId } });
      if (session) await claimExpiredSessions(session.playerId);
      const completed = await prisma.trainingSession.findUnique({ where: { id: body.sessionId } });
      return NextResponse.json(completed);
    }
    case "RESET_TRAINING_STATE": {
      const chicken = await prisma.chicken.update({
        where: { id: body.chickenId },
        data: { trainingState: defaultTrainingState() },
      });
      return NextResponse.json(chicken);
    }
    default:
      return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  }
}
```

- [ ] **Step 5: Run to verify it passes**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/dev-facility-route.test.ts`
Expected: PASS, all 5 tests green.

- [ ] **Step 6: Commit**

```bash
git add lib/dev.ts app/api/dev/facilities/route.ts lib/__tests__/dev-facility-route.test.ts
git commit -m "feat(facilities): add dev-mode facility/session/training-state controls"
```

---

### Task 8: `TrainingState.history` gains an optional `programId`

**Files:**
- Modify: `lib/types.ts`

**Interfaces:**
- Produces: `TrainingState.history: { category: TrainingCategory; programId?: string; at: number }[]` — used by `claimExpiredSessions` (Task 4) and the chicken detail page's training-history line (Task 10).

(If Task 4 was executed in order, this change already landed as part of that commit per its note — this task is a no-op checkpoint in that case. Included as its own task so a reviewer approving Task 4 in isolation isn't surprised by a `lib/types.ts` diff, and so out-of-order execution still has an explicit step for it.)

- [ ] **Step 1: Locate and edit**

In `lib/types.ts`, find:

```typescript
export type TrainingState = {
  trainingPoints: number;
  trainingFatigue: number;
  history: { category: TrainingCategory; at: number }[];
};
```

Change the `history` line to:

```typescript
  history: { category: TrainingCategory; programId?: string; at: number }[];
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors (this is a strictly-widening optional-field change; `lib/training.ts`'s existing `trainStat` push, which omits `programId`, still type-checks).

- [ ] **Step 3: Commit** (skip if already folded into Task 4's commit)

```bash
git add lib/types.ts
git commit -m "feat(facilities): record which training program produced each history entry"
```

---

### Task 9: `/training` facility dashboard + start-session flow

**Files:**
- Create: `app/training/page.tsx`

**Interfaces:**
- Consumes: `GET /api/facilities`, `POST /api/training-sessions`, `POST /api/training-sessions/:id/cancel`, `POST /api/facilities/:id/upgrade`, `GET /api/chickens` (confirm this route exists and returns the player's chicken list; if not, add a minimal `GET` handler alongside the existing `app/api/chickens/[id]/*` routes that returns `prisma.chicken.findMany({ where: { playerId: player.id } })` — check first with `ls app/api/chickens` before assuming).
- Produces: the page player-facing surface described in spec §20/§36.

- [ ] **Step 1: Confirm or add `GET /api/chickens`**

Run: `cat app/api/chickens/route.ts 2>/dev/null || echo MISSING`. If `MISSING`, create `app/api/chickens/route.ts`:

```typescript
import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { prisma } from "@/lib/db";

export async function GET() {
  const player = await getOrCreatePlayer();
  const chickens = await prisma.chicken.findMany({ where: { playerId: player.id } });
  return NextResponse.json(chickens);
}
```

- [ ] **Step 2: Write `app/training/page.tsx`**

```tsx
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { TRAINING_GYM_UPGRADES } from "@/lib/facilities/config";
import type { ProgramId } from "@/lib/facilities/types";
import { TRAINING_PROGRAMS } from "@/lib/facilities/config";
import { TRAINING_CATEGORIES, type Chicken, type TrainingCategory } from "@/lib/types";

type FacilityViewDTO = { id: string; level: number; capacity: number; efficiency: number; unlockedPrograms: ProgramId[] };
type SessionDTO = {
  id: string;
  chickenId: string;
  programId: ProgramId;
  startedAt: string;
  durationMinutes: number;
};

function remainingMinutes(session: SessionDTO): number {
  const dueAt = new Date(session.startedAt).getTime() + session.durationMinutes * 60_000;
  return Math.max(0, Math.ceil((dueAt - Date.now()) / 60_000));
}

export default function TrainingPage() {
  const searchParams = useSearchParams();
  const preselectedChickenId = searchParams.get("chickenId") ?? "";

  const [facility, setFacility] = useState<FacilityViewDTO | null>(null);
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [selectedChicken, setSelectedChicken] = useState(preselectedChickenId);
  const [selectedCategory, setSelectedCategory] = useState<TrainingCategory>("strength");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [facilityRes, chickensRes] = await Promise.all([fetch("/api/facilities"), fetch("/api/chickens")]);
    const facilityBody = await facilityRes.json();
    setFacility(facilityBody.facility);
    setSessions(facilityBody.activeSessions);
    setChickens(await chickensRes.json());
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000); // offline-friendly: server is authoritative, this just refreshes the view
    return () => clearInterval(interval);
  }, []);

  async function startTraining(programId: ProgramId) {
    setError(null);
    if (!selectedChicken) {
      setError("Select a chicken first.");
      return;
    }
    const program = TRAINING_PROGRAMS[programId];
    const body: Record<string, unknown> = { chickenId: selectedChicken, programId };
    if (program.category === "custom") body.category = selectedCategory;

    const res = await fetch("/api/training-sessions", { method: "POST", body: JSON.stringify(body) });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error);
      return;
    }
    await refresh();
  }

  async function cancel(sessionId: string) {
    await fetch(`/api/training-sessions/${sessionId}/cancel`, { method: "POST" });
    await refresh();
  }

  async function upgrade() {
    if (!facility) return;
    setError(null);
    const res = await fetch(`/api/facilities/${facility.id}/upgrade`, { method: "POST" });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error);
      return;
    }
    await refresh();
  }

  if (!facility) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink)">
        <p className="text-(--color-text-muted)">🏋️ Loading Training Gym...</p>
      </main>
    );
  }

  const nextUpgradeCost = TRAINING_GYM_UPGRADES[facility.level + 1]?.cost;

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/coop" className="rounded bg-black/30 px-3 py-1.5 text-sm font-semibold hover:bg-black/50">
          ← Back to Coop
        </Link>
        <span className="signboard px-6 py-2 font-display text-lg font-semibold text-(--color-gold-bright)">
          Training Gym
        </span>
        <span className="w-[92px]" />
      </div>

      {error && <p className="mb-4 rounded bg-red-900/30 px-3 py-2 text-sm text-red-200">{error}</p>}

      <div className="panel-wood mb-6 rounded-lg p-5">
        <h1 className="font-display text-2xl font-semibold text-(--color-gold-bright)">Level {facility.level}</h1>
        <p className="mt-1 text-sm opacity-80">
          Capacity: {sessions.length} / {facility.capacity} · Efficiency: {Math.round(facility.efficiency * 100)}%
        </p>
        {nextUpgradeCost !== undefined && (
          <button
            onClick={upgrade}
            className="mt-3 rounded bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-4 py-2 text-sm font-semibold text-(--color-ink) hover:brightness-110"
          >
            Upgrade to Level {facility.level + 1} — {nextUpgradeCost} credits
          </button>
        )}
      </div>

      <div className="panel-parchment mb-6 rounded-lg p-5">
        <h2 className="mb-2 font-display text-lg font-semibold">Active Training</h2>
        {sessions.length === 0 ? (
          <p className="text-sm opacity-70">No active sessions.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded bg-black/10 px-3 py-2">
                <span className="text-sm">
                  {chickens.find((c) => c.id === session.chickenId)?.name ?? session.chickenId} ·{" "}
                  {TRAINING_PROGRAMS[session.programId].name} · {remainingMinutes(session)}m remaining
                </span>
                <button onClick={() => cancel(session.id)} className="text-xs font-semibold text-red-700 hover:underline">
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-parchment rounded-lg p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Start Training</h2>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedChicken}
            onChange={(e) => setSelectedChicken(e.target.value)}
            className="flex-1 rounded border border-(--color-parchment-dark) bg-white/60 px-3 py-2 text-sm"
          >
            <option value="">Select a chicken...</option>
            {chickens.map((chicken) => (
              <option key={chicken.id} value={chicken.id}>
                {chicken.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {facility.unlockedPrograms.map((programId) => {
            const program = TRAINING_PROGRAMS[programId];
            return (
              <div key={programId} className="rounded-md border border-(--color-parchment-dark) p-3">
                <p className="font-display font-semibold">{program.name}</p>
                <p className="text-xs opacity-70">{program.description}</p>
                <p className="mt-1 text-xs opacity-80">
                  Duration: {program.durationMinutes}m · Energy: {program.energyCost} · Fatigue: {program.fatigueCost}
                </p>
                {program.category === "custom" && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as TrainingCategory)}
                    className="mt-2 w-full rounded border border-(--color-parchment-dark) bg-white/60 px-2 py-1 text-xs"
                  >
                    {TRAINING_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => startTraining(programId)}
                  className="mt-2 w-full rounded bg-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-black/20"
                >
                  Train
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
```

- [ ] **Step 3: Manually verify in the browser**

Run: `npm run dev`, visit `http://localhost:3000/training`, confirm: the gym renders at Level 1 with 6 programs, starting a session shows it under Active Training with a countdown, Cancel removes it, and (with `credits` seeded high enough via `prisma.player.update`) Upgrade advances the level and reveals new programs.

- [ ] **Step 4: Commit**

```bash
git add app/training/page.tsx app/api/chickens/route.ts
git commit -m "feat(facilities): add Training Gym dashboard and start-session UI"
```

---

### Task 10: Wire up navigation and retire the instant per-stat Train buttons

**Files:**
- Modify: `app/page.tsx`
- Modify: `app/chicken/[chickenId]/page.tsx`

**Interfaces:**
- Consumes: nothing new.
- Produces: nothing new — this task only rewires links/buttons already defined by earlier tasks.

- [ ] **Step 1: Add a home-page link**

In `app/page.tsx`, add a third link after the "Go to Breeding" link:

```tsx
          <Link
            href="/training"
            className="rounded-md border border-(--color-gold)/30 bg-black/25 px-6 py-3 font-display font-semibold text-(--foreground) transition hover:bg-black/40"
          >
            🏋️ Training Gym
          </Link>
```

- [ ] **Step 2: Replace the Stats tab's per-stat Train buttons**

In `app/chicken/[chickenId]/page.tsx`, in the `tab === "Stats"` block, remove the per-stat `<button onClick={() => handleTrain(stat)} ...>Train</button>` (and the now-unused `handleTrain` function and `ENERGY_PER_TRAIN` import if nothing else in the file uses them — grep the file first to confirm), and add below the stat list:

```tsx
            <Link
              href={`/training?chickenId=${chicken.id}`}
              className="mt-2 flex items-center justify-center gap-1.5 rounded bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-3 py-2 text-sm font-semibold text-(--color-ink) hover:brightness-110"
            >
              🏋️ Go to Training Gym
            </Link>
```

Keep `canTrain(chicken.growthStage)` as a guard around this link (reuse the existing import) so an untrainable-stage chicken doesn't show it.

- [ ] **Step 3: Verify the app still builds and the page still renders**

Run: `npx tsc --noEmit && npm run build`
Expected: no type errors from the removed `handleTrain`/unused imports; build succeeds.

Manually visit a chicken's detail page in the browser (`npm run dev`), open the Stats tab, confirm the per-stat Train buttons are gone and the "Go to Training Gym" link navigates to `/training?chickenId=<id>` with that chicken preselected.

- [ ] **Step 4: Commit**

```bash
git add app/page.tsx app/chicken/[chickenId]/page.tsx
git commit -m "feat(facilities): route chicken training through the Training Gym"
```

---

### Task 11: Full verification pass

**Files:** none (verification only)

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: every test passes — the pre-existing suite (unchanged) plus every new `lib/__tests__/facility-*.test.ts` and `lib/__tests__/dev-facility-route.test.ts` file.

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc --noEmit && npm run lint`
Expected: zero errors.

- [ ] **Step 3: Confirm existing-player migration safety**

In a `node --import ./scripts/test-ts-loader.mjs -e` one-liner or a scratch test, seed a `Chicken` row the way pre-facility fixtures look (no `Facility` row exists for its player), then call `getOrCreateTrainingGym(playerId)` and re-fetch the chicken — confirm the chicken row is byte-for-byte unchanged (same `ev`, `iv`, `trainingState`, `record`, etc.) and a level-1 `Facility` now exists. This is the concrete check for §41/§45's "existing players migrate safely" checkbox.

- [ ] **Step 4: Manual smoke test in the browser**

Run: `npm run dev`. Walk the full player experience from spec §46: open `/training`, start a basic program on a chicken, use the dev endpoint (`curl -X POST localhost:3000/api/dev/facilities -d '{"action":"COMPLETE_SESSION","sessionId":"<id>"}'`) to instantly complete it, confirm the chicken's EV increased and energy/fatigue moved, confirm capacity freed up, then upgrade the facility (seed credits first if needed) and confirm new programs appear.

- [ ] **Step 5: Report**

No commit for this task — it is the Definition-of-Done checklist (spec §45) confirmation. Summarize pass/fail for each of the 27 checkboxes in §45 to the user.

---

## Self-Review Notes

- **Spec coverage:** Facility data model/ownership/levels/upgrades/capacity → Tasks 1-5. Program definitions/unlocks/efficiency → Task 2/4. Fatigue/adaptation/growth/potential integration (no new formula) → Task 4. Sessions/offline completion/idempotency/concurrency → Task 4. UI (dashboard, program list, start flow, chicken selection) → Task 9/10. Dev-mode → Task 7. Server authority/error codes → Task 6. Training history → Task 8 (`programId` on history entries, displayed via the existing "Training Capacity" block on the chicken page, which already reads `trainingState`). Tests → folded into every task per TDD rather than a separate task. Migration/backward-compat → Task 11 Step 3 plus the Global Constraints keeping the legacy route untouched.
- **Explicitly out of scope, confirmed absent from any task:** Medical, Research, Genetics, Nutrition, injuries beyond the existing `overtrainingInjuryChance` reuse, construction timers, a second currency, staff/employees.
- **Known simplifications, called out inline rather than hidden:** no literal `QUEUED` status (Task 4 design notes), diminishing returns reuse the existing fatigue-band curve instead of the spec's potential-percentage table (Task 4 design notes + Global Constraints), costs charged at completion not at start (Task 4 design notes).

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-09-07-facilities-training-gym.md`. Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration.
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints.

Which approach?
