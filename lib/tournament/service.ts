import type { Tournament as TournamentRow } from "@prisma/client";

import { applyFightOutcome, canFight, simulateFight } from "../combat";
import { buildBattleReport, type BattleReport } from "../combat/battleReport";
import { hasActiveInjury } from "../career/injuries";
import { prisma } from "../db";
import {
  createTournament,
  currentOpponent,
  getTournamentDefinition,
  tournamentDefinitionFor,
  resolveRound,
  type BracketEntrant,
  type RoundMatch,
  type TournamentSize,
  type TournamentState,
  type TournamentTier,
} from "../tournament";
import type { Chicken, CombatResult } from "../types";
import { TournamentError } from "./errors";

function stateFromRow(row: TournamentRow): TournamentState {
  return {
    size: row.size as TournamentSize,
    tier: row.tier as TournamentTier,
    totalRounds: row.totalRounds,
    currentRound: row.currentRound,
    status: row.status === "COMPLETE" ? "complete" : "in_progress",
    entrants: row.entrants as unknown as BracketEntrant[],
    history: row.history as unknown as RoundMatch[][],
    placement: row.placement as TournamentState["placement"],
    tokensAwarded: row.tokensAwarded,
  };
}

export type TournamentView = TournamentState & { id: string; chickenId: string; definitionId: string };

function toView(row: TournamentRow): TournamentView {
  return {
    ...stateFromRow(row),
    id: row.id,
    chickenId: row.chickenId,
    // Rows created before the event field existed remain resumable.
    definitionId: row.definitionId ?? tournamentDefinitionFor(row.size as TournamentSize, row.tier as TournamentTier).id,
  };
}

async function loadOwnedTournament(playerId: string, tournamentId: string): Promise<TournamentRow> {
  const row = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!row) throw new TournamentError("TOURNAMENT_NOT_FOUND");
  if (row.playerId !== playerId) throw new TournamentError("TOURNAMENT_NOT_OWNED");
  return row;
}

/** The in-progress tournament (if any) for this chicken — used to offer a "resume" action instead of starting fresh. */
export async function findActiveTournament(playerId: string, chickenId: string): Promise<TournamentView | null> {
  const row = await prisma.tournament.findFirst({
    where: { playerId, chickenId, status: "IN_PROGRESS" },
    orderBy: { createdAt: "desc" },
  });
  return row ? toView(row) : null;
}

export async function getTournament(playerId: string, tournamentId: string): Promise<TournamentView> {
  return toView(await loadOwnedTournament(playerId, tournamentId));
}

export async function startTournament(
  playerId: string,
  chickenId: string,
  size: TournamentSize,
  tier: TournamentTier,
  definitionId = tournamentDefinitionFor(size, tier).id,
): Promise<TournamentView> {
  const row = await prisma.chicken.findUnique({ where: { id: chickenId } });
  if (!row) throw new TournamentError("CHICKEN_NOT_FOUND");
  if (row.playerId !== playerId) throw new TournamentError("CHICKEN_NOT_OWNED");

  const chicken = row as unknown as Chicken;
  if (!canFight(chicken)) throw new TournamentError("CHICKEN_NOT_ELIGIBLE");

  const definition = getTournamentDefinition(definitionId);
  if (!definition || definition.bracketSize !== size || definition.tier !== tier) {
    throw new TournamentError("TOURNAMENT_EVENT_INVALID");
  }

  const active = await findActiveTournament(playerId, chickenId);
  if (active) throw new TournamentError("TOURNAMENT_ALREADY_ACTIVE");

  const state = createTournament(chicken, size, tier);

  const created = await prisma.tournament.create({
    data: {
      playerId,
      chickenId,
      definitionId,
      size: state.size,
      tier: state.tier,
      totalRounds: state.totalRounds,
      currentRound: state.currentRound,
      status: "IN_PROGRESS",
      entrants: state.entrants as unknown as object,
      history: state.history as unknown as object,
      placement: null,
      tokensAwarded: 0,
    },
  });

  return toView(created);
}

export type AdvanceRoundResult = {
  tournament: TournamentView;
  playerMatch: RoundMatch;
  battleReport: BattleReport;
  chicken: unknown;
  tournamentTokens?: number;
};

/**
 * Resolves the current round of a saved tournament: fights the player's live
 * chicken (post-heal/training) against this round's opponent, persists both
 * the chicken's fight outcome and the updated bracket, and — if the bracket
 * just finished — pays out tournamentTokens.
 */
async function persistRound(playerId: string, tournamentId: string, playerResult?: CombatResult): Promise<AdvanceRoundResult> {
  const tournamentRow = await loadOwnedTournament(playerId, tournamentId);
  if (tournamentRow.status === "COMPLETE") throw new TournamentError("TOURNAMENT_COMPLETE");

  const chickenRow = await prisma.chicken.findUnique({ where: { id: tournamentRow.chickenId } });
  if (!chickenRow) throw new TournamentError("CHICKEN_NOT_FOUND");

  const chicken = chickenRow as unknown as Chicken;
  if (!canFight(chicken)) throw new TournamentError("CHICKEN_NOT_ELIGIBLE");

  const state = stateFromRow(tournamentRow);
  const opponent = currentOpponent(state);
  if (playerResult && (!opponent || ![chicken.id, opponent.chicken.id].includes(playerResult.winnerId))) {
    throw new TournamentError("TOURNAMENT_FIGHT_INVALID");
  }
  const { state: nextState, playerMatch } = resolveRound(
    state,
    chicken,
    (a, b) => playerResult && (a.id === chicken.id || b.id === chicken.id) ? playerResult : simulateFight(a, b),
  );

  const outcome = applyFightOutcome(chicken, playerMatch.result);
  const battleReport = buildBattleReport(chicken, playerMatch.result, chicken.id, outcome);
  const wonBracket = nextState.status === "complete" && nextState.placement === 1;

  const [updatedChicken, updatedTournament, updatedPlayer] = await prisma.$transaction(async (tx) => {
    const uc = await tx.chicken.update({
      where: { id: chicken.id },
      data: {
        record: { ...outcome.record, championships: outcome.record.championships + (wonBracket ? 1 : 0) },
        health: outcome.health,
        injured: outcome.injured || hasActiveInjury(outcome.injuries ?? []),
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
      },
    });

    const ut = await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        currentRound: nextState.currentRound,
        status: nextState.status === "complete" ? "COMPLETE" : "IN_PROGRESS",
        entrants: nextState.entrants as unknown as object,
        history: nextState.history as unknown as object,
        placement: nextState.placement,
        tokensAwarded: nextState.tokensAwarded,
      },
    });

    const up = nextState.tokensAwarded > 0
      ? await tx.player.update({ where: { id: playerId }, data: { tournamentTokens: { increment: nextState.tokensAwarded } } })
      : await tx.player.findUniqueOrThrow({ where: { id: playerId } });

    return [uc, ut, up] as const;
  });

  return {
    tournament: toView(updatedTournament),
    playerMatch,
    battleReport,
    chicken: updatedChicken,
    tournamentTokens: updatedPlayer.tournamentTokens,
  };
}

/** Legacy one-shot advance retained for callers that do not open a live V2 session. */
export async function advanceRound(playerId: string, tournamentId: string): Promise<AdvanceRoundResult> {
  return persistRound(playerId, tournamentId);
}

/** Commits a completed, server-owned LiveCombatV2Session result into the current bracket round. */
export async function completeTournamentRound(playerId: string, tournamentId: string, result: CombatResult): Promise<AdvanceRoundResult> {
  return persistRound(playerId, tournamentId, result);
}
