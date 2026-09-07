# Genetics → Breeding → Training → Combat: Full System Overview

This document traces every genetic and trained value in Rooster Arena from where it originates to
where it's actually consumed by combat resolution. It's a reference doc, not a design spec — the
authoritative spec is `docs/superpowers/specs/gamefowl_dynasty_full_mechanics.md`; this describes
the current implementation.

---

## 1. Genetics

Every `Chicken` carries three independent genetic layers, generated at conception (or randomly for
a gen-0 bird) and locked in until hatch/creation. Source: `lib/genetics.ts`, `lib/mutations.ts`,
`lib/breeds.ts`, `lib/types.ts`.

### 1.1 StatBlock — the combat "IV" (genetic ceiling)

Six `GeneticStatKey`s (`lib/types.ts:97-104`):

| Key | Role in combat |
|---|---|
| `power` | scales raw hit damage |
| `speed` | scales evade chance, offsets against agility for dodges |
| `stamina` | scales max HP, drains per action |
| `defense` | scales damage reduction |
| `accuracy` | scales hit chance / crit chance |
| `agility` | scales evade chance / dodge success |

A gen-0 chicken rolls these 40–99 (see `generateRandomChicken`). This is stored as `chicken.iv`.

### 1.2 PhysicalBlock — 18 body-proportion genes

`PHYSICAL_TRAIT_KEYS` (`lib/types.ts:135-154`): `scale, bodyGirth, bodyLength, chest, neckLength,
neckThick, headSize, combSize, wattleSize, beakLength, wingSpan, wingSize, legLength, legThick,
footSize, tailLength, tailSpread, tailArc`.

Each has its own clamp range (`PHYSICAL_TRAIT_RANGE`, e.g. `bodyGirth: 0.7–1.6`,
`legLength: 0.55–1.9`). These map 1:1 onto the 21-bone rig (`rooster_rigged.glb`) for rendering,
but combat **never reads these raw 18 values directly** — they're always compressed through
`lib/physicalProfile.ts` first (see §2).

### 1.3 MutationGenome — 6 catalog mutations

`lib/mutations.ts` — data-driven, so breeding/combat never hardcode a specific mutation's
behavior:

| id | rarity | inheritance | spontaneous chance | stat modifiers | incompatible with |
|---|---|---|---|---|---|
| `iron_spurs` | common | recessive | 1/100 | `power +35%` | `two_headed` |
| `extra_wings` | rare | recessive | 1/1,000 | `agility +15%`, `speed +10%` | `two_headed` |
| `albino` | rare | recessive | 1/1,000 | none | `luminescent` |
| `luminescent` | epic | dominant | 1/10,000 | `accuracy +5%` | `albino` |
| `giant` | epic | codominant | 1/10,000 | `power +15%`, `speed −10%` | none |
| `two_headed` | anomalous | recessive | 1/1,000,000 | `accuracy +5%`, `agility −10%` | `iron_spurs`, `extra_wings` |

Stat modifiers are multiplicative deltas consumed by `mutationStatMultiplier()` (§4.1). A mutation
also emits a `visualEffect` tag for rendering only (`resolveVisualTraits`).

### 1.4 Cosmetics — breed and color

`lib/breeds.ts` defines 5 named breed presets (texas, sweater, asil, kelso, hatch) that bias trait
ranges and starting colors at generation time only. `pickRandomBreed()` rolls ~60% one of the 5
purebreds, ~40% "mixed" (fully random, no breed tag). **Combat never reads `chicken.breed`** —
only whatever trait/color values it biased at creation.

---

## 2. Physical Profile — the genetics→combat compression layer

`lib/physicalProfile.ts` is deliberately the *only* place raw physical genes touch combat math —
this centralizes balance instead of scattering trait reads through combat code.

### 2.1 `resolvePhysicalProfile()` — 6 bounded multipliers (0.85–1.15, centered on 1.0)

```
body  = (bodyGirth + bodyLength + chest) / 3
wings = (wingSpan + wingSize) / 2

mass        = toModifier(body)
reach       = toModifier(legLength)
mobility    = toModifier((wings + legLength) / (2 * bodyGirth))
stability   = toModifier((bodyGirth + neckThick) / (2 * legLength))
wingControl = toModifier(wings / chest)
kickPower   = toModifier((legThick + footSize + bodyGirth) / 3)
```
where `toModifier(ratio) = clamp(1 + (ratio - 1) * 0.2, 0.85, 1.15)`.

### 2.2 `traitStatModifier()` — second, independent 0.85–1.15 multiplier per genetic stat

