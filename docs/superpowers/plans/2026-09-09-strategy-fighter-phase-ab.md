# Strategy Fighter Phase A/B Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `FightingStyle` into an actual action-weighting policy (Phase A), wire momentum/mental-state/inactivity into decision-making instead of raw stat buffs (Phase B), and build the minimal, scripted validation-gate harness the spec requires before any further phase is greenlit.

**Architecture:** Every change is additive/extending inside the existing `lib/combat/*` decision pipeline (`behavior.ts` → `simulator.ts`) and `lib/animation/*` procedural-animation registry — no new subsystem shape, per the spec's "30-40% already built" framing. A new pure-function layer (`identity.ts`, `stylePolicy.ts`, `mentalState.ts`, `command.ts`, `inactivity.ts`, `autoCoach.ts`) feeds an "effective behavior profile" computed once per turn in `simulator.ts`, which is what actually gets scored — `behavior.ts`'s `scoreAction` keeps its existing shape, gaining only a `styleWeight` multiplier on the base per-action term and a physical cost term.

**Tech Stack:** TypeScript, `node:test` (`yarn test` runs `lib/__tests__/*.test.ts` via `scripts/test-ts-loader.mjs`), no new dependencies.

**Spec:** `docs/superpowers/specs/2026-09-09-strategy-fighter-design.md` (Phase A, Phase B, and the Phase A/B validation gate sections). This plan implements those sections; Phases C+ stay deferred exactly as written there.

## Global Constraints

