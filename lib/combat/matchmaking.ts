import { generateRandomChicken, randomStatBlock } from "../chickenGenerator";
import { GENETIC_STAT_KEYS, type Chicken } from "../types";
import { effectiveStat } from "./stats";
import { withNpcAwakening } from "./evolution";

const MATCH_TOLERANCE = 0.2; // ±20% of the player chicken's total effective stats
const MATCH_ATTEMPTS = 20;

// NPC opponents must be generated as battle-ready, plausibly-trained birds —
// not freshly-hatched chicks — or their effective stats are capped so far
// below a trained player's that no amount of tier scaling can close the gap
// (a chick's 0.35 growth factor + zero EV caps every stat around ~20, even
// at max IV). "adult" gives a near-ceiling growth factor and a rolled EV
// block simulates whatever training this NPC has "already done" so the
// ±20%-tolerance match in `generateMatchedOpponent` can actually be met at
// every tier, including champion.
const NPC_GROWTH_STAGE = "adult";
const NPC_MAX_EV = 100;

/**
 * Default NPC generator: a battle-ready adult with a rolled EV block (see the
 * comment above). Exported so other opponent generators (e.g. PvE encounters)
 * match `generateMatchedOpponent`'s default instead of falling back to
 * freshly-hatched, zero-EV chicks that can never reach a matched target.
 */
export function battleReadyNpcGenerator(): Chicken {
  return generateRandomChicken({
    sex: "rooster",
    growthStage: NPC_GROWTH_STAGE,
    ev: randomStatBlock(0, NPC_MAX_EV),
  });
}

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
  generator: () => Chicken = battleReadyNpcGenerator,
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
      return withNpcAwakening(candidate);
    }

    const diff = Math.abs(candidateTotal - targetTotal);
    if (diff < closestDiff) {
      closest = candidate;
      closestDiff = diff;
    }
  }

  return withNpcAwakening(closest ?? generator());
}
