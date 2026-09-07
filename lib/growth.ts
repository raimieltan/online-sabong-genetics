import { GROWTH_STAGES, type GrowthStage } from "./types";

const TRAINABLE_STAGES: readonly GrowthStage[] = ["young_adult", "adult", "prime", "senior"];
const BREEDABLE_STAGES: readonly GrowthStage[] = ["adult", "prime", "senior", "retired"];

/**
 * Continuous developmental multiplier (V2 lifecycle spec §3-8): IV/EV stay
 * immutable genetic potential — growth determines how much of that potential
 * is physically realized yet. Applied at effectiveStat(), never to stored
 * iv/ev. Prime is the ceiling (1.0); decline tapers gradually rather than
 * cratering (spec §22 — a veteran keeps most of its physical capability).
 */
const GROWTH_FACTOR: Record<GrowthStage, number> = {
  chick: 0.35,
  juvenile: 0.55,
  young_adult: 0.8,
  adult: 0.95,
  prime: 1.0,
  senior: 0.85,
  retired: 0.7,
};

export function growthFactor(stage: GrowthStage): number {
  return GROWTH_FACTOR[stage] ?? 1;
}

export function nextGrowthStage(stage: GrowthStage): GrowthStage {
  const index = GROWTH_STAGES.indexOf(stage);
  if (index === -1 || index >= GROWTH_STAGES.length - 2) return stage;
  return GROWTH_STAGES[index + 1];
}

export function canAgeUp(stage: GrowthStage): boolean {
  return stage !== "senior" && stage !== "retired";
}

export function canRetire(stage: GrowthStage): boolean {
  return stage === "senior";
}

export function canTrain(stage: GrowthStage): boolean {
  return TRAINABLE_STAGES.includes(stage);
}

export function canBattle(stage: GrowthStage): boolean {
  return TRAINABLE_STAGES.includes(stage);
}

export function canBreed(stage: GrowthStage): boolean {
  return BREEDABLE_STAGES.includes(stage);
}
