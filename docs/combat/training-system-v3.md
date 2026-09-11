# Training System V3 — Unified Fighter Development Spec

**Project:** Rooster Arena
**System:** Training Gym / Fighter Development
**Status:** Design specification
**Primary goal:** Replace the current shallow timed-EV system with a unified fighter-development system that meaningfully connects physical training, combat experience, behavior, potential, traits, fatigue, facility progression, and player feedback.

---

# 1. Problem Statement

The current Training Gym is functional but feels weak because a training session primarily does only four things:

1. Adds a small amount of EV.
2. Consumes energy.
3. Adds training fatigue.
4. Sometimes subtracts EV from another stat.

This technically affects combat because EV contributes 40% of effective combat statistics:

```ts
effectiveStat =
  (IV * 0.6 + EV * 0.4)
  * growthFactor
  * mutationMultiplier
  * physicalTraitMultiplier;
```

However, the system has several structural problems.

## Current Problems

### 1.1 Training gains are difficult to perceive

A typical `+2 EV` session only increases the actual combat stat by approximately:

```text
2 EV × 0.4 = 0.8 effective stat
```

The UI often rounds combat stats to integers, so the player may see no change at all.

Training therefore feels broken even when it technically works.

---

### 1.2 Training only develops numbers

The current Training Gym mostly changes EV.

It does not significantly affect:

* combat knowledge
* countering ability
* pressure fighting
* defensive awareness
* adaptation
* behavioral tendencies
* confidence
* discipline
* training traits
* hidden potential
* specialization
* breakthroughs

These systems either exist elsewhere or are disconnected.

Training should help create a distinct fighter rather than merely increase numeric stats.

---

### 1.3 Two training systems currently exist

There is currently:

```text
Training Gym
    ↓
applyDevelopment()
    ↓
EV gain
```

and separately a richer training pipeline containing mechanics such as:

```text
training XP
hidden potential
effort allocation
training intensity
breakthroughs
training traits
stress
```

The current frontend Training Gym does not meaningfully use the richer system.

This must be unified.

There should be exactly one authoritative training pipeline.

---

### 1.4 Fatigue thresholds are too abrupt

Current effectiveness:

```ts
0–29   = 100%
30–59  = 75%
60–84  = 40%
85–100 = 15%
```

This causes hard cliffs.

Example:

```text
59 fatigue = 75% reward
60 fatigue = 40% reward
```

A single fatigue point almost halves training effectiveness.

This feels arbitrary and difficult for players to understand.

---

### 1.5 Permanent EV tradeoffs are too punishing

Current example:

```ts
strength training:
power += gain
stamina -= gain * 0.20
```

This means training can erase previous permanent development.

Repeatedly training one category may undo hours of earlier training.

Specialization should create tradeoffs, but training should usually not destroy permanent progress.

---

### 1.6 Gym upgrades are uninteresting

Current facility efficiency roughly increases:

```text
100%
105%
110%
115%
120%
```

The difference exists mathematically, but does not create significantly different gameplay.

Gym upgrades should unlock new training strategies and alter how fighters can be developed.

---

### 1.7 Recovery Training is misleading

The current Recovery program increases stamina EV while still generating fatigue.

It does not meaningfully improve recovery.

Either rename the program or convert it into an actual recovery-conditioning mechanic.

---

# 2. Core Design Philosophy

The development system should separate three major sources of fighter identity:

```text
GENETICS
Determines what the rooster could become.

TRAINING
Determines what abilities the rooster develops.

FIGHTING
Determines what the rooster learns through real experience.
```

This separation is extremely important.

A genetically elite rooster should have higher potential.

A well-trained rooster should perform substantially better than an untrained genetically similar rooster.

An experienced fighter should behave more intelligently than a gym-trained fighter with no real combat experience.

Therefore:

```text
Genetics → ceiling / natural strengths

Training → controlled development

Combat → experience / adaptation / battle hardening
```

Training must not replace breeding.

Combat must not replace training.

Breeding must not make training irrelevant.

---

# 3. Keep the Existing IV / EV Foundation

Do not replace the current core combat-stat formula.

Keep:

```ts
effectiveStat(chicken, key)
```

approximately:

```ts
const developed =
  chicken.iv[key] * 0.6 +
  chicken.ev[key] * 0.4;

return (
  developed *
  growthFactor(chicken.growthStage) *
  mutationStatMultiplier(chicken, key) *
  traitStatModifier(chicken, key)
);
```

The 60/40 genetics/training split is desirable because:

```text
Genetics remains important.
Training still matters significantly.
Bad genetics cannot trivially become perfect.
Good genetics still requires development.
Breeding remains relevant to the economy.
```

Do not solve training weakness by increasing EV weighting to 60% or 70%.

Fix the training system itself instead.

---

# 4. New Training Session Output

A training session should no longer return only an EV update.

Each completed training session should resolve into a structured `TrainingResult`.

Conceptually:

```ts
interface TrainingResult {
  sessionId: string;
  chickenId: string;

  statDevelopment: StatDevelopmentResult;
  experienceDevelopment: ExperienceDevelopmentResult;
  behaviorDevelopment?: BehaviorDevelopmentResult;

  potentialResult?: PotentialDevelopmentResult;
  traitResult?: TrainingTraitResult;
  breakthrough?: BreakthroughResult;

  resourceChanges: TrainingResourceChanges;
  readinessChanges: ReadinessChanges;

  injuryResult?: InjuryResult;

  summary: TrainingSummary;
}
```

Every session can potentially affect several dimensions.

The primary outputs are:

```text
EV development
Combat-development XP
Behavioral adaptation
Potential progression
Trait progression
Breakthroughs
Energy
Training fatigue
Stress
Condition/readiness
Possible injury
```

Not every session needs to modify every subsystem.

The program determines which outcomes are possible.

---

# 5. Fighter Development Layers

The system should contain four distinct progression layers.

## Layer A — Physical Development

This is the existing EV system.

Stats:

```ts
type GeneticStatKey =
  | "power"
  | "speed"
  | "agility"
  | "defense"
  | "stamina"
  | "accuracy";
```

Maximum:

```ts
MAX_EV = 100;
```

EV remains permanent development.

---

## Layer B — Combat Development

Create or reuse combat-development categories.

Recommended categories:

```ts
type CombatExperienceCategory =
  | "offensive"
  | "defensive"
  | "evasion"
  | "counter"
  | "pressure"
  | "recovery"
  | "adaptation";
```

These values represent learned fighting knowledge.

They should influence combat behavior and decision quality rather than functioning as another direct stat multiplier.

Examples:

```text
offensive
→ better attack selection
→ better combination selection
→ lower chance of wasting openings

defensive
→ better guard timing
→ better disengagement decisions

evasion
→ improved reaction selection
→ less unnecessary movement

counter
→ better counter-window recognition
→ better counter move selection

pressure
→ better pursuit
→ better ability to maintain offensive tempo

recovery
→ better disengagement and recovery decisions

adaptation
→ faster adjustment to opponent patterns during a fight
```

Training provides moderate combat-development XP.

