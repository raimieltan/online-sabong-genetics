import { GROWTH_STAGES, type GrowthStage } from "./types";

const TRAINABLE_STAGES: readonly GrowthStage[] = ["young_adult", "adult", "prime", "senior"];
const BREEDABLE_STAGES: readonly GrowthStage[] = ["adult", "prime", "senior", "retired"];

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
