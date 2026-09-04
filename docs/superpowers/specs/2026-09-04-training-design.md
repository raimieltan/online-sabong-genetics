# Training — Design Spec

Roadmap item 5 (Training/EV development), following on from hatching/growth
(item 4). Baseline: `docs/superpowers/specs/gamefowl_dynasty_full_mechanics.md`,
sections 4 (Genetics/EV), 12 (Training System), 13 (Training Limits).

## Scope

Instant, manual actions (no real-time clock, no cron job — same pattern as
growth's Age Up/Retire):

1. **Train** — raise one stat's EV by a fixed amount, at an energy cost.
2. **Rest** — restore energy so training can continue.

No cross-stat tradeoffs/"builds" and no Feed/currency economy in v1 — both
are explicitly deferred (tradeoffs can layer on later; Feed/resources arrive
with the economy system, roadmap item 8). These scope decisions were made
with the user up front.

## Data model

No new fields. `Chicken.ev: StatBlock` and `Chicken.energy: number` already
exist (`lib/types.ts`, `prisma/schema.prisma`) — no migration required.

## Stat mapping

1:1 onto the existing 6 `GeneticStatKey`s — every EV stat gets a matching
training action. ("Recovery" from the baseline's training list isn't a
stat in `StatBlock`, so it's dropped; "Defense" gets a training action even
though the baseline's list omits it, since Defense EV already exists.)

## Core logic (`lib/training.ts`)

Pure functions, mirroring `lib/growth.ts`'s style:

```ts
export const EV_PER_TRAIN = 5;
export const ENERGY_PER_TRAIN = 10;
export const MAX_EV = 100;
export const MAX_ENERGY = 100;

export function canAffordTraining(energy: number): boolean {
  return energy >= ENERGY_PER_TRAIN;
}

export function trainStat(chicken: Chicken, stat: GeneticStatKey): { ev: StatBlock; energy: number } {
  // clamp ev[stat] + EV_PER_TRAIN to MAX_EV, energy - ENERGY_PER_TRAIN floored at 0
  // caller must check canTrain(chicken.growthStage) && canAffordTraining(chicken.energy) first
}

export function restEnergy(): { energy: number } {
  // resets energy to MAX_ENERGY
}
```

`canTrain(stage)` already exists in `lib/growth.ts` and is reused unchanged
(gates `young_adult` / `adult` / `prime` / `senior`).

EV cap is **per-stat** (100 each, independent) — matches the baseline
example chicken's per-stat EVs (31/44/39/12/27, all under 100 independently)
rather than a shared pool.

## API routes

### `POST /api/chickens/[id]/train`

Body: `{ stat: GeneticStatKey }`.

1. Load chicken, verify ownership (404 otherwise) — same pattern as
   age-up/retire routes.
2. 400 if `stat` is not a valid `GeneticStatKey`.
3. 400 if `!canTrain(chicken.growthStage)`.
4. 400 if `!canAffordTraining(chicken.energy)`.
5. Apply `trainStat`, persist `ev` and `energy`, return updated chicken.

### `POST /api/chickens/[id]/rest`

1. Load chicken, verify ownership (404 otherwise).
2. Apply `restEnergy`, persist `energy`, return updated chicken.

(No growth-stage gate on rest — a chick can still rest.)

## UI (Coop / ChickenCard)

- Render 6 small EV bars (stat label + `ev[stat]/100`) on `ChickenCard`,
  next to the existing IV display, using `GENETIC_STAT_KEYS` for order.
- Per-stat "Train" button, shown when `canTrain(growthStage)` is true;
  disabled (not hidden) when energy < 10, so the cost is visible.
- A "Rest" button, shown whenever energy < 100.
- Same fetch-and-refresh pattern as the existing Age Up/Retire buttons.

## Testing (TDD)

- `lib/__tests__/training.test.ts`: EV clamps at 100, energy floors at 0,
  `canAffordTraining` boundary at exactly 10, `restEnergy` resets to 100
  regardless of starting value.
- Route tests (direct handler import + constructed `Request`, per the
  established pattern in `10602`): ownership 404, invalid stat 400,
  wrong growth stage 400, insufficient energy 400, happy path for both
  train and rest.
