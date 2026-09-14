# Training Phase 1 Foundation — Design Spec

Implements the "Phase 1 gaps — Core Training" section of
`docs/rooster-training-medical-v3-progress.md` (XP pools, Training Effort,
hidden Training Potential, intensity levels, stress-from-training, breakthroughs,
and the `RoosterTraining` aggregate row).

## Scope

In scope:
- 5 lifetime XP pools per chicken (`physicalXP/combatXP/tacticalXP/disciplineXP/recoveryXP`).
- Training Effort: lifetime spend cap (500 total, 100 per stat) gating EV growth,
  with credits-cost redistribution.
- Hidden per-stat `trainingPotential`, derived from IV, replacing the flat
  `MAX_EV = 100` ceiling; gradual discovery.
- Training intensity levels (light/moderate/hard/extreme) affecting energy,
  fatigue, EV gain, stress, and injury risk.
- Breakthrough rolls per session: bonus EV or a permanent training trait.
- `RoosterTraining` DB model (one row per chicken) aggregating all of the above.

Out of scope (left for later phases per the progress doc): combat-experience
insights loop, facility-type split, training plans/presets, peak-condition
windows, career-history record.

## Data model

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
  trainingPotential Json     // StatBlock, rolled once on row creation
  discovered        Json     @default("{}")       // Partial<Record<GeneticStatKey, boolean>>
  traits            Json     @default("[]")        // TrainingTrait[]
  breakthroughs     Json     @default("[]")        // BreakthroughLogEntry[]
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
}
```

Row is lazily created (`getOrCreateRoosterTraining(chickenId)`) the first time a
chicken trains, mirroring the existing `getOrCreateFacility` / clinic pattern.
`TrainingSession` is unchanged — it remains the per-session log; `RoosterTraining`
is the per-chicken aggregate.

### Types (`lib/types.ts` additions)

```ts
export type TrainingIntensity = "light" | "moderate" | "hard" | "extreme";

export type TrainingTraitId = "iron_body" | "fast_learner" | "overtrained";

export type TrainingTrait = {
  id: TrainingTraitId;
  grantedAt: number;
};

export type BreakthroughLogEntry = {
  stat: GeneticStatKey;
  category: TrainingCategory;
  at: number;
  kind: "bonus_ev" | "trait";
  traitId?: TrainingTraitId;
};

export type XpPool = "physicalXP" | "combatXP" | "tacticalXP" | "disciplineXP" | "recoveryXP";

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

## Mechanics

### XP pools (`lib/training/xp.ts`)

Every session credits XP to pools based on the trained `TrainingCategory`:

| TrainingCategory | Pools credited |
|---|---|
| strength | physicalXP |
| agility | physicalXP |
| stamina | physicalXP |
| speed | physicalXP, combatXP |
| technique | combatXP |
| defense | combatXP |
| discipline | tacticalXP |
| recovery | recoveryXP |

Flat `+10 XP` per pool per session (uncapped counter — display-only progression,
not spent). Used to gate breakthrough-chance bonuses (see below) and as the future
input to Phase 3 insights / Phase 7 specialization.

### Training Effort (`lib/training/effort.ts`)

- `MAX_TRAINING_EFFORT_TOTAL = 500` across all 6 stats.
- `MAX_TRAINING_EFFORT_PER_STAT = 100`.
- Each session's actual EV gain (post diminishing-returns, post intensity
  multiplier) is deducted 1:1 from remaining effort headroom:
  `available = min(500 - totalSpent, 100 - effortSpent[stat])`.
  If `available <= 0`, EV gain for that stat is clamped to 0 (session still
  costs energy/fatigue — the mistake of training an exhausted stat is a real cost).
  Otherwise `evGain = min(desiredGain, available)`, and `effortSpent[stat] += evGain`.
- **Redistribution**: `redistributeEffort(state, from, to, amount, credits)` moves
  `amount` from `effortSpent[from]` back to headroom (reduces `effortSpent[from]`,
  does not remove already-earned EV) for `amount * 10` credits, debited from
  `Player.credits`. Cannot redistribute more than `effortSpent[from]`, and cannot
  push `effortSpent[to]` over its per-stat cap.

### Training Potential (`lib/training/potential.ts`)

- Rolled once per chicken at `RoosterTraining` row creation:
  `trainingPotential[stat] = clamp(iv[stat] + randInt(-5, 15), 0, 100)`.
- Replaces the flat `MAX_EV = 100` in `applyDevelopment`: EV for a stat cannot
  exceed that chicken's `trainingPotential[stat]`.