Real fights should remain the strongest source.

---

## Layer C — Behavioral Development

Training should allow very small long-term shifts in behavioral tendencies.

Current behavior may contain fields such as:

```ts
interface BehaviorProfile {
  aggression: number;
  caution: number;
  patience: number;
  persistence: number;
  riskTolerance: number;

  counterPreference: number;
  pressurePreference: number;
  recoveryPreference: number;
}
```

Genetic/default behavioral tendencies remain dominant.

Training should modify them slowly.

Example:

```text
Counter Drills:

counterPreference +0.004
patience +0.002
aggression -0.001
```

Do not allow rapid personality rewriting.

Behavior shifts should generally be approximately:

```text
0.001 – 0.010 per session
```

depending on intensity, potential, age, and training effectiveness.

Clamp behavioral values:

```ts
0 <= behavior <= 1
```

Training should create tendencies, not deterministic commands.

A naturally aggressive rooster should still sometimes refuse defensive/counter-oriented instructions.

---

## Layer D — Traits and Specialization

Repeated training patterns should contribute toward traits.

Example traits:

```text
Counter Specialist
Pressure Fighter
Iron Conditioning
Sharp Eyes
Disciplined Fighter
Elusive Fighter
Heavy Hitter
Patient Reader
Fast Starter
Late-Round Fighter
Quick Learner
Training Resistant
Natural Athlete
```

Traits should emerge from accumulated behavior and training history rather than randomly appearing from one session.

Example requirement:

```text
Counter Specialist

Requirements:
counter XP >= 70
accuracy EV >= 60
agility EV >= 55
counter training sessions >= 12
counterPreference >= 0.55
```

Then either:

```text
Automatically unlock
```

or:

```text
Enable a breakthrough check
```

The latter is preferred for more excitement.

---

# 6. Unified Training Pipeline

Create one authoritative resolver.

Recommended architecture:

```ts
resolveTrainingSession(params)
```

All Training Gym completion should pass through this function.

Conceptually:

```text
Training session expires
        ↓
Lock session
        ↓
Load chicken
        ↓
Load facility
        ↓
Load program
        ↓
Resolve training context
        ↓
resolveTrainingSession()
        ↓
 ├── resolveTrainingEffectiveness()
 ├── resolveStatDevelopment()
 ├── resolveCombatExperience()
 ├── resolveBehaviorDevelopment()
 ├── resolvePotentialDevelopment()
 ├── resolveTraitProgress()
 ├── resolveBreakthrough()
 ├── resolveFatigue()
 ├── resolveStress()
 ├── resolveEnergy()
 └── resolveTrainingInjury()
        ↓
Persist all results atomically
        ↓
Store TrainingResult snapshot
```

The old standalone direct `/train` progression pipeline should either:

```text
A. be removed
```

or:

```text
B. call the exact same resolver internally
```

Do not maintain two independent progression algorithms.

---

# 7. Training Program Definition

Programs should become richer definitions.

Recommended type:

```ts
interface TrainingProgramDefinition {
  id: ProgramId;

  name: string;
  description: string;

  category: TrainingCategory | "custom";

  durationMinutes: number;

  energyCost: number;
  fatigueCost: number;
  stressCost: number;

  baseEvGain: number;

  primaryStats: Partial<Record<GeneticStatKey, number>>;
  secondaryStats?: Partial<Record<GeneticStatKey, number>>;

  experienceGain?: Partial<Record<CombatExperienceCategory, number>>;

  behaviorEffects?: Partial<Record<BehaviorKey, number>>;

  temporaryLoad?: Partial<Record<GeneticStatKey, number>>;

  breakthroughTags?: string[];
  traitTags?: string[];

  minimumGymLevel: number;

  injuryRiskMultiplier?: number;
  recoveryModifier?: number;
}
```

Programs should no longer need to map one-to-one with one stat.

---

# 8. Proposed Training Programs

## 8.1 Strength Work

Purpose:

```text
Develop striking power.
```

Effects:

```text
Primary:
power

Secondary:
defense small

Combat XP:
pressure
offensive

Behavior:
slightly more aggression/persistence

Temporary cost:
stamina readiness reduction

Fatigue:
high
```

Example:

```ts
{
  baseEvGain: 3.2,

  primaryStats: {
    power: 1,
  },

  secondaryStats: {
    defense: 0.15,
  },

  experienceGain: {
    offensive: 2,
    pressure: 2,
  },

  behaviorEffects: {
    aggression: 0.002,
    persistence: 0.002,
  }
}
```

---

## 8.2 Sprint Drills

Purpose:

```text
Explosive movement and engagement speed.
```

Effects:

```text
speed
small stamina
pressure XP
offensive XP
high fatigue
```

---

## 8.3 Footwork Circuit

Purpose:

```text
Movement, positioning, spacing, and disengagement.
```

Effects:

```text
agility
secondary speed
evasion XP
adaptation XP
slightly more caution/patience
```

Excellent for counter fighters.

---

## 8.4 Endurance Conditioning

Purpose:

```text
Long-fight stamina and physical conditioning.
```

Effects:

```text
stamina
small defense
recovery XP
reduced future training-fatigue accumulation at high development
```

Do not permanently subtract speed EV.

---

## 8.5 Target Drills

Purpose:

```text
Strike placement and offensive precision.
```

Effects:

```text
accuracy
small agility
offensive XP
```

---

## 8.6 Counter Drills

Purpose:

```text
Read attacks and punish openings.
```

Effects:

```text
accuracy
small agility

counter XP
defensive XP
adaptation XP

counterPreference increase
patience increase
small caution increase
```

This should be the core development program for an adaptive counter fighter.

---

## 8.7 Defensive Drills

Effects:

```text
defense
small stamina

defensive XP
recovery XP

caution increase
riskTolerance slight decrease
```

---

## 8.8 Pressure Drills

Effects:

```text
power
small stamina

pressure XP
offensive XP

pressurePreference increase
persistence increase
aggression increase
```

---

## 8.9 Discipline Training

Purpose:

```text
Improve obedience, composure, patience, and execution.
```

Effects:

```text
small accuracy EV

adaptation XP
defensive XP

patience increase
riskTolerance decrease slightly
command-compliance development
stress resistance
```

If the game has command obedience, this program should primarily develop that rather than merely accuracy.

---

## 8.10 Recovery Conditioning

Replace the misleading existing Recovery Training.

Purpose:

```text
Teach the rooster to recover efficiently between clashes.
```

Effects:

```text
small stamina EV
recovery XP
future fatigue recovery bonus
future stamina regeneration efficiency
```

This program should cause relatively low fatigue.

It should not magically heal active injuries.

---

## 8.11 Controlled Sparring

Unlock at middle gym levels.

Purpose:

```text
Low-risk combat practice.
```

Effects:

```text
small mixed EV
moderate combat XP
behavior development
trait progress
potential discovery
breakthrough chance
moderate fatigue
low injury risk
```

This should be one of the most important programs.

Example:

```text
EV reward:
1.0–2.0 distributed according to actions

Combat XP:
large relative to gym drills

Trait progression:
high

Behavior adaptation:
moderate
```

