import type { RoosterTrainingState, TrainingCategory, XpPool } from "../types";

export const XP_PER_SESSION = 10;

/** Which XpPool(s) a TrainingCategory feeds (design spec: Mechanics > XP pools). */
export const XP_POOLS_BY_CATEGORY: Record<TrainingCategory, XpPool[]> = {
  strength: ["physicalXP"],
  agility: ["physicalXP"],
  stamina: ["physicalXP"],
  speed: ["physicalXP", "combatXP"],
  technique: ["combatXP"],
  defense: ["combatXP"],
  discipline: ["tacticalXP"],
  recovery: ["recoveryXP"],
};

/** Credits XP_PER_SESSION to every pool a training category feeds; pools are uncapped lifetime counters. */
export function creditXp(state: RoosterTrainingState, category: TrainingCategory): RoosterTrainingState {
  const next = { ...state };
  for (const pool of XP_POOLS_BY_CATEGORY[category]) {
    next[pool] = next[pool] + XP_PER_SESSION;
  }
  return next;
}