```
power    ← (legThick + footSize + chest) / 3
speed    ← (legLength + 1/bodyGirth) / 2
stamina  ← (chest + bodyGirth) / 2
defense  ← (bodyGirth + wingSpan + neckThick) / 3
accuracy ← (headSize + beakLength + neckLength) / 3
agility  ← (legLength + wingSpan + 1/bodyGirth) / 3
```

Both layers apply simultaneously in `effectiveStat()` (§4.1) — they are not redundant: the
6-multiplier `PhysicalProfile` feeds situational combat math (accuracy×reach, agility×mobility,
defense×stability, leg hits×kickPower, wing hits×1/wingControl), while `traitStatModifier`
feeds directly into the stat itself.

---

## 3. Breeding

`app/api/breed/route.ts` + `lib/genetics.ts`. Requires a father (rooster) and mother (hen), both
adult+.

- **Stats**: `inheritStat(fatherValue, motherValue, rng)` — draws a blend weight `0.35–0.65`
  (biased toward whichever parent rng favors that call), applies tri-sample noise (±8 spread),
  rounds, clamps to `1–99`. On top, a 3% chance per stat of a `+10 to +20` mutation-style bonus.
- **Physical traits**: `inheritPhysicalTrait()` — same blend-weight logic, noise spread scaled to
  8% of that trait's own range, clamped to the trait's `PHYSICAL_TRAIT_RANGE`. No mutation-bonus
  roll (proportions aren't "trained" or bonus-rollable, just blended).
- **Mutations**: `inheritMutations()` — per mutation in catalog order, each parent's allele passes
  with 50% chance if they carry/express it. 2 copies → carrier + expressed. 1 copy → carrier, and
  expressed only if `dominant`/`codominant` (always) or `random` (50/50). 0 copies can still trigger
  a fresh spontaneous expression at `spontaneousChance`. After resolving all mutations, incompatible
  pairs that both express are reconciled: inherited expression beats spontaneous; ties fall back to
  catalog order.
- **Colors**: RGB→HSL blend of parent colors with small hue/lightness drift; pattern is inherited
  from one parent at random (50/50).
- **Egg**: `generation = max(parents) + 1`, `bloodlineId` inherited from father, `breed` kept only
  if both parents share it (otherwise the offspring is "mixed"). Hatching later produces a
  chick-stage `Chicken` with all of the above locked in.

---

## 4. Training & Career

### 4.1 EV — trained stat investment (`lib/training.ts` facade → `lib/training/`)

- Training spends **energy** + a finite **`trainingPoints`** pool (max 100, cost 10/session,
  `lib/training/limits.ts`).
- Each session raises EV via `applyDevelopment()` (`lib/training/development.ts`):
  ```
  effectiveness = trainingEffectiveness(trainingFatigue)   // diminishing returns
  ev[primaryStat] += baseGain * effectiveness   (capped at EV=100)
  ev[tradeoffStat] -= baseGain * effectiveness * 0.2       // opposite-stat cost
  ```
- **Category → primary stat** map:
  | Category | Primary stat | Tradeoff stat |
  |---|---|---|
  | strength | power | stamina |
  | speed | speed | power |
  | agility | agility | power |
  | defense | defense | — |
  | stamina | stamina | speed |
  | technique | accuracy | — |
  | recovery | stamina | — |
  | discipline | accuracy | — |
- **Diminishing returns curve** (`trainingEffectiveness`, keyed on `trainingFatigue`):
  `fatigue < 30 → 100%`, `< 60 → 75%`, `< 85 → 40%`, `≥ 85 → 15%`.
- Each session adds `+14` training fatigue; resting fully refills `trainingPoints` and recovers
  `−25` fatigue.
- **Overtraining injury risk**: once fatigue ≥ 85, injury chance = `(fatigue - 85) / 100` per
  session.

### 4.2 Career state (`lib/career/`)

- **Condition** (`condition.ts`) — 5 tiers with a bounded stat/readiness multiplier applied to the
  combat decision layer (never to `effectiveStat` directly):
  `peak (≥90) → 1.0`, `good (≥75) → 0.97`, `compromised (≥50) → 0.88`, `poor (≥25) → 0.75`,
  `unfit (<25) → 0.6`. Rest recovers `+12` condition per cycle.
- **Injuries** (`injuries.ts` / `combat/injuries.ts`) — non-permanent injuries tick down each rest
  cycle; **permanent** ("career_altering", 5% chance on a critical injury roll) injuries never
  heal and apply a lasting `StatBlock` penalty (e.g. `power −5, speed −5`) subtracted before
  `effectiveStat()` runs, plus they add `+2` accuracy-penalty per active injury in combat
  (`hit.injuryPenalty` in `resolution.ts`).
- **Life stage** (`aging.ts`) — derived from `growthStage` + total battle experience + condition,
  never age alone:
  - `senior`/`retired` growth stage → `veteran` if experience ≥ 900 and condition ≥ 60, else
    `decline`.
  - `young_adult` → always `developing`.
  - otherwise `prime` if experience ≥ 400 and condition ≥ 70, else `developing`.
  - **Veteran bonus**: small bounded bonus (`min(8, totalExperience/500)`) applied only to the
    derived-accuracy/decision layer, never to raw stats.
  - **Decline**: `declineMultiplier = 0.75` applied to recovery/training efficiency.
- **Retirement** (`retirement.ts`) — flips status only; all genetics/records/history preserved.

---

## 5. Combat — where it all converges

### 5.1 The core stat formula (`lib/combat/stats.ts`)

```
effectiveStat(chicken, key) =
    (IV[key] * 0.6 + EV[key] * 0.4)
    × mutationStatMultiplier(chicken, key)     // product of every expressed mutation's modifier
    × traitStatModifier(chicken, key)          // physical-genetics multiplier, §2.2

maxHealth(chicken) =
    (50 + effectiveStat(stamina) + effectiveStat(defense) * 0.5)
    × resolvePhysicalProfile(chicken).mass
```

This is **the single point where genetics (IV, 60% weight) and training (EV, 40% weight) combine**,
scaled by both the mutation genome and the physical-trait genome. Everything else in combat
(fatigue, behavior, experience, momentum, position, condition, injuries) modulates around this
number — none of them replace it.

### 5.2 Per-exchange stat consumption (`lib/combat/resolution.ts::resolveHit`)

| Combat quantity | Formula |
|---|---|
| Attacker's base accuracy | `effectiveStat(accuracy) × attackerPhysical.reach` |
| Final accuracy (`derivedAccuracy`) | `baseAccuracy + experienceConfidenceBonus + momentumBonus(momentum/100×5) − fatigueAccuracyPenalty − injuryPenalty(2×injuryCount) + positionalAdvantage(position×3 if >0)` |
| Defender agility (for miss chance) | `effectiveStat(agility) × defenderPhysical.mobility × fatigueStatMultiplier(defenderFatigue)` |
| Miss chance | `max(0, (defenderAgility − accuracy)/100 × 0.15)`, ×0.7 if attacker has `calm` trait |
| Base damage | `(10 + effectiveStat(power)×fatigueStatMultiplier(attackerFatigue)/10) × action.damagePotential`, ±20% variance |
| Crit chance | `min(accuracy/400, 0.25)`, crit multiplies damage ×1.5 |
| Defender's damage reduction | `min(effectiveStat(defense) × physical.stability × fatigueStatMultiplier × traitDefenseMult / 250, 0.4)` |
| Zone-specific multiplier | leg hit → `attackerPhysical.kickPower`; wing hit → `1 / defenderPhysical.wingControl`; else ×1 |
| Critical injury (head/neck crit only) | base 50% chance, ×0.5 if defender has `survivor` trait, ×`1 + fatigue/100×0.3` |

Hit-zone is a weighted roll (`head 5%, neck 5%, body 30%, wings 15%/15%, legs 15%/15%`).

### 5.3 Evade / Counter (also stat-driven)

```
evadeChance = 0.15
  + (effectiveStat(agility)×mobility×fatigueMult + effectiveStat(speed)×fatigueMult) / 500
  + attackerAction.commitment × 0.25
  + (experience.evasion/500) × 0.15
  + behavior.caution × 0.05
  + 0.1 if distance == FAR
  + 0.05 × position (if >0)
  − fatigueDecisionPenalty

counterChance = behavior.counterPreference×0.3 + (experience.counter/500)×0.25
  + attackerAction.commitment×0.3 + adaptationCounterBonus(opponentModel, experience.adaptation)
```

### 5.4 Behavior — genetics/traits pick a decision profile, not a raw stat

`lib/combat/behavior.ts`: `fightingStyle` (genetic, e.g. `aggressive/counter/endurance/balanced`)
selects a base `BehavioralProfile` (aggression, caution, patience, riskTolerance,
pressurePreference, counterPreference, recoveryPreference, persistence). Traits nudge it further
(e.g. `heavy-striker` +0.1 aggression, `glass-cannon` +0.2 riskTolerance/−0.15 caution). Every legal
action gets a weighted score (`scoreAction`) from this profile plus board state (stamina, fatigue,
stagger, momentum, position, opponent model, experience) — no hardcoded archetype branching.
Battle history slowly drifts the profile toward however a bird actually fights
(`driftBehaviorProfile`, ±0.02/battle, capped).

### 5.5 Experience — feeds decision quality, never raw stats

`lib/combat/experience.ts`: 7 categories (offensive, defensive, evasion, counter, pressure,
recovery, adaptation), capped at 500 each, gained only from actual fights.
`experienceConfidenceBonus = min(10, totalExperience / 350)` — added to accuracy.
`adaptationCounterBonus` rewards punishing an opponent who repeats the same action (up to +0.35
counter chance). The in-battle `OpponentModel` is an exponential moving average (α=0.25) of
observed opponent tendencies, reset every battle.

### 5.6 Fatigue vs. stamina (`lib/combat/fatigue.ts`)

Two separate pools: **stamina** (moment-to-moment, spent per action, `RECOVER` restores 22) and
**fatigue** (accumulated exhaustion, `gain = staminaSpent×0.15 + commitment×4`, recovers slowly per
turn depending on action). Fatigue multiplies every stat used that turn
(`fatigueStatMultiplier = max(0.55, 1 − fatigue/100×0.45)`), penalizes accuracy
(`+fatigue/100×15`), and dulls decision quality (`fatigueDecisionPenalty = fatigue/100×0.3`,
subtracted from evade chance).

### 5.7 Momentum & Position

Momentum (`momentum.ts`, −100..100) swings per exchange (`+6` landed hit, `+16` successful counter,
`−14` countered, `+10` caused stagger, decays ×0.92/turn if untouched) and feeds back into
`derivedAccuracy` (`+momentum/100×5`) and into `behavior.ts`'s action scoring (aggressive actions
score higher at high momentum, defensive ones at low/negative momentum). Position (−/+, clamped)
shifts with each action's `positionalEffect` and adds a direct accuracy bonus
(`position×3` if positive) plus behavior-scoring nudges.

