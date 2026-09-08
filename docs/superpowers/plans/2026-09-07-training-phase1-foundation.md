# Training Phase 1 Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the Phase 1 core-training foundation — XP pools, Training Effort,
hidden Training Potential, intensity levels, stress-from-training, breakthroughs,
and the `RoosterTraining` aggregate row — on top of the existing `lib/training/`
system without changing today's default (moderate-intensity, no-`RoosterTraining`)
behavior.

**Architecture:** New pure logic lives in small single-purpose modules under
`lib/training/` (`xp.ts`, `potential.ts`, `effort.ts`, `intensity.ts`,
`breakthroughs.ts`), composed by one orchestration module (`session.ts`). A thin
DB-glue layer (`service.ts` + `errors.ts`) lazily creates/reads/writes the new
`RoosterTraining` Prisma row and handles the credits-costed redistribute action.
`lib/training.ts`'s existing `trainStat()` gains an optional 4th `options`
parameter that, when omitted, is byte-for-byte identical to today; when a
`RoosterTraining` state is passed in, it routes through the new orchestration.

**Tech Stack:** TypeScript, Prisma (Postgres), Next.js route handlers, `node:test`
+ `node:assert/strict` (existing test runner, no new libs).

**Spec:** `docs/superpowers/specs/2026-09-07-training-phase1-foundation-design.md`

## Global Constraints

- `MAX_TRAINING_EFFORT_TOTAL = 500` (per chicken, across all 6 stats).
- `MAX_TRAINING_EFFORT_PER_STAT = 100`.
- Redistribution costs `10 credits per point` moved, debited from `Player.credits`.
- `trainingPotential[stat] = clamp(iv[stat] + randInt(-5, 15), 0, 100)`, rolled once.
- `discovered[stat]` flips true once `effortSpent[stat] >= 100`.
- Intensity defaults to `"moderate"` and must reproduce today's exact numbers
  (`energy: 1.0, fatigue: 1.0, evGain: 1.0, stress: 0, injuryChance: 0`) when used.
- Breakthrough base chance `0.02`, `+0.01` per XP pool that crosses a multiple of
  100 in a session; on success `70%` bonus EV (`+5`), `30%` trait grant from
  `["iron_body", "fast_learner"]`.
- `overtrained` trait is force-applied (not rolled) after 5 extreme-intensity
  sessions while `trainingFatigue >= 85`.
- All new randomness takes an injected `Rng = () => number` parameter (matches
  `lib/combat/injuries.ts` convention) — never call `Math.random()` directly
  inside a pure `lib/training/*` module.
- Existing `lib/training.ts`, `lib/training/development.ts`, `lib/training/limits.ts`
  tests must keep passing unmodified.

---

### Task 1: Types for the Phase 1 training model

**Files:**
- Modify: `lib/types.ts` (append after the `TrainingState` block, ~line 505)

**Interfaces:**
- Produces: `TrainingIntensity`, `TrainingTraitId`, `TrainingTrait`,
  `BreakthroughLogEntry`, `XpPool`, `RoosterTrainingState` — consumed by every
  later task.

- [ ] **Step 1: Add the new types**

```ts
export type TrainingIntensity = "light" | "moderate" | "hard" | "extreme";

export const TRAINING_INTENSITIES: readonly TrainingIntensity[] = [
  "light",
  "moderate",
  "hard",
  "extreme",
];

export type TrainingTraitId = "iron_body" | "fast_learner" | "overtrained";

export type TrainingTrait = {
  id: TrainingTraitId;
  grantedAt: number;
};

export type XpPool = "physicalXP" | "combatXP" | "tacticalXP" | "disciplineXP" | "recoveryXP";

export const XP_POOLS: readonly XpPool[] = [
  "physicalXP",
  "combatXP",
  "tacticalXP",
  "disciplineXP",
  "recoveryXP",
];

export type BreakthroughLogEntry = {
  stat: GeneticStatKey;
  category: TrainingCategory;
  at: number;
  kind: "bonus_ev" | "trait";
  traitId?: TrainingTraitId;
};

/** Per-chicken aggregate progression row (V2 spec, Training Phase 1) — mirrors the RoosterTraining Prisma model. */
export type RoosterTrainingState = {
  physicalXP: number;
  combatXP: number;
  tacticalXP: number;
  disciplineXP: number;
  recoveryXP: number;
  effortSpent: StatBlock;
  trainingPotential: StatBlock;
  discovered: Partial<Record<GeneticStatKey, boolean>>;
  traits: TrainingTrait[];
  breakthroughs: BreakthroughLogEntry[];
};
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors beyond the pre-existing 16 documented in
`docs/rooster-training-medical-v3-progress.md`.

- [ ] **Step 3: Commit**

```bash
git add lib/types.ts
git commit -m "feat(training): add Phase 1 training types"
```

---

### Task 2: `RoosterTraining` Prisma model + migration

**Files:**
- Modify: `prisma/schema.prisma`
- Create: migration under `prisma/migrations/` (via `prisma migrate dev`)

**Interfaces:**
- Produces: `prisma.roosterTraining` client model with fields
  `id, chickenId (unique), physicalXP, combatXP, tacticalXP, disciplineXP,
  recoveryXP, effortSpent, trainingPotential, discovered, traits, breakthroughs,
  createdAt, updatedAt` — consumed by Task 11 (`service.ts`).

- [ ] **Step 1: Add the model**

Add to `prisma/schema.prisma`, after the `TrainingSession` model:

```prisma
model RoosterTraining {
  id                String   @id @default(uuid())
  chickenId         String   @unique
  physicalXP        Int      @default(0)
  combatXP          Int      @default(0)
  tacticalXP        Int      @default(0)
  disciplineXP      Int      @default(0)
  recoveryXP        Int      @default(0)
  effortSpent       Json     @default("{\"power\":0,\"speed\":0,\"agility\":0,\"defense\":0,\"stamina\":0,\"accuracy\":0}")
  trainingPotential Json
  discovered        Json     @default("{}")
  traits            Json     @default("[]")
  breakthroughs     Json     @default("[]")
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

- [ ] **Step 2: Generate and apply the migration**

Run: `docker compose up -d && npx prisma migrate dev --name add_rooster_training`
Expected: migration file created under `prisma/migrations/`, applies cleanly,
Prisma Client regenerates with `prisma.roosterTraining`.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat(training): add RoosterTraining table"
```

---

### Task 3: XP pool crediting (`lib/training/xp.ts`)

**Files:**
- Create: `lib/training/xp.ts`
- Test: `lib/__tests__/training-xp.test.ts`

**Interfaces:**
- Consumes: `TrainingCategory` (from `../types`), `XpPool`, `RoosterTrainingState`.
- Produces: `XP_PER_SESSION = 10`, `XP_POOLS_BY_CATEGORY: Record<TrainingCategory, XpPool[]>`,
  `creditXp(state: RoosterTrainingState, category: TrainingCategory): RoosterTrainingState`
  — consumed by Task 9 (`session.ts`).

- [ ] **Step 1: Write the failing test**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { creditXp } from "../training/xp";
import { defaultRoosterTrainingState } from "../training/state";
import { statBlock } from "./testHelpers";

test("creditXp adds XP_PER_SESSION to every pool mapped from the category", () => {
  const state = defaultRoosterTrainingState(statBlock(50));
  const next = creditXp(state, "speed");

  assert.equal(next.physicalXP, 10);
  assert.equal(next.combatXP, 10);
  assert.equal(next.tacticalXP, 0);
  assert.equal(next.recoveryXP, 0);
});

test("creditXp only credits recoveryXP for the recovery category", () => {
  const state = defaultRoosterTrainingState(statBlock(50));
  const next = creditXp(state, "recovery");

  assert.equal(next.recoveryXP, 10);
  assert.equal(next.physicalXP, 0);
  assert.equal(next.combatXP, 0);
});

test("creditXp only credits tacticalXP for discipline", () => {
  const state = defaultRoosterTrainingState(statBlock(50));
  const next = creditXp(state, "discipline");

  assert.equal(next.tacticalXP, 10);
  assert.equal(next.physicalXP, 0);
});
```

Note: `defaultRoosterTrainingState` is created in Task 4 (`lib/training/state.ts`)
— write this test now, it will fail to import until Task 4 lands. If running
tasks strictly in order, do Task 4's `state.ts` file (just the factory, no
potential-roll logic yet is fine since Task 4 defines it) before running this
test. This plan sequences Task 4 second in the batch below so the import
resolves; run both tasks' Step 1s before either's Step 2.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-xp.test.ts`
Expected: FAIL — `creditXp` is not defined (module doesn't exist yet).

- [ ] **Step 3: Write the implementation**

```ts
import type { RoosterTrainingState, TrainingCategory, XpPool } from "../types";

