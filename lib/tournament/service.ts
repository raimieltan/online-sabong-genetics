import type { Tournament as TournamentRow } from "@prisma/client";

import { applyFightOutcome, canFight, finalHealthPercent } from "../combat";
import { buildBattleReport, type BattleReport } from "../combat/battleReport";
import { hasActiveInjury } from "../career/injuries";
import { prisma } from "../db";
import {
  createTournament,
  resolveRound,
  type BracketEntrant,
  type RoundMatch,
  type TournamentSize,
  type TournamentState,
  type TournamentTier,
} from "../tournament";
import type { Chicken, CombatRecord } from "../types";
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

export type TournamentView = TournamentState & { id: string; chickenId: string };

function toView(row: TournamentRow): TournamentView {
  return { ...stateFromRow(row), id: row.id, chickenId: row.chickenId };
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
): Promise<TournamentView> {
  const row = await prisma.chicken.findUnique({ where: { id: chickenId } });
  if (!row) throw new TournamentError("CHICKEN_NOT_FOUND");
  if (row.playerId !== playerId) throw new TournamentError("CHICKEN_NOT_OWNED");

  const chicken = row as unknown as Chicken;
  if (!canFight(chicken)) throw new TournamentError("CHICKEN_NOT_ELIGIBLE");

  const active = await findActiveTournament(playerId, chickenId);
  if (active) throw new TournamentError("TOURNAMENT_ALREADY_ACTIVE");

  const state = createTournament(chicken, size, tier);

  const created = await prisma.tournament.create({
    data: {
      playerId,
      chickenId,
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

function applyRoundToRecord(record: CombatRecord, match: RoundMatch, chickenId: string): CombatRecord {
  const won = match.result.winnerId === chickenId;
  return {
    ...record,
    wins: record.wins + (won ? 1 : 0),
    losses: record.losses + (won ? 0 : 1),
    koTko: record.koTko + (won && match.result.outcomeReason !== "timeout" ? 1 : 0),
    decisions: record.decisions + (match.result.outcomeReason === "timeout" ? 1 : 0),
  };
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
export async function advanceRound(playerId: string, tournamentId: string): Promise<AdvanceRoundResult> {
  const tournamentRow = await loadOwnedTournament(playerId, tournamentId);
  if (tournamentRow.status === "COMPLETE") throw new TournamentError("TOURNAMENT_COMPLETE");

  const chickenRow = await prisma.chicken.findUnique({ where: { id: tournamentRow.chickenId } });
  if (!chickenRow) throw new TournamentError("CHICKEN_NOT_FOUND");

  const chicken = chickenRow as unknown as Chicken;
  if (!canFight(chicken)) throw new TournamentError("CHICKEN_NOT_ELIGIBLE");

  const state = stateFromRow(tournamentRow);
  const { state: nextState, playerMatch } = resolveRound(state, chicken);

  const outcome = applyFightOutcome(chicken, playerMatch.result);
  const battleReport = buildBattleReport(chicken, playerMatch.result, chicken.id, outcome);
  const wasInjured = playerMatch.result.injuredChickenId === chicken.id;
  const record = applyRoundToRecord(chicken.record, playerMatch, chicken.id);
  const wonBracket = nextState.status === "complete" && nextState.placement === 1;

  const [updatedChicken, updatedTournament, updatedPlayer] = await prisma.$transaction(async (tx) => {
    const uc = await tx.chicken.update({
      where: { id: chicken.id },
      data: {
        record: { ...record, championships: record.championships + (wonBracket ? 1 : 0) },
        health: finalHealthPercent(playerMatch.result, chicken),
        injured: wasInjured || hasActiveInjury(outcome.injuries ?? []),
        status: wasInjured ? "injured" : chicken.status,
        behavior: outcome.behavior,
        experience: outcome.experience,
        condition: outcome.condition,
        injuries: outcome.injuries,
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
