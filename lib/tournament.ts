import { applyFightOutcome, generateMatchedOpponent, simulateFight } from "./combat";
import type { Chicken, CombatResult } from "./types";

/** Single-elimination bracket sizes offered to the player (spec §31). */
export const TOURNAMENT_SIZES = [8, 16, 32] as const;
export type TournamentSize = (typeof TOURNAMENT_SIZES)[number];

export const TOURNAMENT_TIERS = ["beginner", "rookie", "veteran", "champion"] as const;
export type TournamentTier = (typeof TOURNAMENT_TIERS)[number];

export const TIER_LABELS: Record<TournamentTier, string> = {
  beginner: "Beginner",
  rookie: "Rookie",
  veteran: "Veteran",
  champion: "Champion",
};

/**
 * The circuit is deliberately defined in game code rather than being a free
 * form size/difficulty picker.  A run still stores the latter two values for
 * backwards-compatible persistence, while this catalogue supplies the event
 * language, rules, and entry requirements used by the UI and API.
 */
export type TournamentDefinition = {
  id: string;
  name: string;
  circuit: "Local" | "Regional" | "Major" | "National" | "Elite";
  bracketSize: TournamentSize;
  tier: TournamentTier;
  entryFee: number;
  championPrize: number;
  qualification?: string;
  rules: readonly string[];
};

export const TOURNAMENT_DEFINITIONS: readonly TournamentDefinition[] = [
  {
    id: "barangay-open", name: "Barangay Open", circuit: "Local", bracketSize: 8, tier: "beginner", entryFee: 0, championPrize: 1000,
    rules: ["Single elimination", "Condition carries between rounds", "One registered fighter"],
  },
  {
    id: "iloilo-open", name: "Iloilo Open", circuit: "Local", bracketSize: 8, tier: "rookie", entryFee: 0, championPrize: 3000,
    rules: ["Single elimination", "Injuries persist", "One registered fighter"],
  },
  {
    id: "panay-invitational", name: "Panay Invitational", circuit: "Regional", bracketSize: 16, tier: "veteran", entryFee: 0, championPrize: 10000,
    rules: ["Single elimination", "Condition carries between rounds", "Injuries persist"],
  },
  {
    id: "philippine-championship", name: "Philippine Championship", circuit: "National", bracketSize: 32, tier: "champion", entryFee: 0, championPrize: 64000,
    rules: ["Single elimination", "Condition carries between rounds", "Injuries persist"],
  },
] as const;

export function tournamentDefinitionFor(size: TournamentSize, tier: TournamentTier): TournamentDefinition {
  return TOURNAMENT_DEFINITIONS.find((event) => event.bracketSize === size && event.tier === tier)
    ?? TOURNAMENT_DEFINITIONS[0];
}

export function getTournamentDefinition(id: string): TournamentDefinition | undefined {
  return TOURNAMENT_DEFINITIONS.find((event) => event.id === id);
}

/**
 * NPC total-effective-stat target as a multiplier of the player chicken's own
 * total (fed to `generateMatchedOpponent`). Calibrated against simulated
 * single-fight win rates (not just raw stat parity) because a bracket needs
 * several *consecutive* wins: at 1.0x a fight is a near-even coin flip
 * (~50% win rate), which only clears an 8-bracket ~13% of the time — brutal
 * for a tier meant to be an accessible early rung. These values target
 * roughly 73%/66%/50%/44% single-fight win rates for beginner/rookie/
 * veteran/champion respectively, so the tiers actually ramp in felt
 * difficulty across a full bracket.
 */
export const TIER_STAT_MULTIPLIER: Record<TournamentTier, number> = {
  beginner: 0.55,
  rookie: 0.75,
  veteran: 0.95,
  champion: 1.15,
};

/** Variation around an event's advertised tier. A field therefore contains
 * credible underdogs, the main pack, and a few dangerous favourites instead
 * of cloned opponents at one flat target. */
function tournamentFieldMultipliers(count: number): number[] {
  const bands: number[] = Array.from({ length: count }, (_, index) => {
    const percentile = (index + 0.5) / count;
    if (percentile < 0.15) return 0.78;
    if (percentile < 0.58) return 0.94;
    if (percentile < 0.86) return 1.08;
    return 1.22;
  });
  // Keep the composition but randomise the draw position.
  for (let index = bands.length - 1; index > 0; index--) {
    const swap = Math.floor(Math.random() * (index + 1));
    [bands[index], bands[swap]] = [bands[swap], bands[index]];
  }
  return bands;
}