export const XP_PER_SESSION = 10;

/** Which XpPool(s) a TrainingCategory feeds (design spec: Mechanics > XP pools). */
export const XP_POOLS_BY_CATEGORY: Record<TrainingCategory, XpPool[]> = {
  strength: ["physicalXP"],
  agility: ["physicalXP"],
  stamina: ["physicalXP"],
  speed: ["physicalXP", "combatXP"],
  technique: ["combatXP"],
  defense: ["combatXP"],
  discipline: ["tacticalXP"],
  recovery: ["recoveryXP"],
};

/** Credits XP_PER_SESSION to every pool a training category feeds; pools are uncapped lifetime counters. */
export function creditXp(state: RoosterTrainingState, category: TrainingCategory): RoosterTrainingState {
  const next = { ...state };
  for (const pool of XP_POOLS_BY_CATEGORY[category]) {
    next[pool] = next[pool] + XP_PER_SESSION;
  }
  return next;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-xp.test.ts`
Expected: PASS (once Task 4's `state.ts` also exists).

- [ ] **Step 5: Commit**

```bash
git add lib/training/xp.ts lib/__tests__/training-xp.test.ts
git commit -m "feat(training): add XP pool crediting"
```

---

### Task 4: Default state factory + Training Potential (`lib/training/state.ts`, `lib/training/potential.ts`)

**Files:**
- Create: `lib/training/state.ts`
- Create: `lib/training/potential.ts`
- Test: `lib/__tests__/training-potential.test.ts`

**Interfaces:**
- Consumes: `StatBlock`, `GeneticStatKey`, `GENETIC_STAT_KEYS`, `RoosterTrainingState` (from `../types`).
- Produces:
  - `defaultRoosterTrainingState(trainingPotential: StatBlock): RoosterTrainingState`
    — consumed by Tasks 3, 5, 6, 7, 9, 11 and their tests.
  - `rollTrainingPotential(iv: StatBlock, rng: Rng): StatBlock`
  - `potentialBand(value: number): "Below Average" | "Average" | "Above Average" | "Exceptional"`
  - `discoverPotential(state: RoosterTrainingState): RoosterTrainingState` (flips
    `discovered[stat]` true for every stat where `effortSpent[stat] >= 100`)
  — all consumed by Task 9 (`session.ts`) and Task 11 (`service.ts`).

- [ ] **Step 1: Write the failing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { rollTrainingPotential, potentialBand, discoverPotential } from "../training/potential";
import { defaultRoosterTrainingState } from "../training/state";
import { statBlock } from "./testHelpers";

test("rollTrainingPotential clamps to [0, 100] and biases at least iv-5", () => {
  const rng = () => 0; // rng()=0 -> offset = -5 (minimum roll)
  const iv = statBlock(50);
  const potential = rollTrainingPotential(iv, rng);

  assert.equal(potential.power, 45);
});

test("rollTrainingPotential never exceeds 100", () => {
  const rng = () => 0.999; // pushes offset to its max (+15)
  const iv = statBlock(95);
  const potential = rollTrainingPotential(iv, rng);

  assert.equal(potential.power, 100);
});

test("potentialBand reports the correct band per threshold", () => {
  assert.equal(potentialBand(10), "Below Average");
  assert.equal(potentialBand(40), "Average");
  assert.equal(potentialBand(70), "Above Average");
  assert.equal(potentialBand(90), "Exceptional");
});

test("discoverPotential flips discovered true once effortSpent hits the per-stat cap", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 100;
  const next = discoverPotential(state);

  assert.equal(next.discovered.power, true);
  assert.equal(next.discovered.speed, undefined);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-potential.test.ts`
Expected: FAIL — modules don't exist yet.

- [ ] **Step 3: Write `lib/training/state.ts`**

```ts
import { GENETIC_STAT_KEYS, type RoosterTrainingState, type StatBlock } from "../types";

/** Fresh per-chicken aggregate row (design spec: Data model) — trainingPotential is rolled once by the caller (lib/training/potential.ts) and passed in. */
export function defaultRoosterTrainingState(trainingPotential: StatBlock): RoosterTrainingState {
  const effortSpent = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (effortSpent[key] = 0));

  return {
    physicalXP: 0,
    combatXP: 0,
    tacticalXP: 0,
    disciplineXP: 0,
    recoveryXP: 0,
    effortSpent,
    trainingPotential,
    discovered: {},
    traits: [],
    breakthroughs: [],
  };
}
```

- [ ] **Step 4: Write `lib/training/potential.ts`**

```ts
import { GENETIC_STAT_KEYS, type GeneticStatKey, type RoosterTrainingState, type StatBlock } from "../types";

export type Rng = () => number;

const MAX_EFFORT_PER_STAT = 100;

/** Hidden per-stat ceiling, rolled once at RoosterTraining creation (design spec: Training Potential) — iv + [-5, +15), clamped to 100. */
export function rollTrainingPotential(iv: StatBlock, rng: Rng): StatBlock {
  const potential = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => {
    const offset = Math.floor(rng() * 20) - 5; // -5..14
    potential[key] = Math.min(100, Math.max(0, iv[key] + offset));
  });
  return potential;
}

/** Fuzzy display band for an un-discovered trainingPotential value. */
export function potentialBand(value: number): "Below Average" | "Average" | "Above Average" | "Exceptional" {
  if (value >= 90) return "Exceptional";
  if (value >= 70) return "Above Average";
  if (value >= 40) return "Average";
  return "Below Average";
}

/** Reveals the exact trainingPotential for any stat where effort has been seriously invested. */
export function discoverPotential(state: RoosterTrainingState): RoosterTrainingState {
  const discovered = { ...state.discovered };
  GENETIC_STAT_KEYS.forEach((key: GeneticStatKey) => {
    if (state.effortSpent[key] >= MAX_EFFORT_PER_STAT) discovered[key] = true;
  });
  return { ...state, discovered };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-potential.test.ts lib/__tests__/training-xp.test.ts`
Expected: PASS for both files.

- [ ] **Step 6: Commit**

```bash
git add lib/training/state.ts lib/training/potential.ts lib/__tests__/training-potential.test.ts
git commit -m "feat(training): add RoosterTraining default state and hidden training potential"
```

---

### Task 5: Training Effort (`lib/training/effort.ts`)

**Files:**
- Create: `lib/training/effort.ts`
- Test: `lib/__tests__/training-effort.test.ts`

**Interfaces:**
- Consumes: `GeneticStatKey`, `RoosterTrainingState`, `StatBlock` (from `../types`).
- Produces: `MAX_TRAINING_EFFORT_TOTAL = 500`, `MAX_TRAINING_EFFORT_PER_STAT = 100`,
  `REDISTRIBUTE_CREDITS_PER_POINT = 10`,
  `effortHeadroom(state, stat): number`,
  `spendEffort(state, stat, desiredEv): { evGain: number; effortSpent: StatBlock }`,
  `redistributeEffort(state, from, to, amount): StatBlock` (pure — throws
  `RangeError` if `amount` exceeds what's movable; the credits check happens in
  Task 11's `service.ts`, not here) — consumed by Task 9 and Task 11.

- [ ] **Step 1: Write the failing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_TRAINING_EFFORT_TOTAL,
  MAX_TRAINING_EFFORT_PER_STAT,
  effortHeadroom,
  spendEffort,
  redistributeEffort,
} from "../training/effort";
import { defaultRoosterTrainingState } from "../training/state";
import { statBlock } from "./testHelpers";

test("effortHeadroom is the per-stat cap when nothing spent", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  assert.equal(effortHeadroom(state, "power"), MAX_TRAINING_EFFORT_PER_STAT);
});