---

## 8.12 Hard Sparring

Late-game unlock.

Effects:

```text
more combat XP
more behavioral adaptation
higher breakthrough chance
higher battle-hardening progress
higher fatigue
meaningful injury risk
```

Still weaker than real fights for battle experience.

---

# 9. Training Intensity

Add training intensity as a player decision.

Recommended values:

```ts
type TrainingIntensity =
  | "light"
  | "normal"
  | "hard"
  | "extreme";
```

Recommended modifiers:

```ts
const TRAINING_INTENSITIES = {
  light: {
    gainMultiplier: 0.70,
    fatigueMultiplier: 0.50,
    energyMultiplier: 0.60,
    stressMultiplier: 0.50,
    injuryMultiplier: 0.25,
    breakthroughMultiplier: 0.75,
  },

  normal: {
    gainMultiplier: 1.00,
    fatigueMultiplier: 1.00,
    energyMultiplier: 1.00,
    stressMultiplier: 1.00,
    injuryMultiplier: 1.00,
    breakthroughMultiplier: 1.00,
  },

  hard: {
    gainMultiplier: 1.25,
    fatigueMultiplier: 1.45,
    energyMultiplier: 1.30,
    stressMultiplier: 1.30,
    injuryMultiplier: 1.50,
    breakthroughMultiplier: 1.20,
  },

  extreme: {
    gainMultiplier: 1.45,
    fatigueMultiplier: 2.00,
    energyMultiplier: 1.60,
    stressMultiplier: 1.80,
    injuryMultiplier: 2.75,
    breakthroughMultiplier: 1.40,
  },
};
```

Exact balance can be adjusted later.

Important:

```text
Extreme training must not always be optimal.
```

Fatigue, injury risk, stress, and diminishing returns must prevent players from simply selecting the highest intensity every time.

---

# 10. Replace Hard Fatigue Bands

Replace:

```ts
if fatigue >= 85 → 15%
if fatigue >= 60 → 40%
if fatigue >= 30 → 75%
else → 100%
```

with a smooth curve.

Recommended:

```ts
export function trainingEffectiveness(
  trainingFatigue: number
): number {
  const normalized =
    Math.min(100, Math.max(0, trainingFatigue)) / 100;

  return Math.max(
    0.2,
    1 - Math.pow(normalized, 1.6) * 0.8
  );
}
```

Approximate outcome:

```text
0 fatigue      100%
20 fatigue      94%
40 fatigue      82%
60 fatigue      65%
80 fatigue      44%
100 fatigue     20%
```

This curve should be exposed to the frontend.

The UI should explicitly show:

```text
Training efficiency: 82%
```

before the player starts training.

---

# 11. Training Fatigue

Training fatigue represents accumulated physical training load.

Keep range:

```ts
0–100
```

Training fatigue affects:

```text
training effectiveness
training injury chance
breakthrough quality
readiness
possibly temporary combat condition
```

It should not directly equal combat fatigue.

Training fatigue persists between sessions.

Rest reduces it.

Different programs generate different amounts.

Example targets:

```text
Light drill        +6 to +9
Normal drill       +10 to +15
Heavy conditioning +15 to +22
Hard sparring      +20 to +30
```

---

# 12. Training Points / Effort

Keep training points only if they serve a unique role.

Recommended meaning:

```text
Training Points = productive neurological/developmental capacity for the current training cycle.
```

They are different from energy.

Energy:

```text
Can this rooster physically perform the session?
```

Training Points:

```text
Can this rooster still gain meaningful development from structured training today?
```

Training fatigue:

```text
How overloaded is this rooster?
```

Recommended:

```ts
TRAINING_POINTS_MAX = 100;
```

Different programs should consume different amounts.

Do not hard-code every training session to 10.

Example:

```text
light drill        6
normal drill       10
focused drill      12
controlled spar    15
hard sparring      20
```

This creates meaningful program cost differences.

---

# 13. Energy

Energy remains short-term physical availability.

Training startup should still check:

```ts
if (chicken.energy < energyCost) {
  throw new FacilityError("INSUFFICIENT_ENERGY");
}
```

However, energy and training points should not always recover together.

Otherwise they become redundant.

---

# 14. Stress

If stress already exists in the richer system, integrate it.

Stress should represent mental load.

Sources:

```text
extreme training
hard sparring
injury
losses
overtraining
repeated training without rest
certain personality mismatches
```

Effects:

```text
reduced obedience
reduced confidence
worse adaptation
reduced training quality
possible negative traits
```

Recovery:

```text
rest
medical care
successful fights
light training
certain facilities
```

Do not make stress another copy of fatigue.

---

# 15. Condition / Readiness

Condition should represent how prepared the rooster currently is to perform.

Suggested range:

```ts
0–100
```

Training can temporarily lower condition.

Rest restores condition.

Condition can affect:

```text
combat stamina
effective physical output
injury resistance
recovery
```

This creates an important decision:

```text
Do I keep training because I want more development?

OR

Do I stop now so the rooster enters the next fight fresh?
```

That decision makes training strategically interesting.

---

# 16. Remove Most Permanent Negative EV Tradeoffs

Current system:

```ts
next[tradeoff] -= gain * 0.2;
```

Change this.

Permanent EV should rarely decrease through ordinary training.

Preferred model:

```text
Training specialization creates temporary readiness penalties
rather than deleting already-earned EV.
```

Example:

```text
Strength training

+3 power EV
+muscular fatigue
-temporary stamina readiness
```

If permanent specialization tradeoffs are desired, reduce them drastically:

```ts
PERMANENT_TRADEOFF_RATE = 0.03;
```

or maximum:

```ts
0.05;
```

Never use 20% by default.

Alternatively remove permanent tradeoffs completely.

---

# 17. Specialization Pressure

Instead of subtracting EV, specialization can emerge from opportunity cost.

Example:

```text
Rooster has 100 training points.

Counter fighter path:

Counter Drills     25
Footwork           20
Discipline         15
Defensive Drills   20
Controlled Spar    20
```

Those points cannot also be spent on maxing:

```text
Strength
Pressure
Endurance
```

The limited training resource naturally creates specialization.

This is much cleaner than deleting stats.

---

# 18. Hidden Potential

Integrate the richer hidden-potential mechanic.

Potential should determine how efficiently or how far certain fighters can develop.

Possible model:

```ts
interface TrainingPotential {
  power: number;
  speed: number;
  agility: number;
  defense: number;
  stamina: number;
  accuracy: number;
}
```

Potential does not have to be fully visible initially.

Example:

```text
Power Potential: 84
Speed Potential: ???
Counter Aptitude: High
```

Repeated training can reveal it.

Potential could affect:

```text
EV gain
breakthrough probability
training ceiling
trait acquisition
learning rate
```

Example:

```ts
potentialMultiplier =
  0.85 + hiddenPotential[key] * 0.003;
```

This is just illustrative.

Do not allow hidden potential to completely override IVs.

---

# 19. Potential Discovery

Training should gradually reveal hidden potential.

