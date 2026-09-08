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