test("effortHeadroom is limited by the remaining total budget", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  // Spend everywhere except power, right up to the total cap.
  state.effortSpent = { power: 0, speed: 100, agility: 100, defense: 100, stamina: 100, accuracy: 100 };
  assert.equal(effortHeadroom(state, "power"), MAX_TRAINING_EFFORT_TOTAL - 500);
});

test("spendEffort clamps evGain to available headroom and updates effortSpent", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 98;
  const { evGain, effortSpent } = spendEffort(state, "power", 5);

  assert.equal(evGain, 2);
  assert.equal(effortSpent.power, 100);
});

test("spendEffort gives 0 EV once a stat's effort is exhausted", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 100;
  const { evGain } = spendEffort(state, "power", 5);

  assert.equal(evGain, 0);
});

test("redistributeEffort moves spent effort from one stat to another", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 40;
  const next = redistributeEffort(state, "power", "speed", 10);

  assert.equal(next.power, 30);
  assert.equal(next.speed, 10);
});

test("redistributeEffort throws if moving more than what's spent on the source stat", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 5;
  assert.throws(() => redistributeEffort(state, "power", "speed", 10), RangeError);
});

test("redistributeEffort throws if the destination stat would exceed its per-stat cap", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  state.effortSpent.power = 50;
  state.effortSpent.speed = 95;
  assert.throws(() => redistributeEffort(state, "power", "speed", 10), RangeError);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-effort.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
import { GENETIC_STAT_KEYS, type GeneticStatKey, type RoosterTrainingState, type StatBlock } from "../types";

export const MAX_TRAINING_EFFORT_TOTAL = 500;
export const MAX_TRAINING_EFFORT_PER_STAT = 100;
export const REDISTRIBUTE_CREDITS_PER_POINT = 10;

function totalSpent(effortSpent: StatBlock): number {
  return GENETIC_STAT_KEYS.reduce((sum, key) => sum + effortSpent[key], 0);
}

/** Remaining effort a stat can still absorb, bounded by both its own cap and the chicken's lifetime total. */
export function effortHeadroom(state: RoosterTrainingState, stat: GeneticStatKey): number {
  const perStatRemaining = MAX_TRAINING_EFFORT_PER_STAT - state.effortSpent[stat];
  const totalRemaining = MAX_TRAINING_EFFORT_TOTAL - totalSpent(state.effortSpent);
  return Math.max(0, Math.min(perStatRemaining, totalRemaining));
}

/** Draws a session's EV gain from remaining effort headroom (design spec: Training Effort). */
export function spendEffort(
  state: RoosterTrainingState,
  stat: GeneticStatKey,
  desiredEv: number
): { evGain: number; effortSpent: StatBlock } {
  const headroom = effortHeadroom(state, stat);
  const evGain = Math.max(0, Math.min(desiredEv, headroom));
  const effortSpent = { ...state.effortSpent, [stat]: state.effortSpent[stat] + evGain };
  return { evGain, effortSpent };
}

/** Moves already-spent effort from one stat back into another's headroom; refunds no EV already earned. */
export function redistributeEffort(
  state: RoosterTrainingState,
  from: GeneticStatKey,
  to: GeneticStatKey,
  amount: number
): StatBlock {
  if (amount <= 0) throw new RangeError("amount must be positive");
  if (amount > state.effortSpent[from]) throw new RangeError("cannot move more than what's spent on the source stat");
  if (state.effortSpent[to] + amount > MAX_TRAINING_EFFORT_PER_STAT) {
    throw new RangeError("destination stat would exceed its per-stat effort cap");
  }

  return {
    ...state.effortSpent,
    [from]: state.effortSpent[from] - amount,
    [to]: state.effortSpent[to] + amount,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-effort.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/training/effort.ts lib/__tests__/training-effort.test.ts
git commit -m "feat(training): add Training Effort headroom and redistribution"
```

---

### Task 6: Intensity levels (`lib/training/intensity.ts`)

**Files:**
- Create: `lib/training/intensity.ts`
- Test: `lib/__tests__/training-intensity.test.ts`

**Interfaces:**
- Consumes: `TrainingIntensity` (from `../types`).
- Produces: `INTENSITY_MULTIPLIERS: Record<TrainingIntensity, IntensityMultiplier>`
  (`IntensityMultiplier = { energy: number; fatigue: number; evGain: number;
  stress: number; injuryChance: number }`), `applyIntensity(base: { energy: number;
  fatigue: number; evGain: number }, intensity: TrainingIntensity): { energy:
  number; fatigue: number; evGain: number; stress: number; injuryChance: number }`
  — consumed by Task 9.

- [ ] **Step 1: Write the failing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { INTENSITY_MULTIPLIERS, applyIntensity } from "../training/intensity";

test("moderate intensity reproduces the base numbers exactly with no stress or injury risk", () => {
  const result = applyIntensity({ energy: 10, fatigue: 14, evGain: 5 }, "moderate");
  assert.deepEqual(result, { energy: 10, fatigue: 14, evGain: 5, stress: 0, injuryChance: 0 });
});

test("light intensity scales everything down and adds no stress", () => {
  const result = applyIntensity({ energy: 10, fatigue: 14, evGain: 5 }, "light");
  assert.equal(result.energy, 6);
  assert.equal(result.stress, 0);
  assert.equal(result.injuryChance, 0);
});

test("hard intensity increases fatigue more than energy and produces stress", () => {
  const result = applyIntensity({ energy: 10, fatigue: 14, evGain: 5 }, "hard");
  assert.equal(result.energy, 14);
  assert.equal(Math.round(result.fatigue), 22);
  assert.ok(result.stress > 0);
  assert.ok(result.injuryChance > 0);
});

test("extreme intensity is the highest risk tier", () => {
  const result = applyIntensity({ energy: 10, fatigue: 14, evGain: 5 }, "extreme");
  assert.ok(result.stress > INTENSITY_MULTIPLIERS.hard.stress);
  assert.ok(result.injuryChance > INTENSITY_MULTIPLIERS.hard.injuryChance);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-intensity.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
import type { TrainingIntensity } from "../types";

export type IntensityMultiplier = {
  energy: number;
  fatigue: number;
  evGain: number;
  stress: number;
  injuryChance: number;
};

/** Per-intensity cost/reward curve (design spec: Intensity) — "moderate" is today's unmodified default. */
export const INTENSITY_MULTIPLIERS: Record<TrainingIntensity, IntensityMultiplier> = {
  light: { energy: 0.6, fatigue: 0.6, evGain: 0.6, stress: 0, injuryChance: 0 },
  moderate: { energy: 1.0, fatigue: 1.0, evGain: 1.0, stress: 0, injuryChance: 0 },
  hard: { energy: 1.4, fatigue: 1.6, evGain: 1.4, stress: 8, injuryChance: 0.03 },
  extreme: { energy: 1.8, fatigue: 2.2, evGain: 1.8, stress: 16, injuryChance: 0.08 },
};

/** Scales a session's base energy/fatigue/EV numbers by intensity and reports the intensity's flat stress/injury terms. */
export function applyIntensity(
  base: { energy: number; fatigue: number; evGain: number },
  intensity: TrainingIntensity
): { energy: number; fatigue: number; evGain: number; stress: number; injuryChance: number } {
  const m = INTENSITY_MULTIPLIERS[intensity];
  return {
    energy: base.energy * m.energy,
    fatigue: base.fatigue * m.fatigue,
    evGain: base.evGain * m.evGain,
    stress: m.stress,
    injuryChance: m.injuryChance,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-intensity.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/training/intensity.ts lib/__tests__/training-intensity.test.ts
git commit -m "feat(training): add training intensity levels"
```

---

### Task 7: Breakthroughs (`lib/training/breakthroughs.ts`)

**Files:**
- Create: `lib/training/breakthroughs.ts`
- Test: `lib/__tests__/training-breakthroughs.test.ts`

**Interfaces:**
- Consumes: `GeneticStatKey`, `TrainingCategory`, `TrainingTraitId`,
  `BreakthroughLogEntry`, `RoosterTrainingState` (from `../types`).
- Produces: `BREAKTHROUGH_BASE_CHANCE = 0.02`, `BREAKTHROUGH_MILESTONE_BONUS =
  0.01`, `BONUS_EV_ON_BREAKTHROUGH = 5`, `TRAINING_TRAIT_POOL: readonly
  TrainingTraitId[]` (`["iron_body", "fast_learner"]`),
  `crossedMilestone(before: number, after: number): boolean`,
  `rollBreakthrough(params: { state: RoosterTrainingState; stat: GeneticStatKey;
  category: TrainingCategory; xpBefore: RoosterTrainingState; xpAfter:
  RoosterTrainingState; rng: Rng }): BreakthroughLogEntry | null`,
  `checkOvertrainedTrigger(params: { extremeSessionStreak: number;
  trainingFatigue: number; hasTrait: boolean }): boolean` — consumed by Task 9.

- [ ] **Step 1: Write the failing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import {
  BONUS_EV_ON_BREAKTHROUGH,
  crossedMilestone,
  rollBreakthrough,
  checkOvertrainedTrigger,
} from "../training/breakthroughs";
import { defaultRoosterTrainingState } from "../training/state";
import { statBlock } from "./testHelpers";

test("crossedMilestone is true only when a multiple of 100 is crossed", () => {
  assert.equal(crossedMilestone(95, 100), true);
  assert.equal(crossedMilestone(90, 99), false);
  assert.equal(crossedMilestone(100, 105), false);
});

test("rollBreakthrough returns null when the roll misses", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  const rng = () => 0.99; // well above any possible chance
  const result = rollBreakthrough({
    state,
    stat: "power",
    category: "strength",
    xpBefore: state,
    xpAfter: state,
    rng,
  });
  assert.equal(result, null);
});

test("rollBreakthrough grants bonus EV on a low roll within the 70% bonus-EV band", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  const rolls = [0, 0.5]; // first roll: succeeds (0 < chance); second roll: 0.5 < 0.7 -> bonus_ev
  const rng = () => rolls.shift() ?? 0;
  const result = rollBreakthrough({
    state,
    stat: "power",
    category: "strength",
    xpBefore: state,
    xpAfter: state,
    rng,
  });
  assert.equal(result?.kind, "bonus_ev");
  assert.equal(result?.stat, "power");
});

test("rollBreakthrough grants a trait on a low roll within the 30% trait band", () => {
  const state = defaultRoosterTrainingState(statBlock(80));
  const rolls = [0, 0.99]; // succeeds, then lands in the trait band
  const rng = () => rolls.shift() ?? 0;
  const result = rollBreakthrough({
    state,
    stat: "power",
    category: "strength",
    xpBefore: state,
    xpAfter: state,
    rng,
  });
  assert.equal(result?.kind, "trait");
  assert.ok(result?.traitId);
});

test("BONUS_EV_ON_BREAKTHROUGH is the flat +5 nudge from the spec", () => {
  assert.equal(BONUS_EV_ON_BREAKTHROUGH, 5);
});

test("checkOvertrainedTrigger fires at the 5-session/high-fatigue threshold and not before", () => {
  assert.equal(checkOvertrainedTrigger({ extremeSessionStreak: 5, trainingFatigue: 85, hasTrait: false }), true);
  assert.equal(checkOvertrainedTrigger({ extremeSessionStreak: 4, trainingFatigue: 85, hasTrait: false }), false);
  assert.equal(checkOvertrainedTrigger({ extremeSessionStreak: 5, trainingFatigue: 84, hasTrait: false }), false);
  assert.equal(checkOvertrainedTrigger({ extremeSessionStreak: 5, trainingFatigue: 85, hasTrait: true }), false);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-breakthroughs.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
import type {
  BreakthroughLogEntry,
  GeneticStatKey,
  RoosterTrainingState,
  TrainingCategory,
  TrainingTraitId,
} from "../types";

export type Rng = () => number;

export const BREAKTHROUGH_BASE_CHANCE = 0.02;
export const BREAKTHROUGH_MILESTONE_BONUS = 0.01;
export const BONUS_EV_ON_BREAKTHROUGH = 5;
export const TRAINING_TRAIT_POOL: readonly TrainingTraitId[] = ["iron_body", "fast_learner"];

const XP_MILESTONE = 100;

/** Whether an XP pool's value just crossed a multiple of 100 this session. */
export function crossedMilestone(before: number, after: number): boolean {
  return Math.floor(before / XP_MILESTONE) < Math.floor(after / XP_MILESTONE);
}

/**
 * Rolls one breakthrough chance per session (design spec: Breakthroughs).
 * `xpBefore`/`xpAfter` are the RoosterTrainingState snapshots straddling this
 * session's `creditXp` call, used to count milestone crossings for the bonus.
 */
export function rollBreakthrough(params: {
  state: RoosterTrainingState;
  stat: GeneticStatKey;
  category: TrainingCategory;
  xpBefore: RoosterTrainingState;
  xpAfter: RoosterTrainingState;
  rng: Rng;
}): BreakthroughLogEntry | null {
  const { state, stat, category, xpBefore, xpAfter, rng } = params;

  const pools: (keyof RoosterTrainingState)[] = [
    "physicalXP",
    "combatXP",
    "tacticalXP",
    "disciplineXP",
    "recoveryXP",
  ];
  const milestonesCrossed = pools.filter((pool) =>
    crossedMilestone(xpBefore[pool] as number, xpAfter[pool] as number)
  ).length;

  const chance = BREAKTHROUGH_BASE_CHANCE + milestonesCrossed * BREAKTHROUGH_MILESTONE_BONUS;
  if (rng() >= chance) return null;

  const kindRoll = rng();
  if (kindRoll < 0.7) {
    return { stat, category, at: Date.now(), kind: "bonus_ev" };
  }

  const available = TRAINING_TRAIT_POOL.filter((id) => !state.traits.some((t) => t.id === id));
  if (available.length === 0) return { stat, category, at: Date.now(), kind: "bonus_ev" };

  const traitId = available[Math.floor(kindRoll * available.length) % available.length];
  return { stat, category, at: Date.now(), kind: "trait", traitId };
}

const OVERTRAINED_SESSION_THRESHOLD = 5;
const OVERTRAINED_FATIGUE_THRESHOLD = 85;

/** Forces (never rolls) the Overtrained penalty trait once a chicken has ground extreme sessions while pinned at high fatigue. */
export function checkOvertrainedTrigger(params: {
  extremeSessionStreak: number;
  trainingFatigue: number;
  hasTrait: boolean;
}): boolean {
  const { extremeSessionStreak, trainingFatigue, hasTrait } = params;
  if (hasTrait) return false;
  return extremeSessionStreak >= OVERTRAINED_SESSION_THRESHOLD && trainingFatigue >= OVERTRAINED_FATIGUE_THRESHOLD;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-breakthroughs.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/training/breakthroughs.ts lib/__tests__/training-breakthroughs.test.ts
git commit -m "feat(training): add breakthrough rolls and training traits"
```

---

### Task 8: Session orchestration (`lib/training/session.ts`)

**Files:**
- Create: `lib/training/session.ts`
- Test: `lib/__tests__/training-session.test.ts`

**Interfaces:**
- Consumes: `creditXp` (Task 3), `spendEffort` (Task 5), `applyIntensity` (Task 6),
  `rollBreakthrough`, `checkOvertrainedTrigger` (Task 7), `discoverPotential`
  (Task 4), `applyDevelopment` (existing `lib/training/development.ts`).
- Produces: `applyTrainingSession(params: { roosterTraining: RoosterTrainingState;
  ev: StatBlock; category: TrainingCategory; stat: GeneticStatKey; baseGain:
  number; trainingFatigue: number; lifeStageMultiplier: number; intensity:
  TrainingIntensity; extremeSessionStreak: number; rng: Rng }): { ev: StatBlock;
  roosterTraining: RoosterTrainingState; energyMultiplier: number;
  fatigueMultiplier: number; stressGain: number; injuryChance: number;
  breakthrough: BreakthroughLogEntry | null; overtrainedTriggered: boolean }`
  — consumed by Task 9 (`lib/training.ts` `trainStat`).

- [ ] **Step 1: Write the failing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";

import { applyTrainingSession } from "../training/session";
import { defaultRoosterTrainingState } from "../training/state";
import { statBlock } from "./testHelpers";

test("applyTrainingSession at moderate intensity matches today's plain EV gain when potential/effort don't bind", () => {
  const roosterTraining = defaultRoosterTrainingState(statBlock(100));
  const result = applyTrainingSession({
    roosterTraining,
    ev: statBlock(10),
    category: "strength",
    stat: "power",
    baseGain: 5,
    trainingFatigue: 0,
    lifeStageMultiplier: 1,
    intensity: "moderate",
    extremeSessionStreak: 0,
    rng: () => 0.999, // never breakthroughs, never trainingPotential-limited (already rolled)
  });

  assert.equal(result.ev.power, 15);
  assert.equal(result.energyMultiplier, 1);
  assert.equal(result.fatigueMultiplier, 1);
  assert.equal(result.stressGain, 0);
});

test("applyTrainingSession clamps EV to trainingPotential, not the flat 100 cap", () => {
  const roosterTraining = defaultRoosterTrainingState({ ...statBlock(100), power: 12 });
  const result = applyTrainingSession({
    roosterTraining,
    ev: statBlock(10),
    category: "strength",
    stat: "power",
    baseGain: 5,
    trainingFatigue: 0,
    lifeStageMultiplier: 1,
    intensity: "moderate",
    extremeSessionStreak: 0,
    rng: () => 0.999,
  });

  assert.equal(result.ev.power, 12);
});

test("applyTrainingSession credits XP pools for the trained category", () => {
  const roosterTraining = defaultRoosterTrainingState(statBlock(100));
  const result = applyTrainingSession({
    roosterTraining,
    ev: statBlock(10),
    category: "recovery",
    stat: "stamina",
    baseGain: 5,
    trainingFatigue: 0,
    lifeStageMultiplier: 1,
    intensity: "moderate",
    extremeSessionStreak: 0,
    rng: () => 0.999,
  });

  assert.equal(result.roosterTraining.recoveryXP, 10);
});

test("applyTrainingSession at hard intensity produces stress", () => {
  const roosterTraining = defaultRoosterTrainingState(statBlock(100));
  const result = applyTrainingSession({
    roosterTraining,
    ev: statBlock(10),
    category: "strength",
    stat: "power",
    baseGain: 5,
    trainingFatigue: 0,
    lifeStageMultiplier: 1,
    intensity: "hard",
    extremeSessionStreak: 0,
    rng: () => 0.999,
  });

  assert.equal(result.stressGain, 8);
  assert.ok(result.injuryChance > 0);
});

test("applyTrainingSession forces the overtrained trigger after 5 extreme sessions at high fatigue", () => {
  const roosterTraining = defaultRoosterTrainingState(statBlock(100));
  const result = applyTrainingSession({
    roosterTraining,
    ev: statBlock(10),
    category: "strength",
    stat: "power",
    baseGain: 5,
    trainingFatigue: 85,
    lifeStageMultiplier: 1,
    intensity: "extreme",
    extremeSessionStreak: 5,
    rng: () => 0.999,
  });

  assert.equal(result.overtrainedTriggered, true);
  assert.ok(result.roosterTraining.traits.some((t) => t.id === "overtrained"));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-session.test.ts`
Expected: FAIL — module doesn't exist.

- [ ] **Step 3: Write the implementation**

```ts
import { applyDevelopment } from "./development";
import { creditXp } from "./xp";
import { spendEffort } from "./effort";
import { applyIntensity } from "./intensity";
import { rollBreakthrough, checkOvertrainedTrigger, BONUS_EV_ON_BREAKTHROUGH } from "./breakthroughs";
import { discoverPotential } from "./potential";
import type {
  BreakthroughLogEntry,
  GeneticStatKey,
  RoosterTrainingState,
  StatBlock,
  TrainingCategory,
  TrainingIntensity,
} from "../types";

export type Rng = () => number;

export function applyTrainingSession(params: {
  roosterTraining: RoosterTrainingState;
  ev: StatBlock;
  category: TrainingCategory;
  stat: GeneticStatKey;
  baseGain: number;
  trainingFatigue: number;
  lifeStageMultiplier: number;
  intensity: TrainingIntensity;
  extremeSessionStreak: number;
  rng: Rng;
}): {
  ev: StatBlock;
  roosterTraining: RoosterTrainingState;
  energyMultiplier: number;
  fatigueMultiplier: number;
  stressGain: number;
  injuryChance: number;
  breakthrough: BreakthroughLogEntry | null;
  overtrainedTriggered: boolean;
} {
  const {
    roosterTraining,
    ev,
    category,
    stat,
    baseGain,
    trainingFatigue,
    lifeStageMultiplier,
    intensity,
    extremeSessionStreak,
    rng,
  } = params;

  const scaled = applyIntensity({ energy: 1, fatigue: 1, evGain: baseGain }, intensity);

  const developedEv = applyDevelopment({
    ev,
    category,
    baseGain: scaled.evGain,
    trainingFatigue,
    lifeStageMultiplier,
  });
  const desiredGain = Math.min(
    developedEv[stat] - ev[stat],
    roosterTraining.trainingPotential[stat] - ev[stat]
  );

  const { evGain, effortSpent } = spendEffort(roosterTraining, stat, Math.max(0, desiredGain));
  const nextEv: StatBlock = { ...ev, [stat]: Math.min(roosterTraining.trainingPotential[stat], ev[stat] + evGain) };

  const xpBefore = roosterTraining;
  const xpAfter = creditXp({ ...roosterTraining, effortSpent }, category);

  const breakthrough = rollBreakthrough({
    state: xpAfter,
    stat,
    category,
    xpBefore,
    xpAfter,
    rng,
  });

  let finalEv = nextEv;
  let traits = xpAfter.traits;
  let breakthroughs = xpAfter.breakthroughs;
  if (breakthrough) {
    breakthroughs = [...breakthroughs, breakthrough].slice(-50);
    if (breakthrough.kind === "bonus_ev") {
      const cap = roosterTraining.trainingPotential[stat];
      finalEv = { ...finalEv, [stat]: Math.min(cap, finalEv[stat] + BONUS_EV_ON_BREAKTHROUGH) };
    } else if (breakthrough.kind === "trait" && breakthrough.traitId) {
      traits = [...traits, { id: breakthrough.traitId, grantedAt: breakthrough.at }];
    }
  }

  const overtrainedTriggered = checkOvertrainedTrigger({
    extremeSessionStreak,
    trainingFatigue,
    hasTrait: traits.some((t) => t.id === "overtrained"),
  });
  if (overtrainedTriggered) {
    traits = [...traits, { id: "overtrained", grantedAt: Date.now() }];
  }

  const potentialRevealed = discoverPotential({ ...xpAfter, effortSpent, traits, breakthroughs });

  return {
    ev: finalEv,
    roosterTraining: potentialRevealed,
    energyMultiplier: scaled.energy,
    fatigueMultiplier: scaled.fatigue,
    stressGain: scaled.stress,
    injuryChance: scaled.injuryChance,
    breakthrough,
    overtrainedTriggered,
  };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-session.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/training/session.ts lib/__tests__/training-session.test.ts
git commit -m "feat(training): add session orchestration wiring xp/effort/intensity/breakthroughs"
```

---

### Task 9: Extend `trainStat()` to opt into the Phase 1 pipeline

**Files:**
- Modify: `lib/training.ts`
- Modify: `lib/__tests__/training.test.ts` (add new cases; existing cases must
  keep passing unmodified)

**Interfaces:**
- Consumes: `applyTrainingSession` (Task 8).
- Produces: `trainStat(chicken, stat, category?, options?): { ev, energy,
  trainingState, stressGain?, roosterTraining?, breakthrough? }` where
  `options?: { intensity?: TrainingIntensity; roosterTraining?:
  RoosterTrainingState; extremeSessionStreak?: number; rng?: () => number }`
  — consumed by Task 11 (route handler).

- [ ] **Step 1: Write the failing tests (appended to existing file)**

```ts
import { applyTrainingSession } from "../training/session";
import { defaultRoosterTrainingState } from "../training/state";

test("trainStat with no options behaves exactly as before (backward compat)", () => {
  const chicken = makeChicken({ ev: statBlock(10), trainingState: undefined });
  const result = trainStat(chicken, "power");

  assert.equal(result.ev.power, 10 + EV_PER_TRAIN);
  assert.equal(result.stressGain, undefined);
  assert.equal(result.roosterTraining, undefined);
});

test("trainStat with a roosterTraining option produces stress at hard intensity", () => {
  const roosterTraining = defaultRoosterTrainingState(statBlock(100));
  const chicken = makeChicken({ ev: statBlock(10) });
  const result = trainStat(chicken, "power", undefined, {
    intensity: "hard",
    roosterTraining,
    rng: () => 0.999,
  });

  assert.ok((result.stressGain ?? 0) > 0);
  assert.ok(result.roosterTraining);
});

test("trainStat caps EV at the chicken's trainingPotential, not the flat 100", () => {
  const roosterTraining = defaultRoosterTrainingState({ ...statBlock(100), power: 12 });
  const chicken = makeChicken({ ev: statBlock(10) });
  const result = trainStat(chicken, "power", "strength", { roosterTraining, rng: () => 0.999 });

  assert.equal(result.ev.power, 12);
});
```

- [ ] **Step 2: Run tests to verify the new ones fail**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training.test.ts`
Expected: existing tests PASS, the 3 new tests FAIL (no `options` param yet).

- [ ] **Step 3: Modify `lib/training.ts`**

Replace the `trainStat` function body with:

```ts
import { applyTrainingSession } from "./training/session";
import type {
  Chicken,
  GeneticStatKey,
  RoosterTrainingState,
  StatBlock,
  TrainingCategory,
  TrainingIntensity,
  TrainingState,
} from "./types";

export type TrainStatOptions = {
  intensity?: TrainingIntensity;
  roosterTraining?: RoosterTrainingState;
  extremeSessionStreak?: number;
  rng?: () => number;
};

export function trainStat(
  chicken: Chicken,
  stat: GeneticStatKey,
  category: TrainingCategory = STAT_TO_CATEGORY[stat],
  options?: TrainStatOptions
): {
  ev: StatBlock;
  energy: number;
  trainingState: TrainingState;
  stressGain?: number;
  roosterTraining?: RoosterTrainingState;
  breakthrough?: ReturnType<typeof applyTrainingSession>["breakthrough"];
} {
  const trainingState = chicken.trainingState ?? defaultTrainingState();
  const lifeStageMultiplier = declineMultiplier(deriveLifeStage(chicken));
  const intensity = options?.intensity ?? "moderate";

  if (!chicken.trainingState) {
    const ev = { ...chicken.ev, [stat]: Math.min(MAX_EV, chicken.ev[stat] + EV_PER_TRAIN) };
    const energy = Math.max(0, chicken.energy - ENERGY_PER_TRAIN);
    const nextTrainingState: TrainingState = {
      trainingPoints: Math.max(0, trainingState.trainingPoints - TRAINING_POINT_COST),
      trainingFatigue: Math.min(100, trainingState.trainingFatigue + TRAINING_FATIGUE_PER_SESSION),
      history: [...trainingState.history, { category, at: Date.now() }].slice(-50),
    };
    return { ev, energy, trainingState: nextTrainingState };
  }

  if (options?.roosterTraining) {
    const session = applyTrainingSession({
      roosterTraining: options.roosterTraining,
      ev: chicken.ev,
      category,
      stat,
      baseGain: EV_PER_TRAIN,
      trainingFatigue: trainingState.trainingFatigue,
      lifeStageMultiplier,
      intensity,
      extremeSessionStreak: options.extremeSessionStreak ?? 0,
      rng: options.rng ?? Math.random,
    });

    const energy = Math.max(0, chicken.energy - ENERGY_PER_TRAIN * session.energyMultiplier);
    const nextTrainingState: TrainingState = {
      trainingPoints: Math.max(0, trainingState.trainingPoints - TRAINING_POINT_COST),
      trainingFatigue: Math.min(
        100,
        trainingState.trainingFatigue + TRAINING_FATIGUE_PER_SESSION * session.fatigueMultiplier
      ),
      history: [...trainingState.history, { category, at: Date.now() }].slice(-50),
    };

    return {
      ev: session.ev,
      energy,
      trainingState: nextTrainingState,
      stressGain: session.stressGain,
      roosterTraining: session.roosterTraining,
      breakthrough: session.breakthrough,
    };
  }

  const ev = applyDevelopment({
    ev: chicken.ev,
    category,
    baseGain: EV_PER_TRAIN,
    trainingFatigue: trainingState.trainingFatigue,
    lifeStageMultiplier,
  });
  const energy = Math.max(0, chicken.energy - ENERGY_PER_TRAIN);
  const nextTrainingState: TrainingState = {
    trainingPoints: Math.max(0, trainingState.trainingPoints - TRAINING_POINT_COST),
    trainingFatigue: Math.min(100, trainingState.trainingFatigue + TRAINING_FATIGUE_PER_SESSION),
    history: [...trainingState.history, { category, at: Date.now() }].slice(-50),
  };
  return { ev, energy, trainingState: nextTrainingState };
}
```

Keep the file's existing imports/exports (`EV_PER_TRAIN`, `ENERGY_PER_TRAIN`,
`MAX_EV`, `MAX_ENERGY`, `canAffordTraining`, `restEnergy`, `STAT_TO_CATEGORY`,
and the re-exports from `./training/limits`) unchanged — only `trainStat`'s
body and signature change.

- [ ] **Step 4: Run tests to verify they pass**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training.test.ts`
Expected: PASS (all, old and new).

- [ ] **Step 5: Full unit suite regression check**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/*.test.ts`
Expected: same pass/fail counts as documented in
`docs/rooster-training-medical-v3-progress.md` (218 pass / 23 pre-existing
fail) plus this plan's new passing tests — no new failures outside the
pre-existing list.

- [ ] **Step 6: Commit**

```bash
git add lib/training.ts lib/__tests__/training.test.ts
git commit -m "feat(training): wire trainStat into the Phase 1 session pipeline behind an opt-in option"
```

---

### Task 10: `RoosterTraining` errors + DB service (`lib/training/errors.ts`, `lib/training/service.ts`)

**Files:**
- Create: `lib/training/errors.ts`
- Create: `lib/training/service.ts`
- Test: `lib/__tests__/training-service.test.ts` (DB-backed, follows
  `train-route.test.ts` conventions — requires `docker compose up -d`)

**Interfaces:**
- Consumes: `prisma` (`../db`), `rollTrainingPotential` (Task 4),
  `defaultRoosterTrainingState` (Task 4), `redistributeEffort` (Task 5),
  `REDISTRIBUTE_CREDITS_PER_POINT` (Task 5), `MedicalError`-style pattern.
- Produces: `TrainingError` class with codes `ROOSTER_TRAINING_NOT_FOUND`,
  `CHICKEN_NOT_FOUND`, `CHICKEN_NOT_OWNED`, `INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE`,
  `INVALID_REDISTRIBUTE_AMOUNT`;
  `getOrCreateRoosterTraining(chickenId: string, iv: StatBlock): Promise<RoosterTrainingState & { id: string }>`;
  `redistributeEffortForChicken(playerId: string, chickenId: string, from:
  GeneticStatKey, to: GeneticStatKey, amount: number): Promise<RoosterTrainingState>`
  — consumed by Task 11 (route handlers).

- [ ] **Step 1: Write the failing tests**

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { getOrCreateRoosterTraining, redistributeEffortForChicken } from "../training/service";
import { TrainingError } from "../training/errors";
import { REDISTRIBUTE_CREDITS_PER_POINT } from "../training/effort";
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
      id,
      playerId,
      name: "Test",
      sex: "rooster",
      generation: 0,
      bloodlineId: id,
      iv: statBlock(50),
      ev: statBlock(0),
      traits: [],
      age: 1,
      health: 100,
      energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
      growthStage: "adult",
    },
  });
  return id;
}

test.beforeEach(async () => {
  await prisma.roosterTraining.deleteMany();
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("getOrCreateRoosterTraining creates a row once and reuses it after", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);

  const first = await getOrCreateRoosterTraining(chickenId, statBlock(50));
  const second = await getOrCreateRoosterTraining(chickenId, statBlock(50));

  assert.equal(first.id, second.id);
  assert.equal(first.physicalXP, 0);
});

test("redistributeEffortForChicken moves effort and debits credits", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);
  const roosterTraining = await getOrCreateRoosterTraining(chickenId, statBlock(50));

  await prisma.roosterTraining.update({
    where: { id: roosterTraining.id },
    data: { effortSpent: { ...roosterTraining.effortSpent, power: 40 } },
  });

  const before = await prisma.player.findUnique({ where: { id: player.id } });
  const result = await redistributeEffortForChicken(player.id, chickenId, "power", "speed", 10);

  const after = await prisma.player.findUnique({ where: { id: player.id } });
  assert.equal(result.effortSpent.power, 30);
  assert.equal(result.effortSpent.speed, 10);
  assert.equal(before!.credits - after!.credits, 10 * REDISTRIBUTE_CREDITS_PER_POINT);
});

test("redistributeEffortForChicken throws INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE when the player can't afford it", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);
  const roosterTraining = await getOrCreateRoosterTraining(chickenId, statBlock(50));
  await prisma.roosterTraining.update({
    where: { id: roosterTraining.id },
    data: { effortSpent: { ...roosterTraining.effortSpent, power: 40 } },
  });
  await prisma.player.update({ where: { id: player.id }, data: { credits: 0 } });

  await assert.rejects(
    () => redistributeEffortForChicken(player.id, chickenId, "power", "speed", 10),
    (err: unknown) => err instanceof TrainingError && err.code === "INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE"
  );
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `docker compose up -d && node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-service.test.ts`
Expected: FAIL — modules don't exist.

- [ ] **Step 3: Write `lib/training/errors.ts`**

```ts
export type TrainingErrorCode =
  | "ROOSTER_TRAINING_NOT_FOUND"
  | "CHICKEN_NOT_FOUND"
  | "CHICKEN_NOT_OWNED"
  | "INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE"
  | "INVALID_REDISTRIBUTE_AMOUNT";

const STATUS_BY_CODE: Record<TrainingErrorCode, number> = {
  ROOSTER_TRAINING_NOT_FOUND: 404,
  CHICKEN_NOT_FOUND: 404,
  CHICKEN_NOT_OWNED: 404,
  INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE: 400,
  INVALID_REDISTRIBUTE_AMOUNT: 400,
};

export class TrainingError extends Error {
  code: TrainingErrorCode;
  status: number;

  constructor(code: TrainingErrorCode) {
    super(code);
    this.code = code;
    this.status = STATUS_BY_CODE[code];
  }
}
```

- [ ] **Step 4: Write `lib/training/service.ts`**

```ts
import { prisma } from "../db";
import { defaultRoosterTrainingState } from "./state";
import { rollTrainingPotential } from "./potential";
import { redistributeEffort, REDISTRIBUTE_CREDITS_PER_POINT } from "./effort";
import { TrainingError } from "./errors";
import type { GeneticStatKey, RoosterTrainingState, StatBlock } from "../types";

function toState(row: {
  physicalXP: number;
  combatXP: number;
  tacticalXP: number;
  disciplineXP: number;
  recoveryXP: number;
  effortSpent: unknown;
  trainingPotential: unknown;
  discovered: unknown;
  traits: unknown;
  breakthroughs: unknown;
}): RoosterTrainingState {
  return {
    physicalXP: row.physicalXP,
    combatXP: row.combatXP,
    tacticalXP: row.tacticalXP,
    disciplineXP: row.disciplineXP,
    recoveryXP: row.recoveryXP,
    effortSpent: row.effortSpent as StatBlock,
    trainingPotential: row.trainingPotential as StatBlock,
    discovered: row.discovered as RoosterTrainingState["discovered"],
    traits: row.traits as RoosterTrainingState["traits"],
    breakthroughs: row.breakthroughs as RoosterTrainingState["breakthroughs"],
  };
}

/** Lazily creates the per-chicken RoosterTraining row, rolling trainingPotential once from IV (design spec: Data model). */
export async function getOrCreateRoosterTraining(
  chickenId: string,
  iv: StatBlock
): Promise<RoosterTrainingState & { id: string }> {
  const existing = await prisma.roosterTraining.findUnique({ where: { chickenId } });
  if (existing) return { id: existing.id, ...toState(existing) };

  const trainingPotential = rollTrainingPotential(iv, Math.random);
  const fresh = defaultRoosterTrainingState(trainingPotential);
  const created = await prisma.roosterTraining.create({
    data: {
      chickenId,
      physicalXP: fresh.physicalXP,
      combatXP: fresh.combatXP,
      tacticalXP: fresh.tacticalXP,
      disciplineXP: fresh.disciplineXP,
      recoveryXP: fresh.recoveryXP,
      effortSpent: fresh.effortSpent as object,
      trainingPotential: fresh.trainingPotential as object,
      discovered: fresh.discovered as object,
      traits: fresh.traits as object,
      breakthroughs: fresh.breakthroughs as object,
    },
  });
  return { id: created.id, ...toState(created) };
}

/** Moves spent Training Effort between two stats for a chicken, debiting the player REDISTRIBUTE_CREDITS_PER_POINT per point moved. */
export async function redistributeEffortForChicken(
  playerId: string,
  chickenId: string,
  from: GeneticStatKey,
  to: GeneticStatKey,
  amount: number
): Promise<RoosterTrainingState> {
  if (amount <= 0) throw new TrainingError("INVALID_REDISTRIBUTE_AMOUNT");

  return prisma.$transaction(async (tx) => {
    const chicken = await tx.chicken.findUnique({ where: { id: chickenId } });
    if (!chicken) throw new TrainingError("CHICKEN_NOT_FOUND");
    if (chicken.playerId !== playerId) throw new TrainingError("CHICKEN_NOT_OWNED");

    const row = await tx.roosterTraining.findUnique({ where: { chickenId } });
    if (!row) throw new TrainingError("ROOSTER_TRAINING_NOT_FOUND");

    const state = toState(row);
    const cost = amount * REDISTRIBUTE_CREDITS_PER_POINT;

    const player = await tx.player.findUnique({ where: { id: playerId } });
    if (!player || player.credits < cost) throw new TrainingError("INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE");

    let effortSpent: StatBlock;
    try {
      effortSpent = redistributeEffort(state, from, to, amount);
    } catch {
      throw new TrainingError("INVALID_REDISTRIBUTE_AMOUNT");
    }

    await tx.player.update({ where: { id: playerId }, data: { credits: player.credits - cost } });
    const updated = await tx.roosterTraining.update({
      where: { chickenId },
      data: { effortSpent: effortSpent as object },
    });

    return toState(updated);
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-service.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/training/errors.ts lib/training/service.ts lib/__tests__/training-service.test.ts
git commit -m "feat(training): add RoosterTraining DB service and credits-costed redistribution"
```

---

### Task 11: Wire intensity + `RoosterTraining` into the train route, add the redistribute route

**Files:**
- Modify: `app/api/chickens/[id]/train/route.ts`
- Create: `app/api/chickens/[id]/training/redistribute/route.ts`
- Test: `lib/__tests__/train-route.test.ts` (extend with new cases)
- Test: `lib/__tests__/training-redistribute-route.test.ts` (new)

**Interfaces:**
- Consumes: `trainStat` w/ `options` (Task 9), `getOrCreateRoosterTraining`,
  `redistributeEffortForChicken`, `TrainingError` (Task 10).
- Produces: updated JSON response shape from `POST /api/chickens/[id]/train`
  (adds `roosterTraining`, `stressGain`, `breakthrough` fields, all optional/
  additive — existing consumers reading `chicken.ev`/`chicken.energy` are
  unaffected); new `POST /api/chickens/[id]/training/redistribute` endpoint.

- [ ] **Step 1: Write the failing tests (train route)**

Append to `lib/__tests__/train-route.test.ts`:

```ts
test("POST /api/chickens/:id/train accepts an intensity and returns roosterTraining + stressGain", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, {});

  const response = await POST(
    new Request(`http://localhost/api/chickens/${id}/train`, {
      method: "POST",
      body: JSON.stringify({ stat: "power", intensity: "hard" }),
    }),
    { params: Promise.resolve({ id }) }
  );
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.ok(body.roosterTraining);
  assert.ok(body.stressGain > 0);
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `docker compose up -d && node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/train-route.test.ts`
Expected: FAIL — route doesn't return `roosterTraining`/`stressGain` yet.

- [ ] **Step 3: Modify `app/api/chickens/[id]/train/route.ts`**

```ts
import { NextResponse } from "next/server";

import { createInjuryRecord } from "@/lib/combat/injuries";
import { prisma } from "@/lib/db";
import { canTrain } from "@/lib/growth";
import { getOrCreatePlayer } from "@/lib/player";
import { canAffordTraining, overtrainingInjuryChance, trainStat } from "@/lib/training";
import { getOrCreateRoosterTraining } from "@/lib/training/service";
import {
  GENETIC_STAT_KEYS,
  TRAINING_INTENSITIES,
  type Chicken,
  type GeneticStatKey,
  type GrowthStage,
  type InjuryRecord,
  type TrainingIntensity,
} from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { stat, intensity } = (await request.json()) as { stat?: string; intensity?: string };

  if (!stat || !GENETIC_STAT_KEYS.includes(stat as GeneticStatKey)) {
    return NextResponse.json({ error: "Invalid stat" }, { status: 400 });
  }
  if (intensity && !TRAINING_INTENSITIES.includes(intensity as TrainingIntensity)) {
    return NextResponse.json({ error: "Invalid intensity" }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  const row = await prisma.chicken.findUnique({ where: { id } });

  if (!row || row.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }
  const chicken = row as unknown as Chicken;
  if (!canTrain(chicken.growthStage as GrowthStage)) {
    return NextResponse.json({ error: "Chicken cannot train at this growth stage" }, { status: 400 });
  }
  if (!canAffordTraining(chicken.energy)) {
    return NextResponse.json({ error: "Not enough energy to train" }, { status: 400 });
  }

  const roosterTraining = await getOrCreateRoosterTraining(id, chicken.iv);
  const { ev, energy, trainingState, stressGain, roosterTraining: nextRoosterTraining, breakthrough } = trainStat(
    chicken,
    stat as GeneticStatKey,
    undefined,
    { intensity: intensity as TrainingIntensity | undefined, roosterTraining }
  );

  // Overtraining risk (spec §23): pushing a fatigued training schedule can injure, not just under-deliver.
  let injuries: InjuryRecord[] = chicken.injuries ?? [];
  if (Math.random() < overtrainingInjuryChance(trainingState.trainingFatigue)) {
    injuries = [...injuries, createInjuryRecord(Math.random, "minor")];
  }

  const updated = await prisma.chicken.update({
    where: { id },
    data: {
      ev,
      energy,
      trainingState,
      injuries,
      injured: injuries.some((i) => !i.permanent && i.recoveryRemaining > 0),
      stress: stressGain ? Math.min(100, (chicken.stress ?? 0) + stressGain) : chicken.stress,
    },
  });

  if (nextRoosterTraining) {
    await prisma.roosterTraining.update({
      where: { chickenId: id },
      data: {
        physicalXP: nextRoosterTraining.physicalXP,
        combatXP: nextRoosterTraining.combatXP,
        tacticalXP: nextRoosterTraining.tacticalXP,
        disciplineXP: nextRoosterTraining.disciplineXP,
        recoveryXP: nextRoosterTraining.recoveryXP,
        effortSpent: nextRoosterTraining.effortSpent as object,
        discovered: nextRoosterTraining.discovered as object,
        traits: nextRoosterTraining.traits as object,
        breakthroughs: nextRoosterTraining.breakthroughs as object,
      },
    });
  }

  return NextResponse.json({ ...updated, roosterTraining: nextRoosterTraining, stressGain, breakthrough });
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/train-route.test.ts`
Expected: PASS (all cases, old and new).

- [ ] **Step 5: Write the failing test (redistribute route)**

Create `lib/__tests__/training-redistribute-route.test.ts`:

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { getOrCreateRoosterTraining } from "../training/service";
import { POST } from "../../app/api/chickens/[id]/training/redistribute/route";
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
      id,
      playerId,
      name: "Test",
      sex: "rooster",
      generation: 0,
      bloodlineId: id,
      iv: statBlock(50),
      ev: statBlock(0),
      traits: [],
      age: 1,
      health: 100,
      energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
      growthStage: "adult",
    },
  });
  return id;
}

function postRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/chickens/${id}/training/redistribute`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

test.beforeEach(async () => {
  await prisma.roosterTraining.deleteMany();
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST redistribute moves effort and returns the updated RoosterTraining state", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id);
  const roosterTraining = await getOrCreateRoosterTraining(id, statBlock(50));
  await prisma.roosterTraining.update({
    where: { id: roosterTraining.id },
    data: { effortSpent: { ...roosterTraining.effortSpent, power: 40 } },
  });

  const response = await POST(postRequest(id, { from: "power", to: "speed", amount: 10 }), {
    params: Promise.resolve({ id }),
  });
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.effortSpent.power, 30);
  assert.equal(body.effortSpent.speed, 10);
});

test("POST redistribute returns 400 for an invalid stat", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id);
  await getOrCreateRoosterTraining(id, statBlock(50));

  const response = await POST(postRequest(id, { from: "not-a-stat", to: "speed", amount: 10 }), {
    params: Promise.resolve({ id }),
  });
  assert.equal(response.status, 400);
});

test("POST redistribute returns 404 for an unknown chicken", async () => {
  const response = await POST(postRequest("missing", { from: "power", to: "speed", amount: 10 }), {
    params: Promise.resolve({ id: "missing" }),
  });
  assert.equal(response.status, 404);
});
```

- [ ] **Step 6: Run to verify it fails**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-redistribute-route.test.ts`
Expected: FAIL — route file doesn't exist.

- [ ] **Step 7: Create `app/api/chickens/[id]/training/redistribute/route.ts`**

```ts
import { NextResponse } from "next/server";

import { getOrCreatePlayer } from "@/lib/player";
import { TrainingError } from "@/lib/training/errors";
import { redistributeEffortForChicken } from "@/lib/training/service";
import { GENETIC_STAT_KEYS, type GeneticStatKey } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { from, to, amount } = (await request.json()) as { from?: string; to?: string; amount?: number };

  if (
    !from ||
    !to ||
    !GENETIC_STAT_KEYS.includes(from as GeneticStatKey) ||
    !GENETIC_STAT_KEYS.includes(to as GeneticStatKey) ||
    typeof amount !== "number" ||
    amount <= 0
  ) {
    return NextResponse.json({ error: "Invalid redistribute request" }, { status: 400 });
  }

  const player = await getOrCreatePlayer();

  try {
    const result = await redistributeEffortForChicken(
      player.id,
      id,
      from as GeneticStatKey,
      to as GeneticStatKey,
      amount
    );
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof TrainingError) {
      return NextResponse.json({ error: err.code }, { status: err.status });
    }
    throw err;
  }
}
```

- [ ] **Step 8: Run to verify it passes**

Run: `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/training-redistribute-route.test.ts lib/__tests__/train-route.test.ts`
Expected: PASS.

- [ ] **Step 9: Full regression pass**

Run:
```
docker compose up -d && npx prisma migrate deploy
yarn test
npx tsc --noEmit
yarn lint
```
Expected: same baseline as documented in
`docs/rooster-training-medical-v3-progress.md` (pre-existing 23 test failures /
16 tsc errors / 6 lint errors, all in the previously-documented files) plus
every new test from this plan passing, zero new lint/tsc errors.

- [ ] **Step 10: Commit**

```bash
git add app/api/chickens/\[id\]/train/route.ts app/api/chickens/\[id\]/training lib/__tests__/train-route.test.ts lib/__tests__/training-redistribute-route.test.ts
git commit -m "feat(training): wire intensity/RoosterTraining into the train route, add redistribute endpoint"
```

---

## Self-Review Notes

- **Spec coverage:** XP pools (Task 3), Training Effort + redistribution (Tasks
  5, 10, 11), hidden trainingPotential/discovery (Task 4), intensity levels
  (Task 6), stress-from-training (Tasks 6, 8, 9, 11), breakthroughs + training
  traits (Task 7), `RoosterTraining` aggregate row (Tasks 2, 10) — every Phase 1
  gap item from the progress doc has a task.
- **Backward compatibility:** Task 9 explicitly tests that omitting `options`
  reproduces today's exact `trainStat` output; Task 6 tests that `"moderate"`
  intensity reproduces the base numbers unchanged.
- **Out of scope confirmed:** no UI changes in this plan (intensity picker /
  effort bars / potential bands display) — the progress doc's Phase 1 list is
  entirely data-layer; a follow-up UI plan can consume the new API fields this
  plan adds (`roosterTraining`, `stressGain`, `breakthrough` in the train
  response).
