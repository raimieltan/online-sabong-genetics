import { ACTION_DEFINITIONS } from "./actions";
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

export type Rng = () => number;

/**
 * Base decision tendencies per fightingStyle (V2 spec §17: Glass Cannon /
 * Counter Fighter / Survivor / Pressure Fighter map onto the existing
 * aggressive/counter/endurance/balanced styles). These are starting points —
 * traits nudge them, and lib/combat/experience.ts's battle history can drift
 * them further over a career.
 */
export const ARCHETYPE_PROFILES: Record<FightingStyle, BehavioralProfile> = {
  aggressive: {
    aggression: 0.85,
    caution: 0.15,
    patience: 0.2,
    riskTolerance: 0.8,
    pressurePreference: 0.5,
    counterPreference: 0.1,
    recoveryPreference: 0.15,
    persistence: 0.3,
  },
  counter: {
    aggression: 0.35,
    caution: 0.75,
    patience: 0.8,
    riskTolerance: 0.45,
    pressurePreference: 0.2,
    counterPreference: 0.85,
    recoveryPreference: 0.35,
    persistence: 0.55,
  },
  endurance: {
    aggression: 0.3,
    caution: 0.7,
    patience: 0.75,
    riskTolerance: 0.25,
    pressurePreference: 0.3,
    counterPreference: 0.3,
    recoveryPreference: 0.75,
    persistence: 0.85,
  },
  balanced: {
    aggression: 0.55,
    caution: 0.45,
    patience: 0.5,
    riskTolerance: 0.5,
    pressurePreference: 0.55,
    counterPreference: 0.4,
    recoveryPreference: 0.4,
    persistence: 0.5,
  },
};

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function hasTrait(traits: readonly Trait[], id: string): boolean {
  return traits.some((t) => t.id === id);
}

/**
 * Starting BehavioralProfile from fightingStyle, nudged by traits (spec §16:
 * "can be influenced by genetics, training, repeated battle behavior, career
 * experience" — this covers the genetics/traits half; battle-history drift
 * lives in lib/combat/experience.ts, training influence in lib/training/).
 */
export function deriveBehaviorProfile(fightingStyle: FightingStyle, traits: readonly Trait[]): BehavioralProfile {
  const base = { ...ARCHETYPE_PROFILES[fightingStyle] };
  if (hasTrait(traits, "heavy-striker")) base.aggression = clamp01(base.aggression + 0.1);
  if (hasTrait(traits, "counter-fighter")) base.counterPreference = clamp01(base.counterPreference + 0.15);
  if (hasTrait(traits, "survivor")) base.persistence = clamp01(base.persistence + 0.15);
  if (hasTrait(traits, "calm")) base.riskTolerance = clamp01(base.riskTolerance - 0.1);
  if (hasTrait(traits, "quick-starter")) base.aggression = clamp01(base.aggression + 0.05);
  if (hasTrait(traits, "glass-cannon")) {
    base.riskTolerance = clamp01(base.riskTolerance + 0.2);
    base.caution = clamp01(base.caution - 0.15);
  }
  if (hasTrait(traits, "iron-stamina")) base.recoveryPreference = clamp01(base.recoveryPreference - 0.1);
  return base;
}

/**
 * A career should drift a rooster's tendencies toward however it actually
 * fights (spec §16) — small nudges toward whichever experience categories
 * are highest, capped so no amount of battles turns a style inside out.
 */
export function driftBehaviorProfile(profile: BehavioralProfile, experience: CombatExperience): BehavioralProfile {
  const drift = 0.02;
  const total = Object.values(experience).reduce((s, v) => s + v, 0) || 1;
  const counterShare = experience.counter / total;
  const recoveryShare = experience.recovery / total;
  const pressureShare = experience.pressure / total;
  const offensiveShare = experience.offensive / total;
  return {
    ...profile,
    counterPreference: clamp01(profile.counterPreference + (counterShare - 0.14) * drift),
    recoveryPreference: clamp01(profile.recoveryPreference + (recoveryShare - 0.14) * drift),
    pressurePreference: clamp01(profile.pressurePreference + (pressureShare - 0.14) * drift),
    aggression: clamp01(profile.aggression + (offensiveShare - 0.14) * drift),
  };
}