- Every new/changed test file lives flat in `lib/__tests__/` (no subdirectories) — matches every existing test in the repo (`combat.test.ts`, `battleTraits.test.ts`, etc.), run via `node --import ./scripts/test-ts-loader.mjs --test lib/__tests__/*.test.ts`.
- No new external dependencies.
- `CombatIdentity`'s 3 axes only (`aggression`, `patience`, `riskTolerance`) — do not add more identity axes.
- Momentum's mechanical effect is capped and never a damage/accuracy/hit-stop-magnitude multiplier (spec Phase B) — it only nudges `riskTolerance`.
- The MVP command set is exactly `PRESS` / `WAIT` / `RECOVER` (+ the system-triggered `FORCE_ENGAGEMENT` override, which is never player-clickable in this plan's scope).
- **Scope decision (not in the original spec, made explicit here):** this plan builds the validation-gate harness as a scripted dev tool (`scripts/validation-gate-sim.ts`), in the same spirit as the existing `scripts/balance-sim.ts` ("throwaway tuning/verification harness — not wired into the app"), rather than shipping the CP-pips/countdown UI. Test A (reading) and the tell art pass are the only player-facing pieces built here; Tests B and D are measured by the script, not a live UI. Building the real UI is follow-up work once the harness proves the four tests pass — do not add it to this plan.

---

## Task 1: `CombatIdentity` — the reduced 3-axis identity

**Files:**
- Create: `lib/combat/identity.ts`
- Test: `lib/__tests__/identity.test.ts`

**Interfaces:**
- Produces: `CombatIdentity` type (`{ aggression: number; patience: number; riskTolerance: number }`), `deriveCombatIdentity(profile: BehavioralProfile): CombatIdentity`, `withIdentity(profile: BehavioralProfile, identity: CombatIdentity): BehavioralProfile` — used by Task 3, 7, 9, 12.

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { deriveCombatIdentity, withIdentity } from "../combat/identity";
import type { BehavioralProfile } from "../types";

const profile: BehavioralProfile = {
  aggression: 0.85,
  caution: 0.15,
  patience: 0.2,
  riskTolerance: 0.8,
  pressurePreference: 0.5,
  counterPreference: 0.1,
  recoveryPreference: 0.15,
  persistence: 0.3,
};

test("deriveCombatIdentity pulls only the 3 MVP axes off BehavioralProfile", () => {
  assert.deepEqual(deriveCombatIdentity(profile), {
    aggression: 0.85,
    patience: 0.2,
    riskTolerance: 0.8,
  });
});

test("withIdentity overwrites only the 3 identity fields, leaving the other 5 untouched", () => {
  const adjusted = withIdentity(profile, { aggression: 0.5, patience: 0.5, riskTolerance: 0.5 });
  assert.equal(adjusted.aggression, 0.5);
  assert.equal(adjusted.patience, 0.5);
  assert.equal(adjusted.riskTolerance, 0.5);
  assert.equal(adjusted.caution, profile.caution);
  assert.equal(adjusted.pressurePreference, profile.pressurePreference);
  assert.equal(adjusted.counterPreference, profile.counterPreference);
  assert.equal(adjusted.recoveryPreference, profile.recoveryPreference);
  assert.equal(adjusted.persistence, profile.persistence);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 identity`
Expected: FAIL with "Cannot find module '../combat/identity'"

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { BehavioralProfile } from "../types";

/**
 * Reduced 3-axis identity (spec cut #2): aggression, patience, riskTolerance
 * only, for the Phase A prototype. Not a player-set input — always derived
 * from the existing BehavioralProfile, which already carries these 3 fields
 * among its 8.
 */
export type CombatIdentity = {
  aggression: number;
  patience: number;
  riskTolerance: number;
};

export function deriveCombatIdentity(profile: BehavioralProfile): CombatIdentity {
  return {
    aggression: profile.aggression,
    patience: profile.patience,
    riskTolerance: profile.riskTolerance,
  };
}

/** Writes an adjusted identity back into a full BehavioralProfile for scoreAction, leaving the other 5 fields untouched. */
export function withIdentity(profile: BehavioralProfile, identity: CombatIdentity): BehavioralProfile {
  return { ...profile, ...identity };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 identity`
Expected: PASS (both tests)

- [ ] **Step 5: Commit**

```bash
git add lib/combat/identity.ts lib/__tests__/identity.test.ts
git commit -m "feat(combat): add reduced 3-axis CombatIdentity layer"
```

---

## Task 2: `StylePolicy` — per-style base action-weight table

**Files:**
- Create: `lib/combat/stylePolicy.ts`
- Test: `lib/__tests__/stylePolicy.test.ts`

**Interfaces:**
- Consumes: `FightingStyle`, `CombatAction`, `CombatContextState` (`lib/types.ts`)
- Produces: `StylePolicy` type, `STYLE_POLICIES: Record<FightingStyle, StylePolicy>`, `styleWeight(style: FightingStyle, action: CombatAction, opponentContextState: CombatContextState): number` — consumed by Task 3.

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { styleWeight, STYLE_POLICIES } from "../combat/stylePolicy";
import { COMBAT_ACTIONS } from "../types";

test("every FightingStyle defines a weight for every CombatAction", () => {
  for (const style of Object.keys(STYLE_POLICIES) as (keyof typeof STYLE_POLICIES)[]) {
    for (const action of COMBAT_ACTIONS) {
      assert.equal(typeof STYLE_POLICIES[style][action], "number");
    }
  }
});

test("aggressive weights HEAVY_ATTACK/PRESSURE above counter's", () => {
  assert.ok(styleWeight("aggressive", "HEAVY_ATTACK", "NEUTRAL") > styleWeight("counter", "HEAVY_ATTACK", "NEUTRAL"));
  assert.ok(styleWeight("aggressive", "PRESSURE", "NEUTRAL") > styleWeight("counter", "PRESSURE", "NEUTRAL"));
});

test("counter weights COUNTER above every other style's", () => {
  const others: (keyof typeof STYLE_POLICIES)[] = ["aggressive", "endurance", "balanced"];
  for (const style of others) {
    assert.ok(styleWeight("counter", "COUNTER", "NEUTRAL") > styleWeight(style, "COUNTER", "NEUTRAL"));
  }
});

test("opponent EXHAUSTED raises PRESSURE weight and lowers RECOVER weight vs NEUTRAL", () => {
  assert.ok(styleWeight("balanced", "PRESSURE", "EXHAUSTED") > styleWeight("balanced", "PRESSURE", "NEUTRAL"));
  assert.ok(styleWeight("balanced", "RECOVER", "EXHAUSTED") < styleWeight("balanced", "RECOVER", "NEUTRAL"));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 stylePolicy`
Expected: FAIL with "Cannot find module '../combat/stylePolicy'"

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { CombatAction, CombatContextState, FightingStyle } from "../types";

/** Base per-action weight multiplier for one fighting style; 1.0 is neutral. Applied to the base per-action term in behavior.ts's scoreAction, not the whole score. */
export type StylePolicy = Record<CombatAction, number>;

/**
 * Base action-weight table per style (spec Phase A, concept §5's shape).
 * These are starting multipliers only — deriveBehaviorProfile()'s existing
 * ARCHETYPE_PROFILES already differentiate the underlying BehavioralProfile;
 * this table adds a second, independent style-flavor pass on top of it so
 * "what's my overall philosophy" stays a distinct layer from "what do I tend
 * to want" per the spec's layering diagram.
 */
export const STYLE_POLICIES: Record<FightingStyle, StylePolicy> = {
  aggressive: {
    LIGHT_ATTACK: 1.1,
    HEAVY_ATTACK: 1.3,
    PRESSURE: 1.2,
    EVADE: 0.7,
    COUNTER: 0.8,
    GUARD: 0.7,
    RECOVER: 0.7,
    REPOSITION: 0.8,
  },
  counter: {
    LIGHT_ATTACK: 0.9,
    HEAVY_ATTACK: 0.8,
    PRESSURE: 0.9,
    EVADE: 1.1,
    COUNTER: 1.4,
    GUARD: 1.1,
    RECOVER: 1.0,
    REPOSITION: 1.0,
  },
  endurance: {
    LIGHT_ATTACK: 0.95,
    HEAVY_ATTACK: 0.8,
    PRESSURE: 0.9,
    EVADE: 1.05,
    COUNTER: 1.0,
    GUARD: 1.15,
    RECOVER: 1.3,
    REPOSITION: 1.05,
  },
  balanced: {
    LIGHT_ATTACK: 1.0,
    HEAVY_ATTACK: 1.0,
    PRESSURE: 1.0,
    EVADE: 1.0,
    COUNTER: 1.0,
    GUARD: 1.0,
    RECOVER: 1.0,
    REPOSITION: 1.0,
  },
};

/**
 * Weights shift as fight state changes (spec Phase A) — an exhausted
 * opponent should draw more PRESSURE/HEAVY_ATTACK and less RECOVER from
 * *this* fighter, regardless of style, layered on top of the base table.
 */
export function styleWeight(style: FightingStyle, action: CombatAction, opponentContextState: CombatContextState): number {
  let w = STYLE_POLICIES[style][action];
  if (opponentContextState === "EXHAUSTED" || opponentContextState === "VULNERABLE") {
    if (action === "PRESSURE" || action === "HEAVY_ATTACK") w *= 1.25;
    if (action === "RECOVER") w *= 0.7;
  }
  return w;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 stylePolicy`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/combat/stylePolicy.ts lib/__tests__/stylePolicy.test.ts
git commit -m "feat(combat): add per-style action-weight policy table"
```

---

## Task 3: Wire `styleWeight` + `PhysicalProfile` cost term into `scoreAction`

**Files:**
- Modify: `lib/combat/behavior.ts:124-211` (`DecisionContext` type, `scoreAction`)
- Modify: `lib/combat/simulator.ts:116-142` (build the two new `DecisionContext` fields)
- Test: `lib/__tests__/behaviorScoring.test.ts`

**Interfaces:**
- Consumes: `styleWeight` (Task 2), `PhysicalProfile` (`lib/physicalProfile.ts`), `resolvePhysicalProfile` (already imported in `simulator.ts:12`)
- Produces: `DecisionContext.style: FightingStyle`, `DecisionContext.physical: PhysicalProfile`, `DecisionContext.opponentContextState: CombatContextState` — consumed by Task 10 (inactivity) and Task 12 (command).

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { scoreAction, ARCHETYPE_PROFILES, type DecisionContext } from "../combat/behavior";
import { emptyExperience, emptyOpponentModel } from "../combat/experience";

function baseCtx(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    stamina: 100,
    maxStamina: 100,
    fatigue: 0,
    momentum: 0,
    position: 0,
    distance: "MID",
    contextState: "NEUTRAL",
    opponentContextState: "NEUTRAL",
    experience: emptyExperience(),
    opponentModel: emptyOpponentModel(),
    style: "balanced",
    physical: { mass: 1, reach: 1, mobility: 1, stability: 1, wingControl: 1, kickPower: 1 },
    rng: () => 0.5,
    ...overrides,
  };
}

test("styleWeight shifts HEAVY_ATTACK score: aggressive scores it higher than counter, same profile otherwise", () => {
  const profile = ARCHETYPE_PROFILES.balanced;
  const aggressiveScore = scoreAction(profile, "HEAVY_ATTACK", baseCtx({ style: "aggressive" }));
  const counterScore = scoreAction(profile, "HEAVY_ATTACK", baseCtx({ style: "counter" }));
  assert.ok(aggressiveScore > counterScore);
});

test("low mobility makes REPOSITION/EVADE score lower than baseline mobility", () => {
  const profile = ARCHETYPE_PROFILES.balanced;
  const lowMobility = baseCtx({ physical: { mass: 1, reach: 1, mobility: 0.85, stability: 1, wingControl: 1, kickPower: 1 } });
  const baseline = baseCtx();
  assert.ok(scoreAction(profile, "REPOSITION", lowMobility) < scoreAction(profile, "REPOSITION", baseline));
  assert.ok(scoreAction(profile, "EVADE", lowMobility) < scoreAction(profile, "EVADE", baseline));
});

test("high mass does not directly boost PRESSURE/HEAVY_ATTACK score (mass is not a hidden fighting style)", () => {
  const profile = ARCHETYPE_PROFILES.balanced;
  const highMass = baseCtx({ physical: { mass: 1.15, reach: 1, mobility: 1, stability: 1, wingControl: 1, kickPower: 1 } });
  const baseline = baseCtx();
  assert.equal(scoreAction(profile, "HEAVY_ATTACK", highMass), scoreAction(profile, "HEAVY_ATTACK", baseline));
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 behaviorScoring`
Expected: FAIL — `DecisionContext` is missing `style`/`physical`/`opponentContextState`, TS error under the test loader

- [ ] **Step 3: Write minimal implementation**

In `lib/combat/behavior.ts`, add the import and extend `DecisionContext`:

```typescript
import { styleWeight } from "./stylePolicy";
import type { PhysicalProfile } from "../physicalProfile";
import type {
  BehavioralProfile,
  CombatAction,
  CombatContextState,
  CombatDistance,
  CombatExperience,
  FightingStyle,
  OpponentModel,
  Trait,
} from "../types";
```

```typescript
export type DecisionContext = {
  stamina: number;
  maxStamina: number;
  fatigue: number;
  momentum: number;
  position: number;
  distance: CombatDistance;
  contextState: CombatContextState;
  /** The opponent's own derived context state this turn — drives styleWeight's fight-state shifts (e.g. press an EXHAUSTED opponent). */
  opponentContextState: CombatContextState;
  experience: CombatExperience;
  opponentModel: OpponentModel;
  /** This fighter's own fightingStyle — feeds styleWeight. */
  style: FightingStyle;
  /** This fighter's own PhysicalProfile — feeds the cost term below, never the "what do I want" term above. */
  physical: PhysicalProfile;
  rng: Rng;
};
```

Change the `switch (action) { ... }` block from `score += ...` to `base += ...`, and apply `styleWeight` once after it:

```typescript
export function scoreAction(profile: BehavioralProfile, action: CombatAction, ctx: DecisionContext): number {
  const def = ACTION_DEFINITIONS[action];
  let score = 0;
  let base = 0;

  switch (action) {
    case "LIGHT_ATTACK":
      base += 0.22 + profile.aggression * 0.6 + (1 - profile.caution) * 0.2;
      break;
    case "HEAVY_ATTACK":
      base += profile.aggression * profile.riskTolerance * 1.3;
      break;
    case "PRESSURE":
      base += profile.pressurePreference * 1.15 + profile.persistence * 0.1;
      break;
    case "EVADE":
      base += profile.caution * 0.15 + (1 - profile.riskTolerance) * 0.1;
      break;
    case "COUNTER":
      base += profile.counterPreference * 0.85 + Math.min(0.5, ctx.experience.counter / 400);
      break;
    case "GUARD":
      base += profile.caution * 0.15 + profile.persistence * 0.05;
      break;
    case "RECOVER":
      base += profile.recoveryPreference * 0.18 + profile.persistence * 0.05;
      break;
    case "REPOSITION":
      base += (profile.caution + profile.patience) * 0.15;
      break;
  }

  // StylePolicy is what decides intent (spec Phase A pipeline): scales only
  // the base per-action term above, not the contextual bonuses below.
  score += base * styleWeight(ctx.style, action, ctx.opponentContextState);
```

Keep everything from the existing `const fatigueRatio = ...` line through the existing `score += (ctx.rng() - 0.5) * 0.3;` line unchanged, then add the physical cost term right before the final `return score;`:

```typescript
  // PhysicalProfile changes what an action costs, not what the rooster wants
  // (spec Phase A): low mobility/high mass makes REPOSITION/EVADE less
  // attractive and more stamina-costly to attempt. Never applied to
  // PRESSURE/HEAVY_ATTACK — mass is not a hidden fighting style.
  if (action === "REPOSITION" || action === "EVADE") {
    score -= Math.max(0, 1 - ctx.physical.mobility) * 1.2;
    score -= Math.max(0, 1 - ctx.physical.mass ** -1) * 0.4;
  }

  return score;
}
```

In `lib/combat/simulator.ts`, add the two new fields to both `decisionCtxA`/`decisionCtxB` builders (after `opponentModel: stateA.opponentModel,` / `opponentModel: stateB.opponentModel,`):

```typescript
      opponentContextState: contextB,
      style: chickenA.fightingStyle,
      physical: physicalA,
```

(mirrored `contextA` / `chickenB.fightingStyle` / `physicalB` for `decisionCtxB`).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 behaviorScoring`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Run the full suite to confirm no regressions**

Run: `yarn test 2>&1 | tail -30`
Expected: same pass/fail count as before this task (this task only adds fields/terms; `simulator.ts`'s existing tests exercise the new code path automatically since `DecisionContext` is built there)

- [ ] **Step 6: Commit**

```bash
git add lib/combat/behavior.ts lib/combat/simulator.ts lib/__tests__/behaviorScoring.test.ts
git commit -m "feat(combat): wire StylePolicy and PhysicalProfile cost term into scoreAction"
```

---

## Task 4: Tell selection — pure intent-tier signal, not the exact action

**Files:**
- Create: `lib/combat/tells.ts`
- Test: `lib/__tests__/tells.test.ts`

**Interfaces:**
- Consumes: `DecisionContext`, `CombatAction`, `BehavioralProfile` (Task 3's extended `DecisionContext`)
- Produces: `TellKind = "aggression" | "patience" | "risk"`, `selectTell(profile: BehavioralProfile, chosenAction: CombatAction, ctx: DecisionContext): TellKind | null` — consumed by Task 5 (wiring into presentation) and the harness (Task 15, Test A).

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { selectTell } from "../combat/tells";
import { ARCHETYPE_PROFILES } from "../combat/behavior";
import { emptyExperience, emptyOpponentModel } from "../combat/experience";
import type { DecisionContext } from "../combat/behavior";

function baseCtx(overrides: Partial<DecisionContext> = {}): DecisionContext {
  return {
    stamina: 100,
    maxStamina: 100,
    fatigue: 0,
    momentum: 0,
    position: 0,
    distance: "MID",
    contextState: "NEUTRAL",
    opponentContextState: "NEUTRAL",
    experience: emptyExperience(),
    opponentModel: emptyOpponentModel(),
    style: "balanced",
    physical: { mass: 1, reach: 1, mobility: 1, stability: 1, wingControl: 1, kickPower: 1 },
    rng: () => 0.5,
    ...overrides,
  };
}

test("PRESSURE/HEAVY_ATTACK/LIGHT_ATTACK from a high-aggression profile reads as the aggression tell", () => {
  assert.equal(selectTell(ARCHETYPE_PROFILES.aggressive, "PRESSURE", baseCtx()), "aggression");
});

test("REPOSITION/GUARD/EVADE from a high-patience profile reads as the patience tell", () => {
  assert.equal(selectTell(ARCHETYPE_PROFILES.counter, "REPOSITION", baseCtx()), "patience");
});

test("HEAVY_ATTACK while stamina is low (a real overcommit) reads as the risk tell, overriding the aggression read", () => {
  const lowStamina = baseCtx({ stamina: 20, maxStamina: 100 });
  assert.equal(selectTell(ARCHETYPE_PROFILES.aggressive, "HEAVY_ATTACK", lowStamina), "risk");
});

test("a routine LIGHT_ATTACK from a balanced profile at full health/stamina has no tell", () => {
  assert.equal(selectTell(ARCHETYPE_PROFILES.balanced, "LIGHT_ATTACK", baseCtx()), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 "tells.test"`
Expected: FAIL with "Cannot find module '../combat/tells'"

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { BehavioralProfile, CombatAction } from "../types";
import type { DecisionContext } from "./behavior";

/**
 * The 3 coarse intent tiers a player can read off a fighter one beat before
 * it commits (spec Phase A.5) — never the exact CombatAction. "risk" is
 * triggered by the AI actually entering a high-risk decision state (low
 * stamina overcommit, or a bad-position swing), not by reading riskTolerance
 * as a personality-stat readout, so it takes priority when both conditions
 * are true this turn.
 */
export type TellKind = "aggression" | "patience" | "risk";

const AGGRESSION_ACTIONS: readonly CombatAction[] = ["LIGHT_ATTACK", "HEAVY_ATTACK", "PRESSURE"];
const PATIENCE_ACTIONS: readonly CombatAction[] = ["REPOSITION", "GUARD", "EVADE"];
const LOW_STAMINA_RATIO = 0.3;

function isRiskyCommit(action: CombatAction, ctx: DecisionContext): boolean {
  const staminaRatio = ctx.stamina / ctx.maxStamina;
  if (action === "HEAVY_ATTACK" && staminaRatio <= LOW_STAMINA_RATIO) return true;
  if (action === "PRESSURE" && ctx.position < 0) return true; // committing to press from a bad position
  return false;
}

/** No tell fires for a routine action a fighter takes constantly — only a genuine engage/wait/overcommit reads as a signal. */
export function selectTell(profile: BehavioralProfile, chosenAction: CombatAction, ctx: DecisionContext): TellKind | null {
  if (isRiskyCommit(chosenAction, ctx)) return "risk";
  if (AGGRESSION_ACTIONS.includes(chosenAction) && profile.aggression >= 0.6) return "aggression";
  if (PATIENCE_ACTIONS.includes(chosenAction) && profile.patience >= 0.6) return "patience";
  return null;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 "tells.test"`
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/combat/tells.ts lib/__tests__/tells.test.ts
git commit -m "feat(combat): add pure tell-selection layer (intent tier, not exact action)"
```

---

## Task 5: Register 3 tell `AnimState`s with hard priority

**Files:**
- Modify: `lib/animation/types.ts:127-158` (`AnimState` union)
- Modify: `lib/animation/stateMachine.ts:13-35` (`PRIORITY`)
- Create: `lib/animation/animations/tells.ts`
- Modify: `lib/animation/animations/index.ts` (register the 3 new `AnimationDef`s)
- Test: `lib/__tests__/tellAnimations.test.ts`

**Interfaces:**
- Consumes: `AnimContext`, `PoseMap`, `add`, math helpers (`bell`, `oscillate`, `TAU`) from `lib/animation/math.ts` / `lib/animation/types.ts`, `combatBase`/`wingRaise` from `lib/animation/animations/helpers.ts`
- Produces: `AnimState` union gains `"tell_aggression" | "tell_patience" | "tell_risk"`; `ANIMATIONS` record gains those 3 keys — consumed by `ProceduralAnimationController`/`AnimationStateMachine` unchanged (same registration contract as `taunt`).

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { ANIMATIONS } from "../animation/animations/index";
import { PRIORITY } from "../animation/stateMachine";

test("all 3 tell AnimStates are registered with duration in the 300-500ms readable window", () => {
  for (const state of ["tell_aggression", "tell_patience", "tell_risk"] as const) {
    const def = ANIMATIONS[state];
    assert.ok(def, `${state} missing from ANIMATIONS`);
    assert.ok(def.duration >= 0.3 && def.duration <= 0.5, `${state} duration ${def.duration}s outside 300-500ms`);
    assert.equal(def.loop, false);
  }
});

test("tell priority sits above idle/ready/taunt so it interrupts idle, but below any attack/hit-reaction", () => {
  for (const state of ["tell_aggression", "tell_patience", "tell_risk"] as const) {
    assert.ok(PRIORITY[state] > PRIORITY.taunt);
    assert.ok(PRIORITY[state] < PRIORITY.peck_attack);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 tellAnimations`
Expected: FAIL — `tell_aggression` etc. not assignable to `AnimState`, and `ANIMATIONS`/`PRIORITY` missing the keys

- [ ] **Step 3: Write minimal implementation**

In `lib/animation/types.ts`, extend the `AnimState` union (after `"taunt"`):

```typescript
  | "taunt"
  | "backstep"
  | "tell_aggression"
  | "tell_patience"
  | "tell_risk";
```

In `lib/animation/stateMachine.ts`'s `PRIORITY`, add entries between `taunt: 5,` and `victory: 6,`:

```typescript
  tell_aggression: 5,
  tell_patience: 5,
  tell_risk: 6,
```

Create `lib/animation/animations/tells.ts`:

```typescript
/**
 * The 3 Phase A.5 tell animations — each maps to a coarse intent tier
 * (selectTell()'s TellKind), never the exact CombatAction that follows. All
 * 3 are short (350-450ms), hold the combat-ready base, and read as a distinct
 * shape so a player can tell them apart at a glance: aggression = forward
 * weight shift + chest puff, patience = weight settles back + head levels,
 * risk = a sharp coiled crouch-and-hold.
 */
import { bell, easeOut, TAU } from "../math";
import { add, type AnimContext, type PoseMap } from "../types";
import { combatBase, wingRaise } from "./helpers";

export function tellAggression(t: number, ctx: AnimContext, out: PoseMap): void {
  const g = ctx.gains;
  combatBase(out, 1, g.headThrow);
  const forward = t < 0.7 ? bell(t / 0.7) : easeOut((1 - t) / 0.3);
  add(out, "Hips", { px: forward * 0.05, rz: forward * 0.02 });
  add(out, "Chest", { rx: -forward * 0.12, px: forward * 0.04 });
  add(out, "Head", { rx: forward * 0.1 * g.headThrow });
}

export function tellPatience(t: number, ctx: AnimContext, out: PoseMap): void {
  const g = ctx.gains;
  combatBase(out, 1 - t * 0.15, g.headThrow);
  const settle = easeOut(Math.min(1, t / 0.6));
  add(out, "Hips", { py: -settle * 0.02, px: -settle * 0.03 });
  add(out, "Head", { rx: -settle * 0.05 * g.headThrow, ry: Math.sin(t * TAU * 0.5) * 0.03 });
  wingRaise(out, 0.05 * (1 - settle));
}

export function tellRisk(t: number, ctx: AnimContext, out: PoseMap): void {
  const g = ctx.gains;
  const coil = t < 0.5 ? easeOut(t / 0.5) : 1;
  combatBase(out, 1 + coil * 0.3, g.headThrow);
  add(out, "Hips", { py: coil * 0.03, rz: 0 });
  add(out, "Chest", { rx: -coil * 0.18 });
  add(out, "Tail", { rx: coil * 0.15 * g.tailCounter });
  if (t > 0.5) {
    const shake = (t - 0.5) / 0.5;
    add(out, "Head", { rz: Math.sin(shake * TAU * 3) * 0.03 * (1 - shake) });
  }
}
```

In `lib/animation/animations/index.ts`, add the import and 3 registrations:

```typescript
import { tellAggression, tellPatience, tellRisk } from "./tells";
```

```typescript
  taunt: def(1.2, false, "taunt", taunt),
  tell_aggression: def(0.35, false, "tell_aggression", tellAggression),
  tell_patience: def(0.4, false, "tell_patience", tellPatience),
  tell_risk: def(0.45, false, "tell_risk", tellRisk),
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 tellAnimations`
Expected: PASS (both tests)

- [ ] **Step 5: Run `tsc`/lint to confirm the AnimState union change doesn't break an exhaustive switch elsewhere**

Run: `yarn lint 2>&1 | tail -30`
Expected: no new errors (if a `switch (state: AnimState)` elsewhere is exhaustive without a `default`, it will now fail — fix by adding the 3 new cases there, not by weakening the switch)

- [ ] **Step 6: Commit**

```bash
git add lib/animation/types.ts lib/animation/stateMachine.ts lib/animation/animations/tells.ts lib/animation/animations/index.ts lib/__tests__/tellAnimations.test.ts
git commit -m "feat(animation): register 3 tell AnimStates (aggression/patience/risk)"
```

---

## Task 6: `PlayerCommand` + imperfect compliance

**Files:**
- Create: `lib/combat/command.ts`
- Test: `lib/__tests__/command.test.ts`

**Interfaces:**
- Consumes: `CombatIdentity` (Task 1), `CombatAction`
- Produces: `PlayerCommand = "PRESS" | "WAIT" | "RECOVER" | "FORCE_ENGAGEMENT"`, `complianceFactor(command, identity): number`, `commandActionModifier(command: PlayerCommand | null, identity: CombatIdentity, action: CombatAction): number` — consumed by Task 7 (wired into per-turn effective profile in `simulator.ts`) and Task 12/13 (harness coach loop).

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { complianceFactor, commandActionModifier } from "../combat/command";
import type { CombatIdentity } from "../combat/identity";

const highAggression: CombatIdentity = { aggression: 0.9, patience: 0.2, riskTolerance: 0.7 };
const highPatience: CombatIdentity = { aggression: 0.2, patience: 0.9, riskTolerance: 0.3 };

test("complianceFactor is never 0 or 1 — a command always biases, never puppets", () => {
  for (const identity of [highAggression, highPatience]) {
    for (const command of ["PRESS", "WAIT", "RECOVER"] as const) {
      const f = complianceFactor(command, identity);
      assert.ok(f > 0 && f < 1, `${command}/${JSON.stringify(identity)} compliance ${f} out of (0,1)`);
    }
  }
});

test("PRESS complies more with a high-aggression identity than a high-patience one", () => {
  assert.ok(complianceFactor("PRESS", highAggression) > complianceFactor("PRESS", highPatience));
});

test("WAIT complies more with a high-patience identity than a high-aggression one", () => {
  assert.ok(complianceFactor("WAIT", highPatience) > complianceFactor("WAIT", highAggression));
});

test("commandActionModifier is 1 (no bias) for an action the command doesn't target", () => {
  assert.equal(commandActionModifier("PRESS", highAggression, "RECOVER"), 1);
});

test("commandActionModifier is >1 for an action the command does target", () => {
  assert.ok(commandActionModifier("PRESS", highAggression, "PRESSURE") > 1);
});

test("commandActionModifier is 1 when no command is active", () => {
  assert.equal(commandActionModifier(null, highAggression, "PRESSURE"), 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 "command.test"`
Expected: FAIL with "Cannot find module '../combat/command'"

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { CombatAction } from "../types";
import type { CombatIdentity } from "./identity";

/**
 * MVP command set for the Phase A/B validation gate (spec: "3 commands, not
 * the full 8+ of the brainstorm"). FORCE_ENGAGEMENT is never player-issued in
 * this scope — it is auto-triggered by lib/combat/inactivity.ts once a
 * stalemate crosses threshold, exempt from CommandPoints entirely.
 */
export type PlayerCommand = "PRESS" | "WAIT" | "RECOVER" | "FORCE_ENGAGEMENT";

export const COMMAND_POINTS_MAX = 3;
/** Turns of simulator time to regenerate 1 CP — the presentation layer converts this to a felt seconds-countdown from its own turn cadence, not read directly here. */
export const COMMAND_POINT_REGEN_TURNS = 5;
/** A pending command stays live for this many turns (or until it's consumed once), so small latency on issuing it isn't punishing (spec: "accepted for the next relevant decision/exchange"). */
export const COMMAND_ACTIVE_TURNS = 3;

const COMMAND_TARGET_ACTIONS: Record<PlayerCommand, readonly CombatAction[]> = {
  PRESS: ["PRESSURE", "HEAVY_ATTACK", "LIGHT_ATTACK"],
  WAIT: ["GUARD", "REPOSITION", "EVADE"],
  RECOVER: ["RECOVER", "GUARD"],
  FORCE_ENGAGEMENT: ["PRESSURE", "LIGHT_ATTACK", "COUNTER"],
};

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/**
 * How strongly a command actually shifts behavior, scaled down the further
 * the command sits from the rooster's own CombatIdentity (spec: "imperfect
 * command compliance" — never 0% or 100%). The 0.35 floor keeps a command
 * always felt even against a totally misaligned identity; the 0.6 spread
 * caps the ceiling well short of 1.0.
 */
export function complianceFactor(command: PlayerCommand, identity: CombatIdentity): number {
  const alignment =
    command === "PRESS"
      ? identity.aggression
      : command === "WAIT"
        ? identity.patience
        : command === "RECOVER"
          ? 1 - identity.riskTolerance
          : identity.aggression; // FORCE_ENGAGEMENT: an aggressive rooster complies most readily with being pushed to engage
  return 0.35 + clamp01(alignment) * 0.6;
}

/** Multiplier applied to a targeted action's base score term; 1 (no-op) for every non-targeted action or when no command is pending. */
export function commandActionModifier(command: PlayerCommand | null, identity: CombatIdentity, action: CombatAction): number {
  if (!command) return 1;
  if (!COMMAND_TARGET_ACTIONS[command].includes(action)) return 1;
  return 1 + complianceFactor(command, identity);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 "command.test"`
Expected: PASS (all 6 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/combat/command.ts lib/__tests__/command.test.ts
git commit -m "feat(combat): add PlayerCommand set with imperfect compliance"
```

---

## Task 7: Wire `commandActionModifier` into `scoreAction`

**Files:**
- Modify: `lib/combat/behavior.ts` (`DecisionContext`, `scoreAction`)
- Test: `lib/__tests__/behaviorScoring.test.ts` (extend from Task 3)

**Interfaces:**
- Consumes: `commandActionModifier`, `PlayerCommand` (Task 6), `deriveCombatIdentity` (Task 1)
- Produces: `DecisionContext.pendingCommand: PlayerCommand | null`, `DecisionContext.identity: CombatIdentity` — consumed by Task 11 (simulator's coach loop).

- [ ] **Step 1: Write failing test**

Append to `lib/__tests__/behaviorScoring.test.ts`:

```typescript
import { ARCHETYPE_PROFILES } from "../combat/behavior";

test("a pending PRESS command raises PRESSURE's score over the same context with no command", () => {
  const profile = ARCHETYPE_PROFILES.balanced;
  const withPress = scoreAction(profile, "PRESSURE", baseCtx({ pendingCommand: "PRESS" }));
  const withoutCommand = scoreAction(profile, "PRESSURE", baseCtx({ pendingCommand: null }));
  assert.ok(withPress > withoutCommand);
});

test("a pending PRESS command does not change RECOVER's score (untargeted action)", () => {
  const profile = ARCHETYPE_PROFILES.balanced;
  const withPress = scoreAction(profile, "RECOVER", baseCtx({ pendingCommand: "PRESS" }));
  const withoutCommand = scoreAction(profile, "RECOVER", baseCtx({ pendingCommand: null }));
  assert.equal(withPress, withoutCommand);
});
```

Update `baseCtx()` in the same file to include `pendingCommand: null` in its defaults.

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 behaviorScoring`
Expected: FAIL — `pendingCommand` not assignable to `DecisionContext`

- [ ] **Step 3: Write minimal implementation**

In `lib/combat/behavior.ts`, import and extend:

```typescript
import { commandActionModifier, type PlayerCommand } from "./command";
import { deriveCombatIdentity } from "./identity";
```

```typescript
export type DecisionContext = {
  // ...existing fields...
  /** A live player (or Auto-Coach) command biasing this turn's action choice — null when none is pending. */
  pendingCommand: PlayerCommand | null;
  rng: Rng;
};
```

In `scoreAction`, right after the `score += base * styleWeight(...)` line, add:

```typescript
  score += base * commandActionModifier(ctx.pendingCommand, deriveCombatIdentity(profile), action);
```

(This adds a second, independent scaled copy of `base` on top of the style-weighted one — both are legitimate multiplicative lenses on the same base term: style is "always on", the command is a temporary overlay. Do not multiply them together, since compliance is meant to be additive pressure, not compounding with style.)

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 behaviorScoring`
Expected: PASS (all tests including the 2 new ones)

- [ ] **Step 5: Commit**

```bash
git add lib/combat/behavior.ts lib/__tests__/behaviorScoring.test.ts
git commit -m "feat(combat): wire PlayerCommand compliance into scoreAction"
```

---

## Task 8: Momentum → `riskTolerance` nudge (replaces the old inline momentum score bonus)

**Files:**
- Modify: `lib/combat/momentum.ts` (add `momentumRiskNudge`)
- Modify: `lib/combat/behavior.ts:191-194` (delete the old inline momentum bonus — it's superseded)
- Test: `lib/__tests__/momentum.test.ts` (new — momentum.ts currently has no dedicated test file)

**Interfaces:**
- Produces: `MOMENTUM_RISK_NUDGE_CAP`, `momentumRiskNudge(momentum: number): number` — consumed by Task 9 (per-turn effective profile in `simulator.ts`).

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { momentumRiskNudge, MOMENTUM_RISK_NUDGE_CAP } from "../combat/momentum";

test("momentumRiskNudge is 0 at neutral momentum", () => {
  assert.equal(momentumRiskNudge(0), 0);
});

test("momentumRiskNudge is positive under positive momentum, negative under negative momentum", () => {
  assert.ok(momentumRiskNudge(50) > 0);
  assert.ok(momentumRiskNudge(-50) < 0);
});

test("momentumRiskNudge never exceeds the cap even at max momentum (prevents a runaway snowball)", () => {
  assert.equal(momentumRiskNudge(100), MOMENTUM_RISK_NUDGE_CAP);
  assert.equal(momentumRiskNudge(-100), -MOMENTUM_RISK_NUDGE_CAP);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 "momentum.test"`
Expected: FAIL with "momentumRiskNudge is not a function"

- [ ] **Step 3: Write minimal implementation**

Append to `lib/combat/momentum.ts`:

```typescript
/**
 * Momentum's only mechanical effect (spec Phase B) — nudges *this fighter's
 * own* effective riskTolerance a small, capped amount, independently of the
 * opponent's momentum. Explicitly not a damage/accuracy/hit-stop-magnitude
 * multiplier. The 0.12 cap keeps a single swing from compounding into a
 * runaway snowball — a losing fighter's caution always comes from their own
 * falling momentum, never suppressed further by the winner's rising one.
 */
export const MOMENTUM_RISK_NUDGE_CAP = 0.12;

export function momentumRiskNudge(momentum: number): number {
  return clampMomentum(momentum) / MOMENTUM_MAX * MOMENTUM_RISK_NUDGE_CAP;
}
```

In `lib/combat/behavior.ts`, delete the now-superseded lines (currently at 191-194):

```typescript
  const momentumRatio = ctx.momentum / 100;
  if (momentumRatio > 0.2 && (action === "PRESSURE" || action === "HEAVY_ATTACK")) score += momentumRatio * 0.4;
  if (momentumRatio < -0.2 && (action === "GUARD" || action === "EVADE" || action === "REPOSITION"))
    score += -momentumRatio * 0.4;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 "momentum.test"`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Run the full suite — this is a behavior-changing deletion, expect some existing `combat.test.ts` fight-outcome assertions to shift**

Run: `yarn test 2>&1 | tail -40`
Expected: any failures here are addressed in Task 9 (the deletion is only "complete" once Task 9 reintroduces the effect via the identity nudge) — if `combat.test.ts` has hard-coded win-rate/action-mix assertions that regress, note them for Task 9's step 5 rerun rather than fixing them now

- [ ] **Step 6: Commit**

```bash
git add lib/combat/momentum.ts lib/combat/behavior.ts lib/__tests__/momentum.test.ts
git commit -m "refactor(combat): replace inline momentum score bonus with capped riskTolerance nudge fn"
```

---

## Task 9: Mental state + effective per-turn profile in `simulator.ts`

**Files:**
- Create: `lib/combat/mentalState.ts`
- Modify: `lib/combat/state.ts:14-53` (`CombatantState` gains `mentalState`, `commandPoints`, `pendingCommand`)
- Modify: `lib/combat/simulator.ts:141-142` (compute effective profile before `chooseAction`)
- Test: `lib/__tests__/mentalState.test.ts`

**Interfaces:**
- Consumes: `CombatIdentity`/`withIdentity` (Task 1), `momentumRiskNudge` (Task 8), `CombatExperience`
- Produces: `MentalState` type, `deriveMentalState(...)`, `applyMentalState(identity, state): CombatIdentity` — this task is where Task 8's nudge and Task 6/7's command modifier actually get exercised in a real fight, via the new `CombatantState.mentalState`/`commandPoints`/`pendingCommand` fields consumed by Task 11 (harness coach loop) and Task 12 (CP regen tick).

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { deriveMentalState, applyMentalState } from "../combat/mentalState";
import { emptyExperience } from "../combat/experience";

test("low stamina always reads as exhausted regardless of other inputs", () => {
  assert.equal(
    deriveMentalState({ hpRatio: 1, staminaRatio: 0.1, momentum: 50, recentExchangeResult: "landed", experience: emptyExperience() }),
    "exhausted"
  );
});

test("low HP + very negative momentum reads as desperate", () => {
  assert.equal(
    deriveMentalState({ hpRatio: 0.2, staminaRatio: 0.8, momentum: -40, recentExchangeResult: "taken", experience: emptyExperience() }),
    "desperate"
  );
});

test("high momentum + a landed hit reads as confident", () => {
  assert.equal(
    deriveMentalState({ hpRatio: 0.9, staminaRatio: 0.8, momentum: 40, recentExchangeResult: "landed", experience: emptyExperience() }),
    "confident"
  );
});

test("neutral inputs read as calm", () => {
  assert.equal(
    deriveMentalState({ hpRatio: 0.9, staminaRatio: 0.9, momentum: 0, recentExchangeResult: "neutral", experience: emptyExperience() }),
    "calm"
  );
});

test("applyMentalState('desperate') raises riskTolerance, capped at 1", () => {
  const identity = { aggression: 0.5, patience: 0.5, riskTolerance: 0.9 };
  const adjusted = applyMentalState(identity, "desperate");
  assert.ok(adjusted.riskTolerance > identity.riskTolerance);
  assert.ok(adjusted.riskTolerance <= 1);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 mentalState`
Expected: FAIL with "Cannot find module '../combat/mentalState'"

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { CombatExperience } from "../types";
import type { CombatIdentity } from "./identity";

/** A single pure function, not six independent state machines (spec Phase B). */
export type MentalState = "calm" | "confident" | "nervous" | "frustrated" | "desperate" | "exhausted";

export type MentalStateInput = {
  hpRatio: number;
  staminaRatio: number;
  momentum: number;
  recentExchangeResult: "landed" | "taken" | "neutral";
  experience: CombatExperience;
};

export function deriveMentalState(input: MentalStateInput): MentalState {
  const { hpRatio, staminaRatio, momentum, recentExchangeResult } = input;
  if (staminaRatio <= 0.15) return "exhausted";
  if (hpRatio <= 0.3 && momentum <= -20) return "desperate";
  if (momentum <= -25 && recentExchangeResult === "taken") return "frustrated";
  if (momentum <= -15 || (hpRatio <= 0.4 && recentExchangeResult !== "landed")) return "nervous";
  if (momentum >= 25 && recentExchangeResult === "landed") return "confident";
  return "calm";
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

/** Feeds back into CombatIdentity's effective weights for the rest of the fight (spec Phase B) — small, capped nudges per state, not a stat overhaul. */
export function applyMentalState(identity: CombatIdentity, state: MentalState): CombatIdentity {
  switch (state) {
    case "confident":
      return { ...identity, riskTolerance: clamp01(identity.riskTolerance + 0.1), aggression: clamp01(identity.aggression + 0.05) };
    case "nervous":
      return { ...identity, riskTolerance: clamp01(identity.riskTolerance - 0.1), patience: clamp01(identity.patience + 0.05) };
    case "frustrated":
      return { ...identity, riskTolerance: clamp01(identity.riskTolerance + 0.15), patience: clamp01(identity.patience - 0.1) };
    case "desperate":
      return { ...identity, riskTolerance: clamp01(identity.riskTolerance + 0.25) };
    case "exhausted":
      return { ...identity, aggression: clamp01(identity.aggression - 0.15) };
    case "calm":
      return identity;
  }
}
```

In `lib/combat/state.ts`, add the import and 3 fields:

```typescript
import type { BehavioralProfile, Chicken, CombatDistance, CombatExperience, OpponentModel } from "../types";
import type { MentalState } from "./mentalState";
import type { PlayerCommand } from "./command";
```

```typescript
export type CombatantState = {
  // ...existing fields...
  mentalState: MentalState;
  commandPoints: number;
  pendingCommand: PlayerCommand | null;
  pendingCommandTurnsLeft: number;
  wasHitLastTurn: boolean;
};

export function makeCombatantState(chicken: Chicken): CombatantState {
  const hp = maxHealth(chicken);
  return {
    // ...existing fields...
    mentalState: "calm",
    commandPoints: 0,
    pendingCommand: null,
    pendingCommandTurnsLeft: 0,
    wasHitLastTurn: false,
  };
}
```

In `lib/combat/simulator.ts`, import the new pieces:

```typescript
import { applyMentalState, deriveMentalState } from "./mentalState";
import { deriveCombatIdentity, withIdentity } from "./identity";
import { momentumRiskNudge } from "./momentum";
```

Replace the two `let actionA = chooseAction(stateA.behavior, legalA, decisionCtxA);` / `let actionB = chooseAction(stateB.behavior, legalB, decisionCtxB);` lines with an effective-profile computation for each fighter, inserted just before them:

```typescript
    stateA.mentalState = deriveMentalState({
      hpRatio: stateA.hp / stateA.maxHp,
      staminaRatio: stateA.stamina / stateA.maxStamina,
      momentum: stateA.momentum,
      recentExchangeResult: stateA.wasHitLastTurn ? "taken" : "neutral",
      experience: stateA.experience,
    });
    stateB.mentalState = deriveMentalState({
      hpRatio: stateB.hp / stateB.maxHp,
      staminaRatio: stateB.stamina / stateB.maxStamina,
      momentum: stateB.momentum,
      recentExchangeResult: stateB.wasHitLastTurn ? "taken" : "neutral",
      experience: stateB.experience,
    });

    const identityA = applyMentalState(deriveCombatIdentity(stateA.behavior), stateA.mentalState);
    const identityB = applyMentalState(deriveCombatIdentity(stateB.behavior), stateB.mentalState);
    identityA.riskTolerance = Math.min(1, Math.max(0, identityA.riskTolerance + momentumRiskNudge(stateA.momentum)));
    identityB.riskTolerance = Math.min(1, Math.max(0, identityB.riskTolerance + momentumRiskNudge(stateB.momentum)));
    const effectiveProfileA = withIdentity(stateA.behavior, identityA);
    const effectiveProfileB = withIdentity(stateB.behavior, identityB);

    let actionA = chooseAction(effectiveProfileA, legalA, decisionCtxA);
    let actionB = chooseAction(effectiveProfileB, legalB, decisionCtxB);
```

Also add `pendingCommand: stateA.pendingCommand,`/`pendingCommand: stateB.pendingCommand,` to the two `decisionCtxA`/`decisionCtxB` object literals (they gained the field in Task 7 but it isn't populated yet).

Note: `recentExchangeResult` above uses only `wasHitLastTurn` (already tracked); `"landed"` requires knowing this fighter's own last-turn attacker outcome, which isn't tracked per-fighter yet — leave it `"taken" | "neutral"` for now (a fighter that hasn't been hit reads as `"neutral"`, which is the safe default for `deriveMentalState`'s `"confident"` branch never firing from this path yet). This is a known, intentionally deferred gap — flag it in the task's commit message rather than over-building a `wasLandedLastTurn` tracker not required by the 4 validation tests.

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 mentalState`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Run the full suite, including `combat.test.ts` — this closes out Task 8's deferred regression check**

Run: `yarn test 2>&1 | tail -40`
Expected: all pre-existing tests pass; if any `combat.test.ts` assertion hard-codes an exact win/turn count that shifted from the momentum refactor, update that assertion's expected value (not the production code) and note the diff in the commit message

- [ ] **Step 6: Commit**

```bash
git add lib/combat/mentalState.ts lib/combat/state.ts lib/combat/simulator.ts lib/__tests__/mentalState.test.ts lib/__tests__/combat.test.ts
git commit -m "feat(combat): derive mental state per turn and apply it + momentum nudge to the effective profile"
```

---

## Task 10: `CombatInactivity` — graduated anti-stalemate pressure + `FORCE_ENGAGEMENT`

**Files:**
- Create: `lib/combat/inactivity.ts`
- Modify: `lib/combat/behavior.ts` (`DecisionContext` gains `noDamageStreak`; `scoreAction` applies the bonus)
- Modify: `lib/combat/simulator.ts` (populate `noDamageStreak`, trigger `FORCE_ENGAGEMENT` before the existing hard-force block)
- Test: `lib/__tests__/inactivity.test.ts`

**Interfaces:**
- Consumes: `noDamageStreak` counter (already tracked in `simulator.ts` as `noDamageStreak`, currently only used at the `STALEMATE_TURNS` hard cutoff)
- Produces: `inactivityPressureBonus(noDamageStreak: number): number`, `shouldForceEngagement(noDamageStreak: number): boolean` — this replaces `pickForcedOffensiveAction`'s abruptness with a graduated ramp, fixing the exact class of bug noted in the spec (Onyx Chicken vs Champion Chicken counter-vs-counter stalemate, 2026-09-08).

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { inactivityPressureBonus, shouldForceEngagement } from "../combat/inactivity";

test("inactivityPressureBonus is 0 for a fresh fight (no stalemate yet)", () => {
  assert.equal(inactivityPressureBonus(0), 0);
});

test("inactivityPressureBonus increases monotonically with a longer no-damage streak", () => {
  assert.ok(inactivityPressureBonus(10) > inactivityPressureBonus(3));
});

test("shouldForceEngagement is false early and true once the streak crosses the stalemate threshold", () => {
  assert.equal(shouldForceEngagement(5), false);
  assert.equal(shouldForceEngagement(15), true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 inactivity`
Expected: FAIL with "Cannot find module '../combat/inactivity'"

- [ ] **Step 3: Write minimal implementation**

```typescript
/**
 * Addresses the counter-vs-counter stalemate bug (Onyx Chicken vs Champion
 * Chicken, 2026-09-08) at its root: repeated non-resolving exchanges should
 * gradually raise both fighters' willingness to close/pressure/bait, not
 * just hard-force one action once a fixed threshold is crossed (spec Phase
 * B). STALEMATE_TURNS in simulator.ts stays as the final, guaranteed
 * circuit-breaker; this ramps pressure well before that point is reached.
 */
export const STALEMATE_TURNS = 15;

/** Additive score bonus toward PRESSURE/LIGHT_ATTACK/COUNTER (a bait-friendly action), ramping from turn 1 of a no-damage streak. */
export function inactivityPressureBonus(noDamageStreak: number): number {
  return Math.min(0.6, noDamageStreak * 0.04);
}

/** True once a stalemate has run long enough to unlock FORCE_ENGAGEMENT even at 0 CommandPoints. */
export function shouldForceEngagement(noDamageStreak: number): boolean {
  return noDamageStreak >= STALEMATE_TURNS;
}
```

In `lib/combat/behavior.ts`, add `noDamageStreak: number;` to `DecisionContext`, and inside `scoreAction`, near the other contextual bonuses (after the `momentumRatio`/position block, before `score -= (def.staminaCost ...)`):

```typescript
  if (action === "PRESSURE" || action === "LIGHT_ATTACK" || action === "COUNTER") {
    score += inactivityPressureBonus(ctx.noDamageStreak);
  }
```

with the import:

```typescript
import { inactivityPressureBonus } from "./inactivity";
```

In `lib/combat/simulator.ts`, add `noDamageStreak,` to both `decisionCtxA`/`decisionCtxB` literals, and replace `STALEMATE_TURNS` (the local const at the top of the file) with the imported one from `inactivity.ts` to keep a single source of truth:

```typescript
import { shouldForceEngagement, STALEMATE_TURNS } from "./inactivity";
```

(remove the file's own `const STALEMATE_TURNS = 15;` declaration).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 inactivity`
Expected: PASS (all 3 tests)

- [ ] **Step 5: Run the full suite**

Run: `yarn test 2>&1 | tail -30`
Expected: all pass — `shouldForceEngagement`/`STALEMATE_TURNS` are drop-in equivalents of the removed local const, and the new bonus only ramps *before* the existing hard-force block, so no fight that previously resolved by then changes outcome

- [ ] **Step 6: Commit**

```bash
git add lib/combat/inactivity.ts lib/combat/behavior.ts lib/combat/simulator.ts lib/__tests__/inactivity.test.ts
git commit -m "feat(combat): graduated anti-stalemate pressure ramp + FORCE_ENGAGEMENT threshold"
```

---

## Task 11: Momentum wired to hit-stop (juice)

**Files:**
- Modify: `components/BattleCanvas.tsx:1062-1075` (the `activeAttack.impactFired` block)
- Test: `lib/__tests__/momentumHitStop.test.ts` (a pure-function extraction so this is unit-testable outside React/three.js)

**Interfaces:**
- Consumes: `hitStopFor` (`lib/animation/choreography.ts:254`), `CombatLogEntry.momentum` (already present, `simulator.ts:213`/`264`)
- Produces: `momentumHitStopBonus(momentumSwing: number): number` in a new small pure module, called from `BattleCanvas.tsx` alongside the existing `hitStopFor(...)` call.

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { momentumHitStopBonus, MOMENTUM_HITSTOP_BONUS_CAP } from "../animation/momentumHitStop";

test("momentumHitStopBonus is 0 for a small momentum swing", () => {
  assert.equal(momentumHitStopBonus(2), 0);
});

test("momentumHitStopBonus grows with a bigger swing but never exceeds the cap", () => {
  assert.ok(momentumHitStopBonus(10) > momentumHitStopBonus(5));
  assert.ok(momentumHitStopBonus(100) <= MOMENTUM_HITSTOP_BONUS_CAP);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 momentumHitStop`
Expected: FAIL with "Cannot find module '../animation/momentumHitStop'"

- [ ] **Step 3: Write minimal implementation**

Create `lib/animation/momentumHitStop.ts`:

```typescript
/**
 * Momentum-swinging hit gets a bigger hit-stop/camera punch (spec cut #4:
 * "wire momentum into HitStopController directly" — juice, not a hidden
 * damage/accuracy buff; that mechanical rule lives in combat/momentum.ts's
 * momentumRiskNudge instead). `momentumSwing` is the attacker's per-turn
 * momentum delta (CombatLogEntry doesn't carry the delta directly today —
 * the caller computes `entry.momentum.attacker - previousAttackerMomentum`).
 */
export const MOMENTUM_HITSTOP_BONUS_CAP = 0.12;
const SWING_THRESHOLD = 5;

export function momentumHitStopBonus(momentumSwing: number): number {
  const magnitude = Math.max(0, Math.abs(momentumSwing) - SWING_THRESHOLD);
  return Math.min(MOMENTUM_HITSTOP_BONUS_CAP, magnitude * 0.006);
}
```

In `components/BattleCanvas.tsx`, track the previous attacker-side momentum per fighter (near wherever `activeAttack` is constructed from a `CombatLogEntry` — the exact variable holding the current `entry` at queue-time) and extend the hit-stop calculation:

```typescript
import { momentumHitStopBonus } from "@/lib/animation/momentumHitStop";
```

```typescript
          const hitStopSeconds = activeAttack.isMiss
            ? 0
            : hitStopFor(choreo, activeAttack.stagger, activeAttack.isCritical) +
              momentumHitStopBonus(activeAttack.momentumSwing);
```

adding a `momentumSwing: number` field to wherever `activeAttack` is constructed, computed as `entry.momentum[attackerSide] - previousMomentum[attackerSide]` at the point the log entry is queued (mirror the existing pattern used for `activeAttack.stagger`/`isCritical`, which are already copied straight off the `CombatLogEntry` at queue-time).

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 momentumHitStop`
Expected: PASS (both tests)

- [ ] **Step 5: Manual smoke check (BattleCanvas has no test harness in this repo)**

Run the app (`yarn dev`), start any fight, and confirm no console/type errors from the new field on `activeAttack`'s object shape. This step has no automated assertion — note in the PR/commit description that it was eyeballed, not verified by a test.

- [ ] **Step 6: Commit**

```bash
git add lib/animation/momentumHitStop.ts components/BattleCanvas.tsx lib/__tests__/momentumHitStop.test.ts
git commit -m "feat(animation): wire momentum swing into hit-stop duration"
```

---

## Task 12: `simulateBattle` coach hook — CP regen + pending-command lifecycle

**Files:**
- Modify: `lib/combat/simulator.ts` (`simulateBattle` signature + per-turn coach call + CP regen/consume)
- Test: `lib/__tests__/simulatorCoach.test.ts`

**Interfaces:**
- Consumes: `PlayerCommand`, `COMMAND_POINTS_MAX`, `COMMAND_POINT_REGEN_TURNS`, `COMMAND_ACTIVE_TURNS` (Task 6)
- Produces: `CoachObservation` type, `CoachFn = (obs: CoachObservation) => PlayerCommand | null`, `simulateBattle(chickenA, chickenB, rng?, options?: { coachA?: CoachFn; coachB?: CoachFn })` — consumed by Task 13 (Auto-Coach default) and Task 14/15 (validation-gate harness).

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { simulateBattle } from "../combat/simulator";
import { makeChicken, statBlock } from "./testHelpers";

test("a coach that always returns null behaves identically to no coach at all (same seed)", () => {
  const a = makeChicken({ id: "a", iv: statBlock(70), fightingStyle: "aggressive" });
  const b = makeChicken({ id: "b", iv: statBlock(70), fightingStyle: "counter" });
  const seeded = () => {
    let s = 42;
    return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff), s / 0x7fffffff);
  };
  const withNullCoach = simulateBattle(a, b, seeded(), { coachA: () => null });
  const withoutCoach = simulateBattle(a, b, seeded());
  assert.equal(withNullCoach.winnerId, withoutCoach.winnerId);
  assert.equal(withNullCoach.totalTurns, withoutCoach.totalTurns);
});

test("a coach is never called before its fighter has at least 1 CommandPoint", () => {
  const a = makeChicken({ id: "a", iv: statBlock(70), fightingStyle: "aggressive" });
  const b = makeChicken({ id: "b", iv: statBlock(70), fightingStyle: "counter" });
  let calledAtZeroCp = false;
  simulateBattle(a, b, () => 0.5, {
    coachA: (obs) => {
      if (obs.own.commandPoints < 1) calledAtZeroCp = true;
      return null;
    },
  });
  assert.equal(calledAtZeroCp, false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 simulatorCoach`
Expected: FAIL — `simulateBattle`'s 4th `options` parameter doesn't exist yet

- [ ] **Step 3: Write minimal implementation**

In `lib/combat/simulator.ts`, add near the top:

```typescript
import { COMMAND_ACTIVE_TURNS, COMMAND_POINTS_MAX, COMMAND_POINT_REGEN_TURNS, type PlayerCommand } from "./command";
import { shouldForceEngagement } from "./inactivity";
```

```typescript
export type CoachObservation = {
  turn: number;
  own: {
    hp: number;
    maxHp: number;
    stamina: number;
    maxStamina: number;
    momentum: number;
    mentalState: CombatantState["mentalState"];
    commandPoints: number;
  };
  opponentContextState: CombatContextState;
  opponentRecentActions: readonly CombatAction[];
};

export type CoachFn = (obs: CoachObservation) => PlayerCommand | null;

export type SimulateBattleOptions = {
  coachA?: CoachFn;
  coachB?: CoachFn;
};
```

Change the signature:

```typescript
export function simulateBattle(
  chickenA: Chicken,
  chickenB: Chicken,
  rng: Rng = Math.random,
  options: SimulateBattleOptions = {}
): CombatResult {
```

Inside the main `while` loop, right after the mental-state block from Task 9 and before `let actionA = chooseAction(...)`, add CP regen + the coach call for each side:

```typescript
    stateA.commandPoints = Math.min(COMMAND_POINTS_MAX, stateA.commandPoints + 1 / COMMAND_POINT_REGEN_TURNS);
    stateB.commandPoints = Math.min(COMMAND_POINTS_MAX, stateB.commandPoints + 1 / COMMAND_POINT_REGEN_TURNS);

    if (stateA.pendingCommandTurnsLeft > 0) stateA.pendingCommandTurnsLeft -= 1;
    else stateA.pendingCommand = null;
    if (stateB.pendingCommandTurnsLeft > 0) stateB.pendingCommandTurnsLeft -= 1;
    else stateB.pendingCommand = null;

    if (options.coachA && stateA.commandPoints >= 1) {
      const cmd = options.coachA({
        turn,
        own: {
          hp: stateA.hp, maxHp: stateA.maxHp, stamina: stateA.stamina, maxStamina: stateA.maxStamina,
          momentum: stateA.momentum, mentalState: stateA.mentalState, commandPoints: stateA.commandPoints,
        },
        opponentContextState: contextB,
        opponentRecentActions: stateA.opponentModel.recentActions,
      });
      if (cmd) {
        stateA.pendingCommand = cmd;
        stateA.pendingCommandTurnsLeft = COMMAND_ACTIVE_TURNS;
        stateA.commandPoints -= 1;
      }
    }
    if (options.coachB && stateB.commandPoints >= 1) {
      const cmd = options.coachB({
        turn,
        own: {
          hp: stateB.hp, maxHp: stateB.maxHp, stamina: stateB.stamina, maxStamina: stateB.maxStamina,
          momentum: stateB.momentum, mentalState: stateB.mentalState, commandPoints: stateB.commandPoints,
        },
        opponentContextState: contextA,
        opponentRecentActions: stateB.opponentModel.recentActions,
      });
      if (cmd) {
        stateB.pendingCommand = cmd;
        stateB.pendingCommandTurnsLeft = COMMAND_ACTIVE_TURNS;
        stateB.commandPoints -= 1;
      }
    }

    if (shouldForceEngagement(noDamageStreak)) {
      if (!stateA.pendingCommand) { stateA.pendingCommand = "FORCE_ENGAGEMENT"; stateA.pendingCommandTurnsLeft = 1; }
      if (!stateB.pendingCommand) { stateB.pendingCommand = "FORCE_ENGAGEMENT"; stateB.pendingCommandTurnsLeft = 1; }
    }
```

Finally, populate `pendingCommand` on both `decisionCtxA`/`decisionCtxB` (Task 9 left this as a TODO):

```typescript
      pendingCommand: stateA.pendingCommand,
```
```typescript
      pendingCommand: stateB.pendingCommand,
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 simulatorCoach`
Expected: PASS (both tests)

- [ ] **Step 5: Run the full suite**

Run: `yarn test 2>&1 | tail -30`
Expected: all pass — `options` defaults to `{}` so every existing 3-arg call to `simulateBattle`/`simulateFight` is untouched

- [ ] **Step 6: Commit**

```bash
git add lib/combat/simulator.ts lib/__tests__/simulatorCoach.test.ts
git commit -m "feat(combat): add optional per-side coach hook with CommandPoints regen to simulateBattle"
```

---

## Task 13: Auto-Coach default policy

**Files:**
- Create: `lib/combat/autoCoach.ts`
- Test: `lib/__tests__/autoCoach.test.ts`

**Interfaces:**
- Consumes: `CoachFn`, `CoachObservation` (Task 12)
- Produces: `autoCoachPolicy(): CoachFn` — a per-fight toggle default so idle/casual play is never blocked by this system (spec cut #6), consumed by Task 14/15 (harness Test B/D comparisons).

- [ ] **Step 1: Write failing test**

```typescript
import test from "node:test";
import assert from "node:assert/strict";
import { autoCoachPolicy } from "../combat/autoCoach";
import type { CoachObservation } from "../combat/simulator";

function obs(overrides: Partial<CoachObservation> = {}): CoachObservation {
  return {
    turn: 1,
    own: { hp: 80, maxHp: 100, stamina: 80, maxStamina: 100, momentum: 0, mentalState: "calm", commandPoints: 2 },
    opponentContextState: "NEUTRAL",
    opponentRecentActions: [],
    ...overrides,
  };
}

test("autoCoachPolicy issues PRESS when the opponent is EXHAUSTED", () => {
  const coach = autoCoachPolicy();
  assert.equal(coach(obs({ opponentContextState: "EXHAUSTED" })), "PRESS");
});

test("autoCoachPolicy issues RECOVER when this fighter's own mental state is desperate", () => {
  const coach = autoCoachPolicy();
  assert.equal(coach(obs({ own: { hp: 20, maxHp: 100, stamina: 30, maxStamina: 100, momentum: -30, mentalState: "desperate", commandPoints: 2 } })), "RECOVER");
});

test("autoCoachPolicy issues WAIT when the opponent is DOMINANT", () => {
  const coach = autoCoachPolicy();
  assert.equal(coach(obs({ opponentContextState: "DOMINANT" })), "WAIT");
});

test("autoCoachPolicy issues no command (null) in a routine neutral state", () => {
  const coach = autoCoachPolicy();
  assert.equal(coach(obs()), null);
});

test("autoCoachPolicy never issues a command with 0 CommandPoints available", () => {
  const coach = autoCoachPolicy();
  assert.equal(coach(obs({ opponentContextState: "EXHAUSTED", own: { hp: 80, maxHp: 100, stamina: 80, maxStamina: 100, momentum: 0, mentalState: "calm", commandPoints: 0 } })), null);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test 2>&1 | grep -A5 autoCoach`
Expected: FAIL with "Cannot find module '../combat/autoCoach'"

- [ ] **Step 3: Write minimal implementation**

```typescript
import type { CoachFn } from "./simulator";

/**
 * The default game-plan policy for `auto` mode (spec: "Auto-Coach (first-
 * class from Phase A)") — same action-scoring path as `manual`, this just
 * supplies a static playerCommandModifier instead of a live human one, so
 * idle/casual play is never blocked by the coaching layer.
 */
export function autoCoachPolicy(): CoachFn {
  return (obs) => {
    if (obs.own.commandPoints < 1) return null;
    if (obs.own.mentalState === "desperate" || obs.own.mentalState === "exhausted") return "RECOVER";
    if (obs.opponentContextState === "EXHAUSTED" || obs.opponentContextState === "VULNERABLE") return "PRESS";
    if (obs.opponentContextState === "DOMINANT" || obs.opponentContextState === "PRESSURING") return "WAIT";
    return null;
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test 2>&1 | grep -A5 autoCoach`
Expected: PASS (all 5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/combat/autoCoach.ts lib/__tests__/autoCoach.test.ts
git commit -m "feat(combat): add Auto-Coach default game-plan policy"
```

---

## Task 14: Validation-gate harness script — Test B (Intervention)

**Files:**
- Create: `scripts/validation-gate-sim.ts` (modeled on the existing `scripts/balance-sim.ts` pattern — throwaway, not wired into the app or `yarn test`)

**Interfaces:**
- Consumes: `simulateBattle` (Task 12), `autoCoachPolicy` (Task 13), `deriveBehaviorProfile`, `generateRandomChicken`
- Produces: a CLI report of manual-coach vs Auto-Coach win rate at equal rooster strength — this is Test B's actual pass/fail measurement, run manually (not part of `yarn test`), same as `balance-sim.ts` is run manually today.

- [ ] **Step 1: Write the script**

```typescript
import { deriveBehaviorProfile } from "../lib/combat/behavior";
import { simulateBattle, type CoachFn } from "../lib/combat/simulator";
import { autoCoachPolicy } from "../lib/combat/autoCoach";
import { generateRandomChicken } from "../lib/chickenGenerator";
import type { Chicken, FightingStyle } from "../lib/types";

/**
 * Validation-gate harness (spec: "the only thing that gets built before a
 * decision"). Throwaway CLI tool, not wired into the app or `yarn test` —
 * same status as scripts/balance-sim.ts. Run with:
 *   node --import ./scripts/test-ts-loader.mjs scripts/validation-gate-sim.ts
 */

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** A deliberately *weaker* fighter (lower fixed stats) than the opponent, so Test B/D measure coaching quality, not stat parity. */
function buildFighter(style: FightingStyle, name: string, iv: number, ev: number): Chicken {
  const c = generateRandomChicken({ sex: "rooster", name });
  const ivBlock = { ...c.iv };
  const evBlock = { ...c.ev };
  (Object.keys(ivBlock) as (keyof typeof ivBlock)[]).forEach((k) => {
    ivBlock[k] = iv;
    evBlock[k] = ev;
  });
  return { ...c, iv: ivBlock, ev: evBlock, fightingStyle: style, traits: [], behavior: deriveBehaviorProfile(style, []) };
}

/** A scripted "good coaching" heuristic — reads the opponent's context state and this fighter's own state, same observation surface a human coach would have. */
const readerCoach: CoachFn = (obs) => {
  if (obs.own.commandPoints < 1) return null;
  if (obs.own.mentalState === "desperate" || obs.own.mentalState === "exhausted") return "RECOVER";
  if (obs.opponentContextState === "PRESSURING" && obs.own.momentum < 0) return "WAIT";
  if (obs.opponentContextState === "EXHAUSTED" || obs.opponentContextState === "VULNERABLE") return "PRESS";
  return null;
};

function runTrial(coachForWeaker: CoachFn | undefined, trials: number, seedBase: number): number {
  let weakerWins = 0;
  for (let i = 0; i < trials; i++) {
    const weaker = buildFighter("counter", "Weaker", 55, 30);
    const stronger = buildFighter("aggressive", "Stronger", 80, 60);
    const result = simulateBattle(weaker, stronger, seededRng(seedBase + i), {
      coachA: coachForWeaker,
      coachB: autoCoachPolicy(),
    });
    if (result.winnerId === weaker.id) weakerWins += 1;
  }
  return weakerWins / trials;
}

const TRIALS = 500;
const manualWinRate = runTrial(readerCoach, TRIALS, 1000);
const autoWinRate = runTrial(autoCoachPolicy(), TRIALS, 1000);

console.log(`Test B — manual-coach win rate: ${(manualWinRate * 100).toFixed(1)}%`);
console.log(`Test B — auto-coach win rate:   ${(autoWinRate * 100).toFixed(1)}%`);
console.log(
  manualWinRate > autoWinRate
    ? "PASS — manual coaching beats Auto-Coach at equal-ish rooster strength"
    : "FAIL — manual coaching does not beat Auto-Coach; revisit scoring/compliance tuning before Phase C"
);
```

- [ ] **Step 2: Run it and record the result**

Run: `node --import ./scripts/test-ts-loader.mjs scripts/validation-gate-sim.ts`
Expected: prints both win rates and a PASS/FAIL line — this is Test B's actual gate result, not a unit test; if it prints FAIL, do not proceed to Phase C (per spec) — instead return to Task 3/6/7's scoring/compliance constants and retune

- [ ] **Step 3: Commit**

```bash
git add scripts/validation-gate-sim.ts
git commit -m "feat(scripts): add validation-gate harness for spec Test B (manual vs Auto-Coach win rate)"
```

---

## Task 15: Extend the harness for Test D (Comeback) and print a Test A/C checklist reminder

**Files:**
- Modify: `scripts/validation-gate-sim.ts`

**Interfaces:**
- Consumes: everything from Task 14, plus `selectTell` (Task 4) for a tell-frequency sanity print (Test A proxy — the real Test A is a human "did I say BAIT out loud" check, not automatable, so this only prints supporting data)

- [ ] **Step 1: Add a Test D trace — does a single trial show a believable comeback chain, not just an aggregate win rate?**

Append to `scripts/validation-gate-sim.ts`:

```typescript
/**
 * Test D (spec): a legible chain — opponent overcommits, weaker fighter's
 * momentum swings, fight becomes genuinely competitive — not a coinflip and
 * not a guaranteed "press WAIT, magically win." This traces one manual-coach
 * trial's log and reports whether the weaker fighter was ever VULNERABLE/
 * DISADVANTAGE before ending the fight ADVANTAGE/DOMINANT or winning outright.
 */
function traceComeback(seed: number): void {
  const weaker = buildFighter("counter", "Weaker", 55, 30);
  const stronger = buildFighter("aggressive", "Stronger", 80, 60);
  const result = simulateBattle(weaker, stronger, seededRng(seed), { coachA: readerCoach, coachB: autoCoachPolicy() });
  const weakerWasBehind = result.log.some(
    (e) => (e.attackerId === weaker.id ? e.attackerState : e.defenderState) === undefined
  );
  const won = result.winnerId === weaker.id;
  console.log(`Test D trace (seed ${seed}): weaker fighter won = ${won}, total turns = ${result.totalTurns}`);
  console.log(won ? "  -> supports a believable comeback path; inspect the log manually for the full chain" : "  -> no comeback this seed; try other seeds before concluding Test D fails");
}

traceComeback(2000);
traceComeback(2001);
traceComeback(2002);

console.log("\nTest A (Reading) and Test C (Physical identity) are not automated by this script:");
console.log("  Test A — run the app manually, watch a fight with tells enabled, and check whether you predict the AI's intent before it resolves.");
console.log("  Test C — already checkable via scripts/balance-sim.ts against resolvePhysicalProfile() outputs; run it with a massive vs a long-legged same-style pair and confirm the action-mix differs, not just the numbers.");
```

Note: the `weakerWasBehind` expression above references `attackerState`/`defenderState`, which are `CombatContextState` values (not objects) on `CombatLogEntry` — fix this check to compare against the string values directly:

```typescript
  const weakerWasBehind = result.log.some((e) => {
    const weakerIsAttacker = e.attackerId === weaker.id;
    const weakerState = weakerIsAttacker ? e.attackerState : e.defenderState;
    return weakerState === "VULNERABLE" || weakerState === "DISADVANTAGE";
  });
```

(replace the earlier broken expression with this corrected one before committing — this is a self-review catch, not a separate step).

- [ ] **Step 2: Run it**

Run: `node --import ./scripts/test-ts-loader.mjs scripts/validation-gate-sim.ts`
Expected: prints Test B's win rates, 3 Test D traces, and the Test A/C reminder lines with no runtime errors

- [ ] **Step 3: Commit**

```bash
git add scripts/validation-gate-sim.ts
git commit -m "feat(scripts): extend validation-gate harness with Test D comeback trace + Test A/C reminders"
```

---

## Self-Review Notes (already applied above, recorded per writing-plans skill)

- **Spec coverage:** Phase A's 3 identity axes → Task 1; StylePolicy → Task 2; ActionScoring extension (style + physical cost) → Task 3; A.5 tells → Tasks 4-5; imperfect compliance → Tasks 6-7. Phase B's momentum → Task 8-9; mental state → Task 9; CombatInactivity/FORCE_ENGAGEMENT → Task 10; momentum-to-hitstop juice → Task 11. Validation gate's CP regen/coach hook → Task 12; Auto-Coach → Task 13; Test B/D measurement → Tasks 14-15. Test C is explicitly spec'd as already checkable via existing code + `balance-sim.ts`, so it has no dedicated build task, only a reminder in Task 15. Test A is explicitly a human judgment call in the spec, so it has no automated task either.
- **Placeholder scan:** no task contains "TBD"/"handle edge cases" — Task 9's `recentExchangeResult` gap and Task 11's manual-smoke-check are both named explicitly with a stated reason, not silently deferred.
- **Type consistency:** `CombatIdentity` (Task 1) is used identically in Tasks 4, 6, 7, 9. `PlayerCommand` (Task 6) is used identically in Tasks 7, 10, 12, 13. `CoachFn`/`CoachObservation` (Task 12) are used identically in Tasks 13, 14, 15. `DecisionContext`'s new fields (`style`, `physical`, `opponentContextState` from Task 3; `pendingCommand` from Task 7; `noDamageStreak` from Task 10) are all populated together in the single `simulator.ts` edit site described across those tasks — an executor should apply all of them to the same two object literals rather than treating each task's `simulator.ts` edit as fully independent of the others.

---

## Execution Handoff

Plan complete, saved to `docs/superpowers/plans/2026-09-09-strategy-fighter-phase-ab.md`. Two execution options:

**1. Subagent-Driven (recommended)** — dispatch a fresh subagent per task, review each task's diff before moving on, fast iteration.

**2. Inline Execution** — execute tasks in this session via `superpowers:executing-plans`, batch execution with checkpoints.

Which approach?