/** Reward multiplier stacked on top of the base placement/participation tokens for harder tiers. */
export const TIER_TOKEN_MULTIPLIER: Record<TournamentTier, number> = {
  beginner: 1,
  rookie: 1.5,
  veteran: 2.5,
  champion: 4,
};

/** Reward multiplier stacked on top for bigger (longer) brackets. */
export const SIZE_TOKEN_MULTIPLIER: Record<TournamentSize, number> = {
  8: 1,
  16: 2,
  32: 4,
};

/** Base Tournament Token prize for a top-3 finish, before tier/size multipliers (spec baseline, see lib/economy.ts for the currency). */
const BASE_PLACEMENT_TOKENS: Record<1 | 2 | 3, number> = {
  1: 1000,
  2: 500,
  3: 250,
};

/** Base consolation token per round survived when eliminated outside the top 3 — so a bracket exit still pays something. */
const BASE_PARTICIPATION_TOKENS_PER_ROUND = 40;

export type TournamentPlacement = 1 | 2 | 3 | null;

/** Human round name counting back from the final, independent of bracket size. */
export function roundLabel(totalRounds: number, roundIndex: number): string {
  const fromFinal = totalRounds - 1 - roundIndex;
  switch (fromFinal) {
    case 0:
      return "Final";
    case 1:
      return "Semifinal";
    case 2:
      return "Quarterfinal";
    default:
      return `Round of ${2 ** (fromFinal + 1)}`;
  }
}

/**
 * Tokens awarded for finishing `placement` (or, if `placement` is null, for
 * surviving `roundsWon` rounds before elimination), scaled by tier and bracket size.
 */
export function tokensAwardedFor(
  size: TournamentSize,
  tier: TournamentTier,
  placement: TournamentPlacement,
  roundsWon: number
): number {
  const multiplier = TIER_TOKEN_MULTIPLIER[tier] * SIZE_TOKEN_MULTIPLIER[size];
  const base = placement
    ? BASE_PLACEMENT_TOKENS[placement]
    : roundsWon * BASE_PARTICIPATION_TOKENS_PER_ROUND;
  return Math.round(base * multiplier);
}

/** One slot in the bracket. NPC chickens are generated once at bracket creation and never re-rolled. */
export type BracketEntrant = {
  slot: number;
  chickenId: string;
  chicken: Chicken;
  isPlayer: boolean;
  /** Round index the entrant lost in (0-based); null while still alive. */
  eliminatedRound: number | null;
};

/** A single resolved match within a round. */
export type RoundMatch = {
  round: number;
  slotA: number;
  slotB: number;
  winnerSlot: number;
  isPlayerMatch: boolean;
  result: CombatResult;
};

export type TournamentState = {
  size: TournamentSize;
  tier: TournamentTier;
  totalRounds: number;
  currentRound: number;
  status: "in_progress" | "complete";
  entrants: BracketEntrant[];
  history: RoundMatch[][];
  placement: TournamentPlacement;
  tokensAwarded: number;
};

/** Apply the same aftermath used by normal combat to a bracket snapshot.
 * NPCs are intentionally snapshots (they are not coop-owned database rows),
 * so this is what makes their health, condition, injuries, record and
 * behaviour persist from one tournament round to the next. */
function advanceEntrantChicken(chicken: Chicken, result: CombatResult): Chicken {
  const outcome = applyFightOutcome(chicken, result);
  return {
    ...chicken,
    record: outcome.record,
    health: outcome.health,
    injured: outcome.injured,
    status: outcome.status,
    behavior: outcome.behavior,
    experience: outcome.experience,
    condition: outcome.condition,
    injuries: outcome.injuries,
    confidence: outcome.confidence,
    morale: outcome.morale,
    stress: outcome.stress,
    battleHardening: outcome.battleHardening,
    traits: outcome.traits,
    combatCareer: outcome.combatCareer,
  };
}

/** Builds a fresh bracket: `playerChicken` plus `size - 1` NPCs generated at `tier`'s stat band, in a random slot order. */
export function createTournament(
  playerChicken: Chicken,
  size: TournamentSize,
  tier: TournamentTier,
  generator?: () => Chicken
): TournamentState {
  const statMultiplier = TIER_STAT_MULTIPLIER[tier];
  const opponents = tournamentFieldMultipliers(size - 1).map((fieldMultiplier) =>
    generateMatchedOpponent(playerChicken, generator, statMultiplier * fieldMultiplier)
  );

  const playerSlot = Math.floor(Math.random() * size);
  const entrants: BracketEntrant[] = [];
  let opponentIndex = 0;
  for (let slot = 0; slot < size; slot++) {
    const isPlayer = slot === playerSlot;
    const chicken = isPlayer ? playerChicken : opponents[opponentIndex++];
    entrants.push({ slot, chickenId: chicken.id, chicken, isPlayer, eliminatedRound: null });
  }

  return {
    size,
    tier,
    totalRounds: Math.log2(size),
    currentRound: 0,
    status: "in_progress",
    entrants,
    history: [],
    placement: null,
    tokensAwarded: 0,
  };
}

