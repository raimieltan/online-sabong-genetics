import { generateMatchedOpponent, simulateFight } from "./combat";
import type { Chicken, CombatResult } from "./types";

/**
 * Single-elimination bracket size (spec §31 lists 8/16/32/64 — 8 keeps a
 * full run fast enough to resolve in one request for the MVP).
 */
export const TOURNAMENT_SIZE = 8;

/** Tournament Tokens awarded by placement — a separate, non-purchasable currency (see lib/economy.ts). */
export const PRIZE_TOKENS: Record<1 | 2 | 3, number> = {
  1: 1000,
  2: 500,
  3: 250,
};

export type TournamentPlacement = 1 | 2 | 3 | null;

export type TournamentResult = {
  /** One CombatResult per match the player's chicken fought, in order. */
  matches: CombatResult[];
  /** The opponent Chicken faced in each match, parallel to `matches`. */
  opponentsFought: Chicken[];
  placement: TournamentPlacement;
  tokensAwarded: number;
};

/** Builds a full bracket: the player's chicken plus TOURNAMENT_SIZE - 1 matched NPC opponents. */
export function generateBracketOpponents(
  playerChicken: Chicken,
  generator?: () => Chicken,
): Chicken[] {
  return Array.from({ length: TOURNAMENT_SIZE - 1 }, () =>
    generateMatchedOpponent(playerChicken, generator),
  );
}

/**
 * Runs a single-elimination bracket for `playerChicken` against `opponents`
 * (must have TOURNAMENT_SIZE - 1 entries). Other bracket slots are resolved
 * with a coin-flip stand-in (their outcome doesn't affect the player and a
 * full field simulation isn't needed to determine the player's run).
 * Placement: 1 = won the final, 2 = lost the final, 3 = lost the semifinal,
 * null = eliminated earlier.
 */
export function runTournament(
  playerChicken: Chicken,
  opponents: Chicken[],
  fight: (a: Chicken, b: Chicken) => CombatResult = (a, b) => simulateFight(a, b),
): TournamentResult {
  if (opponents.length !== TOURNAMENT_SIZE - 1) {
    throw new Error(`runTournament requires exactly ${TOURNAMENT_SIZE - 1} opponents`);
  }

  const rounds = Math.log2(TOURNAMENT_SIZE);
  const matches: CombatResult[] = [];
  const opponentsFought: Chicken[] = [];
  const current = playerChicken;
  const opponentPool = [...opponents];

  for (let round = 0; round < rounds; round++) {
    const opponent = opponentPool.pop()!;
    const result = fight(current, opponent);
    matches.push(result);
    opponentsFought.push(opponent);

    if (result.winnerId !== current.id) {
      const placement: TournamentPlacement =
        round === rounds - 1 ? 2 : round === rounds - 2 ? 3 : null;
      return { matches, opponentsFought, placement, tokensAwarded: placement ? PRIZE_TOKENS[placement] : 0 };
    }

    if (round === rounds - 1) {
      return { matches, opponentsFought, placement: 1, tokensAwarded: PRIZE_TOKENS[1] };
    }
  }

  return { matches, opponentsFought, placement: null, tokensAwarded: 0 };
}
