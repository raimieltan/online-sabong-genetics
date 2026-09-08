# Rooster Training / Facilities / Medical & Recovery — v3.0 implementation progress

Source spec: the "ROOSTER TRAINING, FACILITIES, MEDICAL & RECOVERY SYSTEM" v3.0 doc
(140 sections, 9 phases). This file tracks what's built vs. what's left.

Branch: `feat/v2-combat-choreography`. Nothing committed yet as of 2026-09-07.

---

## DONE this session (tested, tsc + lint clean on new files)

### Medical / Clinic system (spec Phase 4–5)
- `lib/medical/config.ts` — `CLINIC_LEVELS` (4: Basic Clinic → Elite Vet Facility),
  `canTreatSeverity`, upgrade costs, permanent-damage reduction per level.
- `lib/medical/status.ts` — `medicalStatus()` (healthy → critical), tone helpers.
- `lib/medical/eligibility.ts` — `battleEligibility()` returns `{ eligible, reasons[] }`
  (condition/health/illness/overtraining/career-injury floors; spec §36, §85).
- `lib/medical/rehab.ts` — `trainingLocks()` (injury location → locked TrainingCategory,
  spec §86), `rehabStage()` return-to-training ladder (spec §41, §87).
- `lib/medical/treatment.ts` — `treatmentPlan()` (cost/duration/effectiveness by clinic
  level), `resolveTreatment()`, `markInTreatment()`.
- `lib/medical/illness.ts` — illness records, `rollIllness()` (from fatigue/stress/
  condition, not combat), `tickIllnessRecovery()`.
- `lib/medical/errors.ts` — `MedicalError` + codes.
- `lib/medical/service.ts` — `getOrCreateClinic`, `clinicView`, `claimExpiredTreatments`
  (time-gated, server-authoritative), `startInjuryTreatment`, `medicalRest`,
  `upgradeClinic`, `rosterMedicalOverview`.
- Routes: `GET /api/clinic`, `POST /api/clinic/upgrade`,
  `GET|POST /api/chickens/[id]/medical` (`{action:"treat",injuryId}` | `{action:"medical_rest"}`).
- UI: `app/clinic/page.tsx` (Medical Center, spec §91), `components/ConditionMonitor.tsx`
  (spec §88) wired into `app/chicken/[chickenId]/page.tsx` Info tab.
- Sidebar: added Training + Clinic links.
- Tests: `lib/__tests__/medical.test.ts` (23), `lib/__tests__/medical-route.test.ts` (5) — all pass.

### Recovery system (spec Phase 2)
- `lib/recovery/engine.ts` — `recoveryQuality()` 0–100 (spec §25), `applyRecovery()`
  (energy always tops off; quality scales fatigue/stress/condition/injury/illness ticks;
  methods: rest / extended_rest / recovery_facility / medical_rest).
- `app/api/chickens/[id]/rest/route.ts` now runs through `applyRecovery` (accepts
  `{ method }`), persists stress/morale/illnesses.

### Data model
- `prisma/schema.prisma`:
  - `Chicken`: added `illnesses Json`, `stress Int`, `morale Int`.
  - New `MedicalTreatment` model.
  - `onDelete: Cascade` on Player→Facility, Player→PveProgress, Facility→TrainingSession.
  - Migration: `20260907124937_add_medical_and_cascade_deletes`.
- `lib/types.ts`: `InjuryLocation`, `INJURY_LOCATIONS`, `IllnessType`, `IllnessRecord`,
  `MedicalStatus`, `RehabStage`; `InjuryRecord.location?` + `.inTreatment?`;
  `Chicken.illnesses?/stress?/morale?`.

### Training system — only change
- `lib/facilities/service.ts` `startTrainingSession` now rejects a category that's
  injury-locked (`TRAINING_LOCKED_BY_INJURY` error code added to `lib/facilities/errors.ts`).
- `app/training/page.tsx` shows selected chicken's medical status + fatigue, greys out
  and disables injury-locked program cards, shows eligibility warnings.

