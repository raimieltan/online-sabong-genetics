import { generateRandomChicken } from "../chickenGenerator";
import { GENETIC_STAT_KEYS, type Chicken } from "../types";
import { effectiveStat } from "./stats";

const MATCH_TOLERANCE = 0.2; // ±20% of the player chicken's total effective stats
const MATCH_ATTEMPTS = 20;

function totalEffectiveStats(chicken: Chicken): number {
  return GENETIC_STAT_KEYS.reduce((sum, key) => sum + effectiveStat(chicken, key), 0);
}

/**
 * Generates an NPC opponent, not persisted, roughly matched to `playerChicken`'s
 * total effective stats. Tries several random candidates for one inside the
 * tolerance band; falls back to the closest candidate seen if none land in it.
 *
 * `statMultiplier` shifts the target band above or below the player's own
 * stats (e.g. tournament tiers harder than "rookie") without changing the
 * ±20% tolerance around that shifted target.
 */
export function generateMatchedOpponent(
  playerChicken: Chicken,
  generator: () => Chicken = () => generateRandomChicken({ sex: "rooster" }),
  statMultiplier = 1
): Chicken {
  const targetTotal = totalEffectiveStats(playerChicken) * statMultiplier;
  const minTotal = targetTotal * (1 - MATCH_TOLERANCE);
  const maxTotal = targetTotal * (1 + MATCH_TOLERANCE);

  let closest: Chicken | null = null;
  let closestDiff = Infinity;

  for (let i = 0; i < MATCH_ATTEMPTS; i++) {
    const candidate = generator();
    const candidateTotal = totalEffectiveStats(candidate);

    if (candidateTotal >= minTotal && candidateTotal <= maxTotal) {
      return candidate;
    }

    const diff = Math.abs(candidateTotal - targetTotal);
    if (diff < closestDiff) {
      closest = candidate;
      closestDiff = diff;
    }
  }

  return closest ?? generator();
}