### 5.8 Actions (`lib/combat/actions.ts`)

8 actions, each with `staminaCost`, `commitment` (how exploitable/committed the choice is),
`recovery` (turns of restricted options afterward), `damagePotential`/`staggerPotential` (relative
to `LIGHT_ATTACK`'s 1.0 baseline), and `positionalEffect`. `HEAVY_ATTACK` (1.6× damage, 0.85
commitment) and `PRESSURE` (1.1 positional push) are the highest-risk/highest-payoff; `GUARD`/
`RECOVER` are near-zero commitment safety options. Staggered fighters are locked to `GUARD`/
`RECOVER` only; a fighter still inside a heavy-attack's recovery window loses access to
commitment > 0.4 actions.

---

## 6. End-to-end pipeline summary

```
┌─ Genetics (locked at conception/creation) ─────────────────────────┐
│ IV (StatBlock)  +  PhysicalBlock (18 genes)  +  MutationGenome     │
└───────────────┬─────────────────────────────────┬─────────────────┘
                │                                   │
                │                    resolvePhysicalProfile() → 6 bounded modifiers
                │                    traitStatModifier()      → per-stat modifier
                │                                   │
     ┌──────────▼──────────┐                        │
     │ Training (EV, 0-100)│                        │
     │ diminishing returns │                        │
     │ via trainingFatigue │                        │
     └──────────┬──────────┘                        │
                │                                   │
                └──────────────┬────────────────────┘
                               ▼
                    effectiveStat() = (IV×0.6 + EV×0.4) × mutationMult × traitMult
                    maxHealth()     = (50 + stamina + defense×0.5) × physicalProfile.mass
                               │
      ┌────────────────────────┼─────────────────────────────────────────┐
      ▼                        ▼                                         ▼
 resolveHit()            behavior.ts (fightingStyle+traits            career condition/
 accuracy/damage/        → BehavioralProfile → scoreAction())          injuries multiply/
 evade/crit/defense       modulated live by fatigue, momentum,         subtract before
 all read effectiveStat   position, experience, opponent model        effectiveStat runs
                               │
                               ▼
                    experience.ts gains (post-battle only) → feed back into
                    confidence/adaptation bonuses and behavior drift —
                    never into IV, EV, or raw genetics.
```

**Genetics sets the ceiling. Training partially fills it. Physical genes and mutations scale it.
Everything situational in combat — fatigue, momentum, position, behavior, experience, condition,
injuries — modulates around that number in real time, but never overwrites the underlying
genetic/trained stat itself.**