- `discovered[stat]` flips true the first time `effortSpent[stat] >= 100` (i.e.
  the per-stat effort cap is reached) — at that point the UI shows the exact
  number instead of a fuzzy band.
- `potentialBand(value)` helper for un-discovered display: bands at
  <40 "Below Average", 40-69 "Average", 70-89 "Above Average", 90+ "Exceptional".

### Intensity (`lib/training/intensity.ts`)

```ts
export const INTENSITY_MULTIPLIERS: Record<TrainingIntensity, {
  energy: number; fatigue: number; evGain: number; stress: number; injuryChance: number;
}> = {
  light:    { energy: 0.6, fatigue: 0.6, evGain: 0.6, stress: 0,  injuryChance: 0 },
  moderate: { energy: 1.0, fatigue: 1.0, evGain: 1.0, stress: 0,  injuryChance: 0 },
  hard:     { energy: 1.4, fatigue: 1.6, evGain: 1.4, stress: 8,  injuryChance: 0.03 },
  extreme:  { energy: 1.8, fatigue: 2.2, evGain: 1.8, stress: 16, injuryChance: 0.08 },
};
```

`moderate` is the existing default behavior (unchanged numbers), so intensity
is purely additive — a chicken/route that doesn't pass an explicit intensity
keeps today's math exactly.

`trainStat` gains an optional `intensity: TrainingIntensity = "moderate"` param.
Hard/extreme roll `injuryChance` independently of the existing
`overtrainingInjuryChance(trainingFatigue)` (both can fire; take the union).
Stress from intensity feeds into the existing `Chicken.stress` column (already
wired for recovery consumption — this is the missing producer side, closing the
loop the progress doc flagged).

### Breakthroughs (`lib/training/breakthroughs.ts`)

- Rolled once per session, after EV/effort/stress are applied:
  `chance = 0.02 + milestoneBonus`, where `milestoneBonus = 0.01` for each XP
  pool credited this session that just crossed a multiple of 100.
- On success: `70%` → flat `+5` bonus EV to the trained stat (still subject to
  `trainingPotential` cap and effort headroom), `30%` → grant a `TrainingTrait`
  from `["iron_body", "fast_learner"]` if the chicken doesn't already have it.
- `overtrained` is never rolled — it's force-applied (once) the first time a
  chicken accumulates 5 extreme-intensity sessions while `trainingFatigue >= 85`;
  checked as a side effect of `trainStat`, not the breakthrough roll.
- Every outcome (including trait grants) appends a `BreakthroughLogEntry` to
  `breakthroughs` (capped at last 50, same pattern as `TrainingState.history`).

## API surface

- `lib/training/service.ts` (new): `getOrCreateRoosterTraining(chickenId)`,
  `redistributeEffort(...)`, wraps DB read/write so route handlers stay thin.
- `app/api/chickens/[id]/train/route.ts`: accepts optional `intensity` in the
  request body; response includes the updated `RoosterTraining` summary and any
  breakthrough result.
- New `app/api/chickens/[id]/training/redistribute/route.ts`:
  `POST { from, to, amount }` → redistributes effort, debits credits.
- `lib/training/errors.ts` (new): `TrainingError` with codes
  `EFFORT_EXHAUSTED`, `INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE`,
  `INVALID_REDISTRIBUTE_AMOUNT`.

## Error handling

Mirrors the existing `MedicalError` pattern (`lib/medical/errors.ts`): a class
with `code` + `message`, thrown from the lib layer, caught in the route handler
and mapped to a 4xx JSON response. No new error-handling philosophy introduced.

## Testing

New pure-function unit tests under `lib/__tests__/`, following existing
conventions (no DB, plain data in/out):
- `training-xp.test.ts` — pool crediting per category.
- `training-effort.test.ts` — headroom math, redistribution, exhaustion clamp.
- `training-potential.test.ts` — roll bounds, discovery threshold, band helper.
- `training-intensity.test.ts` — multiplier application, stress production,
  injury-chance union with existing overtraining chance.
- `training-breakthroughs.test.ts` — chance math, trait grant exclusivity,
  overtrained forced-trigger condition.

Existing `lib/training.ts` / `lib/training/development.ts` /
`lib/training/limits.ts` tests must continue passing unchanged — Phase 1 adds
new optional params with defaults that preserve current behavior byte-for-byte
when omitted (`intensity` defaults to `moderate`, `trainingPotential` only
applies when a `RoosterTraining` row exists, same pre-migration fallback pattern
already used for `TrainingState`).

## Migration

One additive Prisma migration: new `RoosterTraining` table only. No changes to
existing `Chicken` columns (stress/morale already exist from the medical work).
