import { trainingEffectiveness } from "./limits";
import type { GeneticStatKey, StatBlock, TrainingCategory } from "../types";

/** Which GeneticStatKey a TrainingCategory primarily develops (V2 spec §22). */
export const CATEGORY_PRIMARY_STAT: Record<TrainingCategory, GeneticStatKey> = {
  strength: "power",
  speed: "speed",
  agility: "agility",
  defense: "defense",
  stamina: "stamina",
  technique: "accuracy",
  recovery: "stamina",
  discipline: "accuracy",
};

/** Legacy mapping retained for callers; V3 uses opportunity cost and temporary readiness load. */
export const CATEGORY_TRADEOFF_STAT: Partial<Record<TrainingCategory, GeneticStatKey>> = {
  strength: "stamina",
  speed: "power",
  agility: "power",
  stamina: "speed",
};

const MAX_EV = 100;

/**
 * Applies one training session's EV gain, run through the diminishing-
 * returns curve. Ordinary training never deletes permanent EV.
 */
export function applyDevelopment(params: {
  ev: StatBlock;
  category: TrainingCategory;
  baseGain: number;
  trainingFatigue: number;
  /** Career life-stage penalty (V2 spec §22: decline reduces training efficiency). Defaults to full effectiveness. */
  lifeStageMultiplier?: number;
}): StatBlock {
  const { ev, category, baseGain, trainingFatigue, lifeStageMultiplier = 1 } = params;
  const effectiveness = trainingEffectiveness(trainingFatigue) * lifeStageMultiplier;
  const primary = CATEGORY_PRIMARY_STAT[category];

  const next: StatBlock = { ...ev };
  next[primary] = Math.min(MAX_EV, next[primary] + baseGain * effectiveness);
  return next;
}