Example events:

```text
"Shows exceptional counter-fighting instincts."

"Struggles with explosive-speed development."

"Responds extremely well to endurance work."

"Exceptional learning rate detected."
```

The player should learn more about the rooster through use rather than receiving every hidden value immediately.

This creates discovery gameplay.

---

# 20. Breakthrough System

Training should occasionally produce major moments.

A breakthrough should be uncommon and memorable.

Possible triggers:

```text
repeated focused training
high hidden potential
high training quality
controlled sparring
reaching an experience threshold
high coach/facility quality
performing near specialization conditions
```

Breakthrough example:

```text
BREAKTHROUGH

Your rooster is beginning to read attacks before they fully develop.

Counter XP +15

Accuracy EV +1.2 bonus

Counter Preference +0.015

Counter Specialist trait progress +20%
```

Breakthroughs should not simply be giant random stat drops.

They should reinforce the direction in which the rooster is already developing.

---

# 21. Breakthrough Probability

Recommended structure:

```ts
function breakthroughChance(ctx: TrainingContext): number {
  let chance = ctx.program.baseBreakthroughChance;

  chance *= ctx.intensity.breakthroughMultiplier;
  chance *= ctx.potentialMultiplier;
  chance *= ctx.facility.breakthroughMultiplier;
  chance *= ctx.trainingEffectiveness;

  chance += ctx.specializationProgressBonus;

  return clamp(chance, 0, MAX_BREAKTHROUGH_CHANCE);
}
```

Typical normal session probabilities could be around:

```text
1–5%
```

Higher for:

```text
controlled sparring
specialization milestones
elite facilities
exceptional potential
```

Do not make breakthroughs common enough that they stop feeling important.

---

# 22. Combat XP From Training

Training should provide combat-development XP.

However:

```text
Training < Sparring < Real Combat
```

Recommended approximate source weighting:

```text
Basic drill:
1–4 XP

Focused advanced drill:
3–6 XP

Controlled sparring:
5–10 XP

Hard sparring:
8–14 XP

Real competitive fight:
substantially higher and context-sensitive
```

Real fights should also provide battle-hardening progression that normal training cannot fully replicate.

---

# 23. Combat Experience Must Affect Decisions

Do not implement experience purely as:

```ts
damage *= 1.10;
```

Experience should primarily alter decision quality.

Example counter XP effects:

```text
Low counter XP:
frequently misses counter opportunities
counters too early
uses poor counter moves

Medium counter XP:
recognizes obvious openings
chooses reasonable counters

High counter XP:
reads commitment better
waits for stronger openings
selects safer counters
adapts to repeated attacks
```

This aligns with the continuous combat-state-machine design.

---

# 24. Behavioral Training Must Remain Soft

A program should never guarantee behavior.

Example:

```text
Counter Drills
```

does not mean:

```text
rooster always counters
```

It means:

```text
counterPreference gradually increases
patience gradually increases
counter XP increases
accuracy/agility improve
```

Genetics and natural temperament remain relevant.

This preserves the existing idea that players can coach fighters but cannot completely control them.

---

# 25. Training and Command Compliance

If the game contains coaching commands such as:

```text
PRESS
WAIT
RECOVER
COUNTER
GUARD
```

then discipline-related training should affect compliance.

Recommended separate derived value:

```ts
commandCompliance
```

based on:

```text
discipline development
experience
confidence
stress
fatigue
personality
relationship/trainer systems if added later
```

Example:

```ts
commandCompliance =
  baseTemperamentCompliance
  + disciplineBonus
  + experienceBonus
  + confidenceBonus
  - stressPenalty
  - fatiguePenalty;
```

Clamp to a sensible range.

Never allow 100% obedience by default.

---

# 26. Training Trait Progress

Add internal progress toward relevant traits.

Example:

```ts
interface TraitProgress {
  traitId: string;
  progress: number;
}
```

Range:

```text
0–100
```

Programs provide progress only toward relevant traits.

Example:

```text
Counter Drills

Counter Specialist +3
Patient Reader +2
Sharp Eyes +1
```

When reaching threshold:

```text
either trait unlocks
```

or preferably:

```text
trait becomes eligible for breakthrough
```

---

# 27. Avoid Trait Spam

A fighter should not accumulate 30 minor traits.

Use:

```text
limited active trait slots
```

or:

```text
major/minor trait categories
```

Example:

```text
2 major fighting traits
3 minor development traits
1 battle-hardening trait
```

Alternatively allow many hidden progression tags but only promote major ones to visible traits.

---

# 28. Recommended Training Gain Scale

Do not make sessions enormous.

Suggested fresh, normal-intensity EV baselines:

```text
Basic program      2.8–3.2
Focused program    3.5–4.0
Advanced program   4.2–4.7
Elite program      4.8–5.4
```

Given 40% EV weighting:

```text
3 EV ≈ +1.2 effective stat
4 EV ≈ +1.6 effective stat
5 EV ≈ +2 effective stat
```

This is visible enough without making training overpower genetics.

---

# 29. Multi-Stat Programs

Programs may distribute one total base gain.

Example:

```ts
baseEvGain: 4
```

Counter Drill:

```ts
primaryStats: {
  accuracy: 0.75,
  agility: 0.25,
}
```

Result:

```text
accuracy +3.0
agility +1.0
```

before modifiers.

Weights should sum to:

```text
1.0
```

unless intentionally designed otherwise.

---

# 30. Stat Gain Formula

Recommended:

```ts
effectiveGain =
  baseEvGain
  * programStatWeight
  * facilityEfficiency
  * trainingEffectiveness
  * intensityGainMultiplier
  * lifeStageMultiplier
  * potentialMultiplier
  * traitTrainingMultiplier;
```

Then:

```ts
nextEv =
  clamp(currentEv + effectiveGain, 0, MAX_EV);
```

Store exact decimal values.

Do not round EV during persistence.

---

# 31. EV Cap Behavior

Current:

```ts
MAX_EV = 100;
```

Keep this.

If a program targets a capped stat, redistribute only if explicitly supported by that program.

Do not silently waste large rewards without telling the player.

Example frontend warning:

```text
Accuracy is nearly fully developed.

Estimated 1.8 EV of this session may be wasted.
```

---

# 32. Life Stage

Continue using:

```ts
declineMultiplier(
  deriveLifeStage(chicken)
)
```

Young and prime roosters should train best.

Declining fighters should learn more slowly physically.

However, older fighters may still gain combat XP effectively.

Therefore split:

```ts
physicalDevelopmentMultiplier
```

and:

```ts
learningMultiplier
```

Example:

```text
Old fighter

Physical EV gain:
75%

Combat experience gain:
95%
```

This allows veteran fighters to keep learning tactically even as their bodies decline.

---

# 33. Facility Progression

Facility levels should provide qualitative progression.

Recommended structure:

## Level 1 — Backyard Gym

```text
Capacity: 2

Efficiency: 100%

Unlocked:
Strength
Sprint
Footwork
Endurance
Target Drills
```

---

## Level 2 — Training Shed

