import { RARITY_ORDER, topRarity } from "./rarity";
import type { Chicken } from "./types";

/**
 * Suggested Battle Credits value for a chicken, per the mechanics spec's
 * Chicken Valuation factors (§40): genetics, traits, record/championships,
 * and age/growth stage. Offspring count and live market demand are not
 * tracked yet, so they're omitted for now.
 */
export function chickenValue(chicken: Chicken): number {
  const ivTotal = Object.values(chicken.iv).reduce((sum, v) => sum + v, 0);
  const geneticsValue = ivTotal * 2;

  const raritySeverity = RARITY_ORDER.indexOf(topRarity(chicken.traits));
  const traitValue = raritySeverity * 150 + chicken.traits.length * 20;

  const recordValue =
    chicken.record.wins * 15 + chicken.record.championships * 500 + chicken.record.koTko * 10;

  const growthMultiplier = chicken.growthStage === "chick" ? 0.4 : chicken.growthStage === "juvenile" ? 0.7 : 1;

  const value = (100 + geneticsValue + traitValue + recordValue) * growthMultiplier;
  return Math.max(50, Math.round(value));
}
