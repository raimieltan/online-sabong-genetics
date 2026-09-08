/** How long the betting window stays open before a /live matchup locks and fights. */
export const BETTING_WINDOW_MS = 30_000;

/** Preset bet chips shown in the betting UI, sized to this game's economy
 * (STARTING_CREDITS = 1000, a win nets 25) rather than the six-figure pool
 * numbers real sabong apps show. */
export const BET_PRESETS = [25, 100, 250] as const;

export type BetSide = "A" | "B";

/** `amount * oddsX`, rounded to the nearest credit — the total returned to
 * the player on a winning bet (stake + profit), same convention as the
 * `oddsA`/`oddsB` multipliers from lib/live/odds.ts. */
export function calculatePayout(amount: number, odds: number): number {
  return Math.round(amount * odds);
}
