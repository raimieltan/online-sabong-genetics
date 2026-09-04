# Hatching & Growth — Design Spec

Roadmap item 4 (Hatching/Growth), following on from genetics/breeding (items 2–3).
Baseline: `docs/superpowers/specs/gamefowl_dynasty_full_mechanics.md`, sections 7
(Breeding Process) and 11 (Chicken Growth).

## Scope

Two things:

1. **Hatching** — turn an incubating `Egg` into a `Chicken`, entering the lifecycle
   at the `chick` stage.
2. **Growth** — the full lifecycle ladder from the baseline spec, advanced by an
   explicit manual "Age Up" action (no real-time clock, no cron job), gating which
   actions a chicken is eligible for.

Time model, stage scope, and stage-effect scope were decided with the user up front:
manual/instant actions (no wall-clock timers), full 8-stage ladder implemented now,
eligibility gates only (no stat multipliers — those can layer on once Training,
roadmap item 5, exists).

## Data model

### `GrowthStage`

```ts
export type GrowthStage =
  | "chick"
  | "juvenile"
  | "young_adult"
  | "adult"
  | "prime"
  | "senior"
  | "retired";

export const GROWTH_STAGES: readonly GrowthStage[] = [
  "chick",
  "juvenile",
  "young_adult",
  "adult",
  "prime",
  "senior",
  "retired",
];
```

`Chicken` gains a `growthStage: GrowthStage` field. Prisma `Chicken` model gains a
matching `growthStage String` column (migration required).

`createChicken` (in `lib/chickenGenerator.ts`) gains two optional inputs:

- `growthStage` — defaults to `"adult"`. Gen-0/starter birds created directly via
  `generateRandomChicken` (used by `POST /api/chickens`) are usable immediately;
  they don't go through an egg.
- `traits` — defaults to `[]`. Needed so hatching can carry the egg's inherited
  traits into the new chicken (today `createChicken` always zeroes traits).

### Egg → Chicken mapping on hatch

The new chicken takes iv, traits, generation, bloodlineId, sex, and parents
(fatherId/motherId) straight from the egg. `ev` is zeroed, `record` is zeroed,
`status` is `"active"`, `growthStage` is `"chick"`, `age` is `0`.

## Growth logic (`lib/growth.ts`)

Pure functions, mirroring the style of `lib/genetics.ts` / `lib/traits.ts`:

- `nextGrowthStage(stage: GrowthStage): GrowthStage` — returns the next stage in
  `GROWTH_STAGES`; returns the same stage if already at `"senior"` or `"retired"`
  (aging up never auto-advances into retirement — see below).
- `canAgeUp(stage: GrowthStage): boolean` — `true` for every stage except
  `"senior"` and `"retired"`.
- `canRetire(stage: GrowthStage): boolean` — `true` only for `"senior"`.
  Retirement is an explicit player decision, not an automatic consequence of
  aging, so a valuable breeding hen can sit at `"senior"` indefinitely.
- `canTrain(stage: GrowthStage): boolean` / `canBattle(stage: GrowthStage): boolean`
  — `true` for `"young_adult"`, `"adult"`, `"prime"`, `"senior"`. A `"chick"` or
  `"juvenile"` is too young; `"retired"` no longer competes.
- `canBreed(stage: GrowthStage): boolean` — `true` for `"adult"`, `"prime"`,
  `"senior"`, `"retired"`. Matches the baseline spec's Hens section: a bird's
  breeding value can outlast its fighting career.

These are eligibility gates only — no stat multipliers per stage in this pass.

## API

### `POST /api/eggs/[id]/hatch`

- 404 if the egg doesn't exist or isn't owned by the current player.
- 400 if the egg's `status` isn't `"incubating"` (i.e. already hatched).
- On success: creates the `Chicken` (mapping above), deletes the `Egg` row,
  returns the new chicken with status 201.

### `POST /api/chickens/[id]/age-up`

- 404 if the chicken doesn't exist or isn't owned by the current player.
- 400 if `canAgeUp(chicken.growthStage)` is false.
- On success: sets `growthStage` to `nextGrowthStage(...)`, increments `age` by 1,
  returns the updated chicken.

### `POST /api/chickens/[id]/retire`

- 404 if the chicken doesn't exist or isn't owned by the current player.
- 400 if `canRetire(chicken.growthStage)` is false (i.e. not `"senior"`).
- On success: sets `growthStage` to `"retired"` and `status` to `"retired"`,
  returns the updated chicken.

## UI

- **Coop page** gains an "Eggs" section (backed by the existing `GET /api/eggs`)
  listing incubating eggs with a "Hatch" button per egg, calling the new hatch
  route and refreshing the roster.
- **`ChickenCard`** shows a growth-stage badge. Shows an "Age Up" button when
  `canAgeUp` is true, and a "Retire" button only when the chicken is `"senior"`.

## Testing

TDD throughout, following the project's existing `node --test` pattern:

- `lib/__tests__/growth.test.ts` — stage ordering via `nextGrowthStage`, and each
  `can*` gate function across all seven stages.
- Route tests for hatch/age-up/retire, following the existing
  `app/api/breed/__tests__` pattern: happy path, ownership/404 checks, and the
  400 validation cases (already-hatched egg, capped/non-senior chicken).