```text
Capacity: 3

Efficiency: 105%

Unlock:
Counter Drills
Defensive Drills
Pressure Drills
Discipline Training

Small fatigue reduction
```

---

## Level 3 — Fight Camp

```text
Capacity: 4

Efficiency: 110%

Combat XP multiplier: +10%

Unlock:
Controlled Sparring

Breakthrough chance bonus
Potential discovery bonus
```

---

## Level 4 — Professional Gym

```text
Capacity: 5

Efficiency: 115%

Fatigue generation: -10%

Training injury chance: -15%

Unlock:
Hard Sparring
Advanced specialization programs
```

---

## Level 5 — Elite Training Center

```text
Capacity: 6

Efficiency: 120%

Combat XP multiplier: +20%

Fatigue generation: -15%

Breakthrough multiplier: +20%

Potential discovery: improved

Unlock:
Elite programs
Advanced fighter-specific programs
```

The exact values can be balanced later.

The important requirement is that facility upgrades change gameplay, not merely numbers.

---

# 34. Facility Configuration

Recommended facility config:

```ts
interface TrainingGymLevelDefinition {
  level: number;
  capacity: number;

  efficiency: number;

  fatigueMultiplier: number;
  injuryMultiplier: number;

  experienceMultiplier: number;
  breakthroughMultiplier: number;
  potentialDiscoveryMultiplier: number;

  programs: ProgramId[];
}
```

---

# 35. Rest System

Rest should no longer automatically solve every resource identically.

Recommended rest effects:

```text
Energy:
large recovery

Training Points:
large/full recovery

Training Fatigue:
partial recovery

Stress:
partial recovery

Condition:
large recovery
```

Example:

```ts
function restTrainingState(state: TrainingState) {
  return {
    ...state,

    trainingPoints: Math.min(
      TRAINING_POINTS_MAX,
      state.trainingPoints + 60
    ),

    trainingFatigue: Math.max(
      0,
      state.trainingFatigue - 30
    ),

    stress: Math.max(
      0,
      state.stress - 20
    )
  };
}
```

If rest is time-based, use proper time progression rather than allowing infinite instant resets outside dev mode.

---

# 36. Overtraining

Overtraining should emerge gradually.

Recommended zones:

```text
0–40
Healthy training load

40–65
Moderate accumulated fatigue

65–85
Heavy fatigue

85–100
Overtraining
```

Unlike the old implementation, these should not correspond to giant effectiveness cliffs.

Instead they affect:

```text
continuous effectiveness curve
injury probability
stress gain
condition loss
behavior instability
```

---

# 37. Injury Probability

Current:

```ts
trainingFatigue < 85
  ? 0
  : (trainingFatigue - 85) / 100;
```

Improve this by incorporating:

```text
program
intensity
current injuries
age
condition
facility
physical profile
fatigue
```

Example concept:

```ts
baseRisk =
  program.baseInjuryRisk
  * intensity.injuryMultiplier;

fatigueRisk =
  Math.pow(trainingFatigue / 100, 3);

conditionRisk =
  1 + (100 - condition) / 100;

finalRisk =
  baseRisk
  * fatigueRisk
  * conditionRisk
  * facility.injuryMultiplier;
```

Hard sparring should carry substantially higher risk than technique drills.

---

# 38. Injury Severity

Training injuries should usually be:

```text
minor
```

Extreme intensity and hard sparring can produce:

```text
moderate
```

Severe injuries should be rare.

Training should not routinely kill fighters or create catastrophic injuries unless the wider game specifically supports extreme consequences.

---

# 39. Training History

Expand history beyond:

```ts
{
  category,
  programId,
  at
}
```

Recommended:

```ts
interface TrainingHistoryEntry {
  sessionId: string;

  programId: ProgramId;
  category: TrainingCategory;
  intensity: TrainingIntensity;

  startedAt: number;
  completedAt: number;

  evChanges: Partial<Record<GeneticStatKey, number>>;

  experienceChanges:
    Partial<Record<CombatExperienceCategory, number>>;

  behaviorChanges:
    Partial<Record<BehaviorKey, number>>;

  fatigueChange: number;
  energyChange: number;
  stressChange: number;

  breakthroughId?: string;
  traitProgress?: Record<string, number>;

  injuryId?: string;
}
```

Keep a reasonable history length.

Potentially:

```text
100 entries
```

instead of 50.

---

# 40. Training State

Recommended revised type:

```ts
interface TrainingState {
  trainingPoints: number;
  trainingFatigue: number;

  stress: number;

  experience: Record<CombatExperienceCategory, number>;

  behaviorDevelopment:
    Partial<Record<BehaviorKey, number>>;

  traitProgress: Record<string, number>;

  specializationProgress: Record<string, number>;

  potentialKnowledge:
    Partial<Record<GeneticStatKey, PotentialKnowledge>>;

  history: TrainingHistoryEntry[];
}
```

Do not duplicate fields that already exist authoritatively somewhere else.

If combat experience or behavior already lives directly on `Chicken`, reuse that location instead.

---

# 41. Training Session Persistence

Update the session model to store intent.

Conceptually:

```ts
TrainingSession {
  id

  playerId
  chickenId
  facilityId

  programId
  category

  intensity

  status

  durationMinutes

  energyCost
  trainingPointCost
  fatigueCost
  stressCost

  workload

  startedAt
  completedAt

  adaptationResult Json?
}
```

`adaptationResult` should contain the completed result snapshot.

This allows the frontend to show training results without recalculating them.

---

# 42. Do Not Recalculate Completed Results

Once a training session completes:

```text
resolve result once
persist result
```

Do not recalculate the reward every time the page loads.

Otherwise random breakthroughs or injuries may change between requests.

Completion must be deterministic after persistence.

---

# 43. Transaction Safety

Continue using row locking.

Current pattern is good:

```sql
SELECT status
FROM "TrainingSession"
WHERE id = ?
FOR UPDATE
```

Completion must remain transaction-safe.

Exactly one request may claim a session.

Avoid duplicate reward application.

---

# 44. Start Training Flow

New flow:

```text
startTrainingSession()

1. Validate program
2. Claim expired sessions
3. Validate gym unlock
4. Resolve category
5. Resolve intensity
6. Lock facility
7. Load rooster
8. Validate ownership
9. Validate growth stage
10. Validate injury restrictions
11. Validate energy
12. Validate training points
13. Validate condition if needed
14. Validate facility capacity
15. Check already training
16. Snapshot relevant costs
17. Create TrainingSession
```

Do not determine random completion rewards at start.

---

# 45. Completion Flow

Replace the current simple completion block with:

```ts
const result = resolveTrainingSession({
  chicken,
  program,
  facility,
  session,
  currentTrainingState,
  lifeStage,
  random: Math.random,
});
```

Then update:

```text
EV
energy
training state
combat experience
behavior
traits
condition
injuries
session adaptationResult
```

in the same transaction.

---

# 46. Training Preview Resolver

Create a frontend-safe preview function.

Recommended:

```ts
previewTrainingSession(params)
```

It should return ranges instead of random exact outcomes.

