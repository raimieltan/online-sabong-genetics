import type { CombatContextState, CombatDistance } from "../types";

export const POSITION_MIN = -2;
export const POSITION_MAX = 2;

export function clampPosition(value: number): number {
  return Math.min(POSITION_MAX, Math.max(POSITION_MIN, Math.round(value)));
}

const DISTANCE_ORDER: readonly CombatDistance[] = ["CLOSE", "MID", "FAR"];

/** Shifts distance by `steps` (positive closes in, negative opens up) — abstract server state per spec §7. */
export function shiftDistance(current: CombatDistance, steps: number): CombatDistance {
  const idx = DISTANCE_ORDER.indexOf(current);
  const next = Math.min(DISTANCE_ORDER.length - 1, Math.max(0, idx - Math.sign(steps)));
  return DISTANCE_ORDER[next];
}

/**
 * Derives the contextual combat state a fighter is in right now (spec §8) —
 * read by both the behavior scorer and the 3D presentation layer's camera
 * cues, never computed twice with different rules.
 */
export function deriveContextState(params: {
  position: number;
  momentum: number;
  fatigue: number;
  staggerTurns: number;
  recoveryTurns: number;
  staminaRatio: number;
}): CombatContextState {
  const { position, momentum, fatigue, staggerTurns, recoveryTurns, staminaRatio } = params;

  if (staggerTurns > 0) return "STAGGERED";
  if (recoveryTurns > 0) return "RECOVERING";
  if (fatigue >= 75 || staminaRatio <= 0.15) return "EXHAUSTED";
  if (position <= -2 || (position < 0 && momentum <= -30)) return "VULNERABLE";
  if (position >= 2 && momentum >= 30) return "DOMINANT";
  if (momentum >= 25) return "PRESSURING";
  if (momentum <= -25) return "PRESSURED";
  if (position > 0) return "ADVANTAGE";
  if (position < 0) return "DISADVANTAGE";
  return "NEUTRAL";
}