### Test-infra fixes (were blocking ~9 test files / the whole suite)
- `scripts/test-ts-loader-hooks.mjs` — also retry `.ts` on `ERR_UNSUPPORTED_DIR_IMPORT`
  (needed because `lib/combat.ts`+`lib/combat/` and `lib/training.ts`+`lib/training/`
  coexist; the bundler prefers the file, Node's raw resolver hit the directory).
- `prisma` cascade deletes (above) — tests never cleaned `Facility`/`PveProgress`/
  `TrainingSession`, so one polluted run blocked every later `player.deleteMany()`.
- `lib/__tests__/testHelpers.ts` — `makeChicken` colorScheme updated to the current
  `ChickenColorScheme` shape (`body/hackle/wings/tail/comb/beak/shanks`).
- Suite: 132 → 218 passing. 23 remaining failures are PRE-EXISTING (see below).

---

## NOT DONE — remaining spec work

### Phase 1 gaps — Core Training (spec §5–21, §76–82, §115)
Existing `lib/training/` + `lib/training.ts` cover energy, `trainingFatigue`,
`trainingPoints`, diminishing returns, EV caps at 100. Missing:
- Multiple XP category pools: `physicalXP / combatXP / tacticalXP / disciplineXP /
  recoveryXP` (spec §6, §115) — currently a single implicit EV pool.
- `trainingEffort` EV-like system separate from raw EV, `MAX_TRAINING_EFFORT = 500`
  total + per-attribute distribution cap (spec §80–81), redistribution w/ cost (§82).
- IV discovery / hidden `trainingPotential` per stat (§76, §79).
- Training intensity levels (light/moderate/hard/extreme) with per-intensity
  energy/fatigue/injury (spec §8, §84 warning modal).
- `stress` gain from hard training (wired into recovery already; not yet produced by training).
- Breakthrough / training special events (spec §93–96) — `adaptationResult` exists but
  no breakthrough roll, no training traits (Iron Body, Fast Learner, Overtrained, …).
- `TrainingSession` DB row already persists per session (spec §117); no `RoosterTraining`
  aggregate row (spec §115) — currently all on `Chicken.trainingState` JSON.

### Phase 3 — Combat Experience → Training loop (spec §5, §70–72, §129–132)
- `Chicken.experience` (7 categories) already earned from fights via
  `lib/combat/experience.ts` + `applyFightOutcome`. Missing:
  - `confidence` + `battleHardening` as tracked values (spec §44, §47); morale delta
    from win/loss (spec §46) — `stress`/`morale` columns now exist, nothing writes them
    on fight.
  - Battle report payload (spec §70) — structured "combat XP +120, confidence +8,
    injury: minor leg strain" summary from a fight.
  - Training insights / weakness detection (spec §71–72): "struggled vs fast opponents →
    recommend speed training". Needs a `lib/training/insights.ts` reading fight logs.
  - Veteran vs. trauma trait outcomes from repeated hard battles (spec §44).

### Phase 6 — Facilities split (spec §53–66, §102–105, §118, §122)
Currently one `TRAINING_GYM` facility type routes every program. Missing:
- Separate facility types: Training Yard, Strength Area, Speed Track, Conditioning Area,
  Combat Arena, Recovery Center, Nutrition Center (+ existing Coop, Breeding, Clinic).
- Per-facility level configs, capacity, bonuses; map each `TRAINING_PROGRAMS` entry to a
  required facility type (spec §55–58).
- Facility synergy — training + nutrition + recovery compound (spec §62).
- `lib/facilities/` currently hard-codes `getOrCreateTrainingGym` / `TRAINING_GYM_LEVELS`;
  needs generalising to `getOrCreateFacility(type)` + a per-type config registry. The
  clinic already sidesteps this with its own `lib/medical/service.ts` path — unify later.
- Nutrition/feeding programs (spec §49–51) — not started.

### Phase 7 — Advanced Training (spec §21, §67–68, §99–101, §106–109)
- Training plans / weekly schedule (spec §21, §67) + auto-execution (spec §68, §109).
- Presets (Balanced/Power/Speed/… spec §108), specialization archetypes emerging from
  history (spec §19, §77).
- Training camps before tournaments (spec §100), camp types.
- Auto-management rules w/ safety floors (spec §109).

### Phase 8 — Competition prep (spec §52, §99, §101)
- Peak-condition window state machine: preparation → peak → maintenance → decline
  (spec §52). `conditionTier` exists but no temporary peak window.
- Tournament taper scheduling / recovery timing (spec §99).

### Phase 9 — Long-term career (spec §43, §97–98)
- `career/aging.ts` + `career/retirement.ts` + `summarizeCareer()` exist. Missing:
  - Persistent career-history record (spec §98) — training session counts by category,
    facilities used, titles, injuries, career peak.
  - Veteran / permanent-injury traits as first-class `Trait`s (spec §43) integrated with
    breeding.

### Cross-cutting
- Dev tools for the new systems (spec §128): add clinic/treatment/illness actions to
  `app/api/dev/facilities/route.ts` or a new `app/api/dev/medical/route.ts`.
- `lib/medical/service.ts` `claimExpiredTreatments` currently only clears the injury on
  completion; it does not accelerate `recoveryRemaining` mid-treatment (spec §41 partial
  progress). Fine for now (duration-gated), revisit if treatments get longer.

---

## Pre-existing branch breakage (NOT caused by this work, but blocks `yarn build`)

`yarn build` fails its TypeScript pass on ~16 errors in stale test/script fixtures from an
earlier `PhysicalBlock` (18-key rig block) and `ChickenColorScheme` refactor:
- `lib/__tests__/chickenGenerator.test.ts` (`.feathers/.details/.eyes`)
- `lib/__tests__/combat.test.ts`, `lib/__tests__/genetics.test.ts`,
  `lib/__tests__/physicalProfile.test.ts` (`{ body, legs, wings }` physical literals)
- `scripts/balance-sim.ts` (`.ts` import extension needs `allowImportingTsExtensions`)

These same files are also in the 23 runtime test failures (they fail on assertions too,
not just types). App code itself compiles (`✓ Compiled successfully`). Fixing = update the
fixtures to the current shapes (won't necessarily make the assertions pass — separate
investigation) or exclude `lib/__tests__` from the build typecheck.

---

## Verify commands

```
docker compose up -d && npx prisma migrate deploy   # DB on :5433
yarn test        # 218 pass / 23 pre-existing fail
npx tsc --noEmit # 16 pre-existing errors, all in the files listed above
yarn lint        # 6 pre-existing errors, none in medical/recovery/clinic code
```
