import type { Chicken, GeneticStatKey, StatBlock } from "./types";

export const EV_PER_TRAIN = 5;
export const ENERGY_PER_TRAIN = 10;
export const MAX_EV = 100;
export const MAX_ENERGY = 100;

export function canAffordTraining(energy: number): boolean {
  return energy >= ENERGY_PER_TRAIN;
}

export function trainStat(
  chicken: Chicken,
  stat: GeneticStatKey,
): { ev: StatBlock; energy: number } {
  const ev: StatBlock = { ...chicken.ev, [stat]: Math.min(MAX_EV, chicken.ev[stat] + EV_PER_TRAIN) };
  const energy = Math.max(0, chicken.energy - ENERGY_PER_TRAIN);
  return { ev, energy };
}

export function restEnergy(): { energy: number } {
  return { energy: MAX_ENERGY };
}