Example:

```ts
{
  expectedEv: {
    accuracy: {
      min: 2.7,
      max: 3.1
    },

    agility: {
      min: 0.7,
      max: 0.9
    }
  },

  expectedExperience: {
    counter: {
      min: 5,
      max: 8
    }
  },

  fatigueGain: 12,
  energyCost: 18,

  trainingEfficiency: 0.93,

  estimatedBreakthroughChance: 0.035,

  injuryRisk: 0.004
}
```

The frontend should call this before session creation.

---

# 47. UI — Training Selection Screen

When selecting a program, show more than the program name.

Recommended display:

```text
COUNTER DRILLS

Develop timing, patience, reaction, and counterattack
decision-making.

PHYSICAL DEVELOPMENT

Accuracy
████████░░

Agility
███░░░░░░░

COMBAT DEVELOPMENT

Counter
██████████

Defense
████░░░░░░

Adaptation
███░░░░░░░

BEHAVIOR

↑ Counter tendency
↑ Patience
↑ Caution

COST

Energy       -18
Fatigue      +12
Training     -10
Time         1 min
```

Players should understand the identity of a program immediately.

---

# 48. UI — Expected Training Result

Before confirming:

```text
EXPECTED RESULT

Accuracy EV
57.4 → approximately 60.2

Agility EV
48.8 → approximately 49.6

Effective Accuracy
52.8 → approximately 53.9

Counter Experience
61 → approximately 67

Training Efficiency
93%

Breakthrough Chance
3.5%

Training Fatigue
18 → 30
```

This solves the existing problem where training rewards feel invisible.

---

# 49. UI — Decimal Display

Do not display only:

```text
55
```

for development screens.

Display:

```text
55.4
```

or:

```text
55.42
```

depending on visual space.

Main battle HUD can still use integers if desired.

Development screens should show decimals.

---

# 50. UI — Training Completion Report

After claiming completed training, show a dedicated result panel.

Example:

```text
TRAINING COMPLETE

Counter Drills

PHYSICAL DEVELOPMENT

Accuracy EV
57.4 → 60.3
+2.9

Agility EV
48.8 → 49.6
+0.8

Effective Accuracy
52.8 → 54.0
+1.2

COMBAT DEVELOPMENT

Counter
61 → 68
+7 XP

Defense
39 → 41
+2 XP

Adaptation
34 → 36
+2 XP

BEHAVIORAL ADAPTATION

Counter Preference
0.54 → 0.546

Patience
0.58 → 0.583

READINESS

Energy
71 → 53

Training Fatigue
18 → 30

Condition
93 → 89

No injury.

Counter Specialist
72% → 76%
```

---

# 51. UI — Breakthrough Presentation

When a breakthrough occurs, emphasize it separately.

Example:

```text
BREAKTHROUGH

PATIENT READER

Your rooster is beginning to delay reactions and wait for
higher-quality counter openings.

Counter XP +15

Adaptation XP +6

Counter Preference +0.012

Trait progress:
Counter Specialist +15%
```

This should feel significantly different from an ordinary session.

---

# 52. UI — Potential Discovery

Example:

```text
DEVELOPMENT INSIGHT

Exceptional Counter Aptitude

Repeated counter training suggests this rooster has unusually
high potential for timing and reactive fighting.
```

Potential discovery is informational and should create player attachment.

---

# 53. UI — Fatigue Warning

When fatigue is high:

```text
HEAVY TRAINING LOAD

Current fatigue: 76

Estimated training efficiency: 48%

Hard training now carries elevated injury risk.

Recommended:
Rest
Light Technique
Recovery Conditioning
```

Do not completely prevent training unless absolutely necessary.

Allow the player to make risky choices.

---

# 54. UI — Fighter Development Overview

The chicken profile should have a Development section containing:

```text
Genetics
Training
Combat Experience
Behavior
Traits
Condition
Career
```

For each combat stat show:

```text
POWER

Genetics contribution:
42.0

Training contribution:
24.8

Modifiers:
+2.1

Effective:
68.9
```

This helps players understand why a fighter performs the way it does.

---

# 55. Specialization System

Track inferred fighter specialization.

Possible styles:

```ts
type FighterSpecialization =
  | "aggressive"
  | "counter"
  | "endurance"
  | "defensive"
  | "pressure"
  | "adaptive"
  | "balanced";
```

Do not let the player simply click:

```text
Become Counter Fighter
```

Instead specialization should emerge from development.

Example counter score:

```ts
counterScore =
  counterXP * 0.30 +
  accuracyEV * 0.15 +
  agilityEV * 0.15 +
  patience * 20 +
  counterPreference * 20;
```

Exact math can be redesigned later.

---

# 56. Adaptive Counter Specialization

Because the combat system supports adaptation, this should be a legitimate development archetype.

Requirements may emphasize:

```text
Counter XP
Adaptation XP
Accuracy
Agility
Patience
Moderate defense
Counter preference
Combat experience
```

Suggested training path:

```text
Counter Drills
Footwork
Discipline
Controlled Sparring
Defensive Drills
Technique
```

Not:

```text
spam Accuracy forever
```

This is the desired player behavior.

---

# 57. Example Adaptive Counter Rooster Development

Starting fighter:

```text
Power     55
Speed     60
Agility   64
Defense   58
Stamina   57
Accuracy  62
```

Training plan:

```text
Counter Drills
→ accuracy
→ agility
→ counter XP
→ patience

Footwork
→ agility
→ speed
→ evasion XP

Controlled Sparring
→ counter XP
→ adaptation XP
→ behavior learning

Discipline
→ command compliance
→ patience
→ adaptation

Defense
→ survivability
→ defensive XP
```

The resulting fighter should become:

```text
less likely to blindly initiate
more likely to stalk/read
better at recognizing commitment
better at punishing mistakes
better at adapting after repeated exchanges
still capable of failing due to personality, fatigue, or pressure
```

---

# 58. Training Versus Real Combat

Keep a clear distinction.

## Gym Training

Best for:

```text
EV development
controlled specialization
safe behavior shaping
discipline
basic experience
```

## Sparring

Best for:

```text
combat XP
behavior development
trait development
adaptation
potential discovery
```

## Real Combat

Best for:

```text
battle hardening
true experience
confidence changes
rivalries
major adaptation
career traits
high-risk breakthroughs
```

Real fights should remain irreplaceable.

---

# 59. Battle Hardening

Do not grant full battle-hardening from normal drills.

Controlled sparring may grant:

```text
small battle-hardening progress
```

Hard sparring:

```text
moderate
```

Real fights:

```text
full
```

This preserves real combat stakes.

---

# 60. Training Duration

Current sessions lasting one minute are fine during development.

Eventually duration can depend on program.

Example:

```text
Technique Drill      1 min
Strength Session     2 min
Conditioning         3 min
Controlled Spar      5 min
Hard Spar            8 min
```

Do not make timers excessively long unless the economy is intentionally idle-oriented.

The strategic decision should matter more than waiting.

---

# 61. Offline Completion

Training sessions should resolve based on timestamps.