export type DecisionContext = {
  stamina: number;
  maxStamina: number;
  fatigue: number;
  momentum: number;
  position: number;
  distance: CombatDistance;
  contextState: CombatContextState;
  experience: CombatExperience;
  opponentModel: OpponentModel;
  rng: Rng;
};

/**
 * Weighted action scoring (V2 spec §18): no hardcoded "if archetype === X"
 * branch — every legal action gets a score from behavioral preference, board
 * state, matchup/opponent read, experience, momentum, position, minus cost
 * and risk, plus a small seeded-random nudge for variation.
 */
export function scoreAction(profile: BehavioralProfile, action: CombatAction, ctx: DecisionContext): number {
  const def = ACTION_DEFINITIONS[action];
  let score = 0;

  switch (action) {
    case "LIGHT_ATTACK":
      score += profile.aggression * 0.6 + (1 - profile.caution) * 0.2;
      break;
    case "HEAVY_ATTACK":
      score += profile.aggression * profile.riskTolerance * 1.1;
      break;
    case "PRESSURE":
      score += profile.pressurePreference * 0.9;
      break;
    case "EVADE":
      score += profile.caution * 0.6 + (1 - profile.riskTolerance) * 0.3;
      break;
    case "COUNTER":
      score += profile.counterPreference * 0.9 + ctx.experience.counter / 400;
      break;
    case "GUARD":
      score += profile.caution * 0.5;
      break;
    case "RECOVER":
      score += profile.recoveryPreference * 0.8;
      break;
    case "REPOSITION":
      score += (profile.caution + profile.patience) * 0.3;
      break;
  }

  const fatigueRatio = ctx.fatigue / 100;
  if (action === "HEAVY_ATTACK" || action === "PRESSURE") score -= fatigueRatio * 0.8;
  if (action === "RECOVER") score += fatigueRatio;
  if (ctx.stamina < ctx.maxStamina * 0.25 && action === "HEAVY_ATTACK") score -= 0.5;

  if (ctx.contextState === "STAGGERED" && (action === "GUARD" || action === "RECOVER")) score += 0.6;
  if (ctx.contextState === "EXHAUSTED" && action === "RECOVER") score += 0.4;
  if (ctx.contextState === "VULNERABLE" && action === "GUARD") score += 0.3;

  const momentumRatio = ctx.momentum / 100;
  if (momentumRatio > 0.2 && (action === "PRESSURE" || action === "HEAVY_ATTACK")) score += momentumRatio * 0.4;
  if (momentumRatio < -0.2 && (action === "GUARD" || action === "EVADE" || action === "REPOSITION"))
    score += -momentumRatio * 0.4;

  if (ctx.position < 0 && (action === "REPOSITION" || action === "EVADE")) score += (-ctx.position / 2) * 0.5;
  if (ctx.position > 0 && (action === "PRESSURE" || action === "HEAVY_ATTACK")) score += (ctx.position / 2) * 0.4;

  if (action === "COUNTER") {
    score += ctx.opponentModel.aggressionRead * 0.3;
    const recentHeavies = ctx.opponentModel.recentActions.filter((a) => a === "HEAVY_ATTACK").length;
    if (recentHeavies >= 2) score += Math.min(0.5, ctx.experience.adaptation / 200);
  }

  score -= (def.staminaCost > 0 ? def.staminaCost / ctx.maxStamina : 0) * 0.5;
  score -= def.commitment * (1 - profile.riskTolerance) * 0.4;

  score += (ctx.rng() - 0.5) * 0.3;

  return score;
}

/** Picks the highest-scoring legal action (ties broken by array order, which is stable given `rng`'s nudge). */
export function chooseAction(profile: BehavioralProfile, legal: readonly CombatAction[], ctx: DecisionContext): CombatAction {
  let best: CombatAction = legal[0];
  let bestScore = -Infinity;
  for (const action of legal) {
    const s = scoreAction(profile, action, ctx);
    if (s > bestScore) {
      bestScore = s;
      best = action;
    }
  }
  return best;
}
