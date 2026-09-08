import { simulateFight } from "@/lib/combat";
import type { Chicken } from "@/lib/types";

/** Bettors always take a discount to the "true" odds — the house's cut. */
const HOUSE_EDGE = 0.08;

/** No side is ever priced as a lock (min payout) or a sure loser (implausible payout). */
const MIN_WIN_PROB = 0.03;
const MAX_WIN_PROB = 0.97;
const MIN_ODDS = 1.05;

export type LiveOdds = { oddsA: number; oddsB: number };

/**
 * Estimates each side's win probability by sampling the real combat sim
 * (not a separate balance formula, so odds never drift from how fights
 * actually resolve), then converts it into a decimal payout multiplier
 * with a house edge — favorites pay close to even money, underdogs pay
 * out big, same shape as real-world fixed-odds sabong boards.
 */
export function estimateOdds(chickenA: Chicken, chickenB: Chicken, samples = 40): LiveOdds {
  let winsA = 0;
  for (let i = 0; i < samples; i++) {
    const result = simulateFight(chickenA, chickenB);
    if (result.winnerId === chickenA.id) winsA++;
  }

  const probA = clamp(winsA / samples, MIN_WIN_PROB, MAX_WIN_PROB);
  const probB = 1 - probA;

  return {
    oddsA: toOdds(probA),
    oddsB: toOdds(probB),
  };
}

function toOdds(winProb: number): number {
  const raw = (1 - HOUSE_EDGE) / winProb;
  return Math.round(Math.max(MIN_ODDS, raw) * 100) / 100;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
