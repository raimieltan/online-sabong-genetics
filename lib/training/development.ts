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

/** A small opposite-direction EV nudge — training one thing costs another (spec §24 tradeoffs). */
export const CATEGORY_TRADEOFF_STAT: Partial<Record<TrainingCategory, GeneticStatKey>> = {
  strength: "stamina",
  speed: "power",
  agility: "power",
  stamina: "speed",
};

const MAX_EV = 100;

/**
 * Applies one training session's EV gain, run through the diminishing-
 * returns curve and the category's tradeoff cost (spec §24-25) — never a
 * flat +N across every stat with no downside.
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
  const tradeoff = CATEGORY_TRADEOFF_STAT[category];

  const next: StatBlock = { ...ev };
  next[primary] = Math.min(MAX_EV, next[primary] + baseGain * effectiveness);
  if (tradeoff) {
    next[tradeoff] = Math.max(0, next[tradeoff] - baseGain * effectiveness * 0.2);
  }
  return next;
}