If the player closes the browser:

```text
training continues
```

On return:

```text
claimExpiredSessions()
```

completes them.

Do not require the browser tab to remain open.

---

# 62. Multiple Roosters

Facility capacity determines simultaneous training.

Example:

```text
Level 1 = 2
Level 2 = 3
Level 3 = 4
Level 4 = 5
Level 5 = 6
```

This keeps gym upgrades economically meaningful.

---

# 63. Avoid Performance Problems

Do not run a real-time server tick for training sessions.

Continue using timestamp-based completion.

Store:

```text
startedAt
durationMinutes
```

Determine expiration when relevant API routes are called.

This is sufficient.

---

# 64. Recommended File Architecture

Suggested structure:

```text
lib/
  training/
    limits.ts
    effectiveness.ts
    development.ts
    experience.ts
    behavior.ts
    potential.ts
    breakthroughs.ts
    traits.ts
    intensity.ts
    injuries.ts
    preview.ts
    resolver.ts
    types.ts

  facilities/
    config.ts
    service.ts
```

`facilities/service.ts` should orchestrate persistence.

It should not contain every piece of training math.

---

# 65. Resolver Responsibilities

`training/resolver.ts` should be pure wherever possible.

Example:

```ts
export function resolveTrainingSession(
  ctx: TrainingResolutionContext
): TrainingResult
```

Inputs:

```text
chicken snapshot
program
facility level
intensity
training state
life stage
random function
```

Outputs:

```text
result only
```

No Prisma access inside the resolver.

This makes it testable.

---

# 66. Preview Resolver

Use the same underlying formulas as completion.

Do not duplicate balancing logic.

Structure:

```text
shared calculation functions
        ↓
preview
        ↓
resolution
```

Preview uses ranges/probabilities.

Resolution uses actual RNG.

---

# 67. RNG Injection

Do not call:

```ts
Math.random()
```

deep inside every training function.

Inject RNG:

```ts
type RNG = () => number;
```

Example:

```ts
resolveBreakthrough(ctx, rng)
```

This allows deterministic tests.

---

# 68. Training Result Type

Suggested:

```ts
interface TrainingResult {
  version: 3;

  sessionId: string;

  programId: ProgramId;
  category: TrainingCategory;
  intensity: TrainingIntensity;

  statChanges:
    Partial<Record<GeneticStatKey, number>>;

  effectiveStatChanges:
    Partial<Record<GeneticStatKey, {
      before: number;
      after: number;
      delta: number;
    }>>;

  experienceChanges:
    Partial<Record<CombatExperienceCategory, number>>;

  behaviorChanges:
    Partial<Record<BehaviorKey, number>>;

  resourceChanges: {
    energy: number;
    trainingPoints: number;
    trainingFatigue: number;
    stress: number;
    condition: number;
  };

  traitProgressChanges?: Record<string, number>;

  breakthrough?: BreakthroughResult;

  potentialDiscovery?: PotentialDiscoveryResult;

  injury?: InjuryRecord;
}
```

Persist this in `adaptationResult`.

---

# 69. Version Training Results

Add:

```ts
version: 3
```

to result JSON.

This protects future migrations when the training result schema changes.

---

# 70. Balance Requirement

A normal player should feel noticeable development after:

```text
3–5 focused sessions
```

not necessarily after every single one.

One session should still visibly report progress.

A rooster should require meaningful planning to approach high EV values.

Training to 100 EV everywhere should not be trivial.

---

# 71. Anti-Grind Design

Do not prevent grinding only through hard arbitrary caps.

Use multiple interacting constraints:

```text
energy
training points
fatigue
condition
stress
injury risk
age
facility capacity
time
specialization opportunity cost
```

This is preferable to:

```text
"You may train exactly 10 times."
```

The player should understand why continued training becomes inefficient.

---

# 72. Casual Player Support

Add optional training recommendations.

Example:

```text
Recommended Development

This rooster naturally excels at:

Counter Fighting
Evasion
Adaptation

Suggested Program:
Counter Drills
```

Do not automatically force builds.

Advanced players can manually optimize.

---

# 73. Auto-Training / Training Plan

Potential later feature:

```text
Training Plan

Counter Fighter
Balanced
Pressure Fighter
Endurance
Custom
```

A plan queues recommended programs when slots become available.

This can become a quality-of-life feature later.

Do not make auto-training stronger than manual optimization.

---

# 74. Program Tags

Programs should expose metadata for AI recommendations.

Example:

```ts
tags: [
  "counter",
  "technical",
  "low-impact",
  "accuracy",
  "adaptation"
]
```

This makes recommendation systems easier.

---

# 75. Migration Strategy

Do not rebuild everything at once.

Implement in phases.

## Phase 1 — Core Fix

Implement:

```text
smooth fatigue curve
larger EV feedback
decimal UI
training preview
completion report
remove/reduce permanent tradeoffs
```

Keep current backend mostly intact.

---

## Phase 2 — Unified Resolver

Create:

```text
TrainingResult
TrainingResolutionContext
resolveTrainingSession()
```

Move EV resolution into it.

Make facility service call the resolver.

---

## Phase 3 — Combat Experience

Integrate:

```text
offensive
defensive
evasion
counter
pressure
recovery
adaptation
```

Training sessions start granting experience.

---

## Phase 4 — Behavior

Integrate:

```text
behavior shifts
discipline
command compliance
specialization
```

---

## Phase 5 — Intensity / Condition / Stress

Add:

```text
light
normal
hard
extreme

condition
stress
expanded fatigue risk
```

---

## Phase 6 — Potential / Breakthroughs / Traits

Connect the richer existing system:

```text
hidden potential
potential discovery
breakthroughs
training traits
trait progress
```

---

## Phase 7 — Sparring

Add:

```text
controlled sparring
hard sparring
```

Reuse actual combat simulation where practical.

---

# 76. Existing Code Changes

Current:

```ts
const ev = applyDevelopment({
  ev: chicken.ev as StatBlock,
  category: candidate.category as TrainingCategory,
  baseGain: program.baseGain * efficiency,
  trainingFatigue: trainingState.trainingFatigue,
  lifeStageMultiplier,
});
```

Eventually replace with:

```ts
const result = resolveTrainingSession({
  chicken: chicken as unknown as Chicken,
  session: candidate,
  program,
  facility: trainingFacilityContext,
  trainingState,
  lifeStage: deriveLifeStage(
    chicken as unknown as Chicken
  ),
  rng: Math.random,
});
```

Then:

```ts
await tx.chicken.update({
  where: {
    id: candidate.chickenId,
  },

  data: {
    ev: result.nextEv,

    energy: result.nextEnergy,

    trainingState:
      result.nextTrainingState,

    injuries: result.nextInjuries,

    injured:
      result.nextInjuries.some(
        injury =>
          !injury.permanent &&
          injury.recoveryRemaining > 0
      ),

    // update experience / behavior /
    // traits depending on authoritative schema
  },
});
```

And:

```ts
await tx.trainingSession.update({
  where: {
    id: candidate.id,
  },

  data: {
    status: "COMPLETED",
    completedAt: new Date(),

    adaptationResult:
      result.persistedResult,
  },
});
```

---

# 77. Refactor `applyDevelopment`

Do not necessarily delete it.

Change it into a lower-level pure helper.

Example:

```ts
applyStatDevelopment()
```

It should only resolve EV changes.

Do not let it own:

```text
fatigue
traits
experience
behavior
injuries
```

Those belong in the higher-level training resolver.

---

# 78. New Training Effectiveness Function

Replace hard bands.

Recommended implementation:

```ts
export function trainingEffectiveness(
  trainingFatigue: number
): number {
  const normalized =
    Math.min(
      100,
      Math.max(0, trainingFatigue)
    ) / 100;

  return Math.max(
    0.2,
    1 -
      Math.pow(normalized, 1.6) * 0.8
  );
}
```

Tests must verify monotonic decline.

---

# 79. Testing Requirements

Add unit tests for:

```text
fresh training gives expected full reward

higher fatigue produces lower reward

effectiveness curve has no discontinuities

EV never exceeds 100

EV never goes below 0

behavior values remain 0–1

training result is deterministic with seeded RNG

capped stat handling works

facility efficiency affects EV

facility experience multiplier affects XP

life stage affects physical development

old fighters may still gain normal tactical XP

light intensity generates less gain and less fatigue

hard intensity generates more gain and more fatigue

extreme training increases injury risk

overtraining increases injury risk

completed session cannot be claimed twice

cancelled session cannot resolve

locked injured rooster cannot train restricted category

facility capacity remains enforced

potential discovery only occurs when eligible

trait progress only increases for matching tags

breakthrough cannot exceed configured max chance
```

---

# 80. Integration Tests

Create integration coverage for:

```text
start session
advance time
claim
verify EV changed
verify XP changed
verify resources changed
verify result persisted
verify session completed

claim same session again
verify no duplicate reward

start training with insufficient energy
verify rejection

start training without training points
verify rejection

start locked program
verify rejection

fill facility capacity
verify next request rejected
```

---

# 81. UI Acceptance Criteria

The training UI is not complete unless the player can clearly answer:

```text
What will this program improve?

How much will it probably improve?

Why is my current gain reduced?

What will it cost?

How tired will my rooster become?

What changed when the session completed?

How did the change affect actual combat stats?

What fighting style is this training pushing toward?
```

If the interface cannot answer these questions, the feature will continue to feel opaque.

---

# 82. Backend Acceptance Criteria

The backend redesign is complete when:

```text
There is one authoritative training resolver.

The current Training Gym uses the richer progression systems.

Training modifies more than EV.

Training results are persisted exactly once.

Training remains timestamp-based.

Training is transaction-safe.

Preview and resolution share calculation logic.

Fatigue uses a smooth curve.

Ordinary training no longer destroys large amounts of permanent EV.

Facility levels create meaningful progression.

Combat experience and training identity connect to actual combat behavior.
```

---

# 83. Gameplay Acceptance Criteria

The gameplay redesign is successful when:

```text
A player can intentionally build a counter fighter.

A player can intentionally build a pressure fighter.

Two roosters with similar IVs can become meaningfully different through training.

Two roosters with similar EVs can behave differently because of experience and behavior.

Real combat remains important.

Genetics remains important.

One session visibly produces progress.

Repeated training creates recognizable specialization.

Excessive training creates meaningful risks.

Rest becomes a strategic decision.

Gym upgrades feel exciting.

Training reports give satisfying feedback.
```

---

# 84. Example Complete Counter Training Result

Input:

```text
Program:
Counter Drills

Intensity:
Normal

Current:
Accuracy EV 58.0
Agility EV 55.0

Counter XP 42
Defense XP 30
Adaptation XP 27

Counter Preference 0.49
Patience 0.56

Training Fatigue 22
Energy 80

Gym Level 3
```

Possible result:

```text
TRAINING COMPLETE

Accuracy EV
58.0 → 60.7
+2.7

Agility EV
55.0 → 55.9
+0.9

Effective Accuracy
55.2 → 56.3
+1.1

Counter XP
42 → 49
+7

Defense XP
30 → 32
+2

Adaptation XP
27 → 30
+3

Counter Preference
0.490 → 0.495

Patience
0.560 → 0.563

Energy
80 → 62

Training Fatigue
22 → 34

Condition
96 → 92

Counter Specialist
39% → 43%

No breakthrough.
No injury.
```

The important difference is that the player can immediately understand what changed.

---

# 85. Example Breakthrough Result

```text
TRAINING COMPLETE

Counter Drills

Accuracy EV
60.7 → 63.5

Agility EV
55.9 → 56.7

Counter XP
49 → 56

Adaptation XP
30 → 33


BREAKTHROUGH

PATIENT READER

During repeated counter drills, the rooster has begun waiting
for stronger commitment before reacting.

Counter XP
+12 bonus

Adaptation XP
+5 bonus

Counter Preference
+0.010

Patience
+0.008

Counter Specialist
43% → 58%
```

This creates memorable progression without handing out giant arbitrary stat increases.

---

# 86. Important Non-Goals

Do not turn training into:

```text
a clicker game
an idle-number generator
an unlimited stat grind
a replacement for breeding
a replacement for combat
a deterministic class-selection screen
```

Do not make:

```text
Counter Training
```

guarantee counter behavior.

Do not allow:

```text
Extreme Training
```

to become mathematically optimal at all times.

Do not hide training rewards behind rounded headline stats.

Do not maintain separate legacy and Gym progression formulas.

---

# 87. Final Target Loop

The desired player loop should become:

```text
SELECT ROOSTER
        ↓
Inspect:
genetics
development
condition
experience
potential clues
        ↓
CHOOSE DEVELOPMENT GOAL
        ↓
counter
pressure
endurance
defense
speed
balanced
custom
        ↓
CHOOSE PROGRAM
        ↓
Counter Drills
Footwork
Strength
Sparring
etc.
        ↓
CHOOSE INTENSITY
        ↓
Light / Normal / Hard / Extreme
        ↓
PREVIEW OUTCOME
        ↓
EV
combat XP
behavior
fatigue
energy
condition
risk
        ↓
START TRAINING
        ↓
TIMER
        ↓
TRAINING COMPLETES
        ↓
DEVELOPMENT REPORT
        ↓
EV progression
experience progression
behavior adaptation
potential discovery
trait progress
breakthrough chance
fatigue / stress
possible injury
        ↓
PLAYER DECISION
        ↓
Train again
Rest
Spar
Fight
Switch specialization
Prepare for tournament
```

---

# 88. Final Design Rule

The complete system should follow this rule:

```text
GENETICS defines the fighter's natural foundation.

TRAINING shapes the fighter's developed style.

SPARRING teaches controlled combat experience.

REAL FIGHTS create battle-tested adaptation.

CAREER progression determines what the fighter ultimately becomes.
```

Training should therefore feel like the player is coaching and developing an individual fighter rather than feeding points into a stat screen.

That is the core objective of Training System V3.