/**
 * The entrant the player is paired against for the round about to be played
 * (same slot-order pairing `resolveRound` uses), so the UI can show a matchup
 * card before actually resolving the fight. Null once the tournament is complete.
 */
export function currentOpponent(state: TournamentState): BracketEntrant | null {
  if (state.status === "complete") return null;
  const alive = state.entrants
    .filter((e) => e.eliminatedRound === null)
    .sort((a, b) => a.slot - b.slot);
  const playerIndex = alive.findIndex((e) => e.isPlayer);
  if (playerIndex === -1) return null;
  const pairIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
  return alive[pairIndex] ?? null;
}

/**
 * Resolves every match in the current round: alive entrants are paired in
 * slot order (0v1, 2v3, ...), each match is fought with `fight`, losers are
 * marked eliminated, and — once the final round completes — placement and
 * tokens are computed. `playerChicken` supplies the up-to-date player
 * chicken (post-heal/training) so its side of the fight uses live stats.
 *
 * Throws if the tournament is already complete, or if it's not the player's
 * turn to fight (should never happen given `entrants` bookkeeping).
 */
export function resolveRound(
  state: TournamentState,
  playerChicken: Chicken,
  fight: (a: Chicken, b: Chicken) => CombatResult = (a, b) => simulateFight(a, b)
): { state: TournamentState; playerMatch: RoundMatch } {
  if (state.status === "complete") {
    throw new Error("Tournament is already complete");
  }

  const round = state.currentRound;
  const alive = state.entrants
    .filter((e) => e.eliminatedRound === null)
    .sort((a, b) => a.slot - b.slot);

  const entrants = state.entrants.map((e) => ({ ...e }));
  const matches: RoundMatch[] = [];
  let playerMatch: RoundMatch | null = null;

  for (let i = 0; i < alive.length; i += 2) {
    const a = alive[i];
    const b = alive[i + 1];
    const isPlayerMatch = a.isPlayer || b.isPlayer;
    const chickenA = a.isPlayer ? playerChicken : a.chicken;
    const chickenB = b.isPlayer ? playerChicken : b.chicken;
    const result = fight(chickenA, chickenB);
    const winnerSlot = result.winnerId === chickenA.id ? a.slot : b.slot;
    const loserSlot = winnerSlot === a.slot ? b.slot : a.slot;

    const entrantA = entrants.find((e) => e.slot === a.slot)!;
    const entrantB = entrants.find((e) => e.slot === b.slot)!;
    // Persist post-fight state for every entrant, including simulated NPC
    // matches. The player snapshot is updated too for an accurate bracket;
    // the authoritative owned Chicken row is persisted by the service.
    entrantA.chicken = advanceEntrantChicken(chickenA, result);
    entrantB.chicken = advanceEntrantChicken(chickenB, result);
    const loserEntrant = entrants.find((e) => e.slot === loserSlot)!;
    loserEntrant.eliminatedRound = round;

    const match: RoundMatch = { round, slotA: a.slot, slotB: b.slot, winnerSlot, isPlayerMatch, result };
    matches.push(match);
    if (isPlayerMatch) playerMatch = match;
  }

  if (!playerMatch) {
    throw new Error("Player's chicken was not found among this round's live entrants");
  }

  const history = [...state.history, matches];
  const nextRound = round + 1;
  const playerEliminated = entrants.find((e) => e.isPlayer)!.eliminatedRound !== null;
  const isFinalRound = nextRound === state.totalRounds;

  let placement: TournamentPlacement = null;
  let status: TournamentState["status"] = "in_progress";
  let tokensAwarded = 0;

  if (playerEliminated || isFinalRound) {
    status = "complete";
    if (!playerEliminated && isFinalRound) {
      placement = 1;
    } else if (playerEliminated && round === state.totalRounds - 1) {
      placement = 2; // lost the final
    } else if (playerEliminated && round === state.totalRounds - 2) {
      placement = 3; // lost the semifinal
    }
    tokensAwarded = tokensAwardedFor(state.size, state.tier, placement, round + (playerEliminated ? 0 : 1));
  }

  return {
    state: {
      ...state,
      currentRound: nextRound,
      status,
      entrants,
      history,
      placement,
      tokensAwarded,
    },
    playerMatch,
  };
}
