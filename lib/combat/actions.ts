import type { CombatAction, CombatActionDefinition } from "../types";

/**
 * The 8-action set from the V2 spec §11-12. `staminaCost` is negative for
 * RECOVER (it restores rather than spends); `commitment`/`recovery` gate how
 * exploitable a choice is once made, `damagePotential`/`staggerPotential` are
 * multipliers against the LIGHT_ATTACK baseline of 1.0, `positionalEffect` is
 * the abstract position/distance shift the action creates when it lands.
 */
export const ACTION_DEFINITIONS: Record<CombatAction, CombatActionDefinition> = {
  LIGHT_ATTACK: {
    id: "LIGHT_ATTACK",
    staminaCost: 8,
    commitment: 0.25,
    recovery: 0,
    damagePotential: 0.72,
    staggerPotential: 0.7,
    positionalEffect: 0.3,
    baseDurationMs: 700,
  },
  HEAVY_ATTACK: {
    id: "HEAVY_ATTACK",
    staminaCost: 18,
    commitment: 0.85,
    recovery: 2,
    damagePotential: 1.6,
    staggerPotential: 1.5,
    positionalEffect: 0.5,
    baseDurationMs: 1500,
  },
  PRESSURE: {
    id: "PRESSURE",
    staminaCost: 12,
    commitment: 0.5,
    recovery: 0,
    damagePotential: 0.7,
    staggerPotential: 0.5,
    positionalEffect: 1.1,
    baseDurationMs: 950,
  },
  EVADE: {
    id: "EVADE",
    staminaCost: 6,
    commitment: 0.15,
    recovery: 0,
    damagePotential: 0,
    staggerPotential: 0,
    positionalEffect: 0.6,
    baseDurationMs: 550,
  },
  COUNTER: {
    id: "COUNTER",
    staminaCost: 10,
    commitment: 0.35,
    recovery: 1,
    damagePotential: 1.25,
    staggerPotential: 1.0,
    positionalEffect: 0.5,
    baseDurationMs: 850,
  },
  GUARD: {
    id: "GUARD",
    staminaCost: 4,
    commitment: 0.1,
    recovery: 0,
    damagePotential: 0,
    staggerPotential: 0,
    positionalEffect: -0.2,
    baseDurationMs: 500,
  },
  RECOVER: {
    id: "RECOVER",
    staminaCost: -22,
    commitment: 0.1,
    recovery: 0,
    damagePotential: 0,
    staggerPotential: 0,
    positionalEffect: -0.5,
    baseDurationMs: 1100,
  },
  REPOSITION: {
    id: "REPOSITION",
    staminaCost: 5,
    commitment: 0.2,
    recovery: 0,
    damagePotential: 0,
    staggerPotential: 0,
    positionalEffect: 1.6,
    baseDurationMs: 800,
  },
};

const ALL_ACTIONS: readonly CombatAction[] = [
  "LIGHT_ATTACK",
  "HEAVY_ATTACK",
  "PRESSURE",
  "EVADE",
  "COUNTER",
  "GUARD",
  "RECOVER",
  "REPOSITION",
];

/** Low-commitment-only options, used while staggered or mid-recovery-window (spec §40-41). */
const LOW_COMMITMENT_ACTIONS: readonly CombatAction[] = ["GUARD", "RECOVER"];

/**
 * The legal action set for a fighter right now — staggered fighters can only
 * brace or recover, a fighter still in a heavy attack's recovery window loses
 * access to further high-commitment options, and anything costing more
 * stamina than is available (RECOVER's negative cost always passes) drops out.
 */
export function legalActions(stamina: number, staggerTurns: number, recoveryTurns: number): CombatAction[] {
  if (staggerTurns > 0) return [...LOW_COMMITMENT_ACTIONS];

  let candidates = recoveryTurns > 0 ? ALL_ACTIONS.filter((a) => ACTION_DEFINITIONS[a].commitment <= 0.4) : ALL_ACTIONS;
  candidates = candidates.filter((a) => stamina >= Math.max(0, ACTION_DEFINITIONS[a].staminaCost));

  return candidates.length > 0 ? [...candidates] : ["GUARD"];
}
