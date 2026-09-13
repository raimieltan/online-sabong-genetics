import type { PveOpponentHistory, PveProgress } from "@prisma/client";

import { applyFightOutcome, canFight } from "../combat";
import { buildBattleReport, type BattleReport } from "../combat/battleReport";
import { deriveBehaviorProfile } from "../combat/behavior";
import { emptyExperience } from "../combat/experience";
import { withNpcAwakening } from "../combat/evolution";
import { LiveCombatV2Session, MAX_TURNS } from "../combat-v2/liveSession";
import { createChicken } from "../chickenGenerator";
import { prisma } from "../db";
import type { BehavioralProfile, Chicken, CombatExperience } from "../types";
import { PVE_BOSSES, PVE_BOSS_LIST, bossPreview, getBoss, previousBossId } from "./bosses";
import { PVE_CIRCUITS } from "./campaign";
import { createBossFightSession, endBossFightSession, getBossFightSession } from "./bossFightSessions";
import { PveError } from "./errors";
import { escalateBoss, type PveOpponentHistorySummary } from "./escalation";
import { rivalryStatus } from "./rivalry";
import { deriveCampaignEvents } from "./events";
import { PVE_SIDE_ENCOUNTERS, isSideEncounterUnlocked, type SideEncounterUnlockContext } from "./sideEncounters";
import {
  PVE_BOSS_ORDER,
  type BossListEntry,
  type CampaignEventView,
  type BossProgressView,
  type PveBossDefinition,
  type PveBossId,
  type CampaignProgressView,
} from "./types";

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function clampProfile(p: BehavioralProfile): BehavioralProfile {
  return {
    aggression: clamp01(p.aggression),
    caution: clamp01(p.caution),
    patience: clamp01(p.patience),
    riskTolerance: clamp01(p.riskTolerance),
    pressurePreference: clamp01(p.pressurePreference),
    counterPreference: clamp01(p.counterPreference),
    recoveryPreference: clamp01(p.recoveryPreference),
    persistence: clamp01(p.persistence),
  };
}

/**
 * Resolves a boss definition into a real Chicken the shared combat simulator
 * can fight (§10, §33). Deterministic: the same boss always produces the same
 * fighter, with a stable synthetic id so it can never collide with a player's
 * chicken and is easy to recognise in a battle log.
 */
export function buildBossFighter(boss: PveBossDefinition, history: PveOpponentHistorySummary | null = null): Chicken {
  const escalation = escalateBoss(boss, history);
  const base = createChicken({
    id: `pve-boss-${boss.id}`,
    name: boss.name,
    sex: "rooster",
    generation: 0,
    parents: { fatherId: null, motherId: null },
    bloodlineId: `pve-boss-${boss.id}`,
    iv: boss.iv,
    growthStage: "prime",
  });

  const behavior = clampProfile({
    ...deriveBehaviorProfile(boss.fightingStyle, base.traits),
    ...escalation.behaviorOverrides,
  });
  const experience: CombatExperience = { ...emptyExperience(), ...boss.experienceBaseline };

  return withNpcAwakening({
    ...base,
    ev: escalation.ev,
    fightingStyle: boss.fightingStyle,
    behavior,
    experience,
    condition: escalation.condition,
    age: 400,
  });
}

function toProgressView(bossId: PveBossId, unlocked: boolean, row?: PveProgress): BossProgressView {
  return {
    bossId,
    unlocked,
    completed: (row?.clearCount ?? 0) > 0,
    clearCount: row?.clearCount ?? 0,
    firstClearedAt: row?.firstClearedAt ? row.firstClearedAt.toISOString() : null,
    firstClearChickenId: row?.firstClearChickenId ?? null,
  };
}

async function progressRows(playerId: string): Promise<Map<string, PveProgress>> {
  const rows = await prisma.pveProgress.findMany({ where: { playerId } });
  return new Map(rows.map((r) => [r.bossId, r]));
}

async function opponentHistoryRows(playerId: string): Promise<Map<string, PveOpponentHistory>> {
  const rows = await prisma.pveOpponentHistory.findMany({ where: { playerId } });
  return new Map(rows.map((r) => [r.bossId, r]));
}

function historySummary(row: PveOpponentHistory | undefined): PveOpponentHistorySummary | null {
  if (!row) return null;
  return { wins: row.wins, losses: row.losses, kosFor: row.kosFor, kosAgainst: row.kosAgainst };
}

function isUnlocked(bossId: PveBossId, rows: Map<string, PveProgress>): boolean {
  const prev = previousBossId(bossId);
  if (!prev) return true;
  return (rows.get(prev)?.clearCount ?? 0) > 0;
}

function completedCircuitIds(rows: Map<string, PveProgress>): string[] {
  return PVE_CIRCUITS.filter((c) => (rows.get(c.championshipBossId)?.clearCount ?? 0) > 0).map((c) => c.id);
}

function toCampaignEventView(row: { id: string; kind: string; bossId: string | null; headline: string; detail: string; seen: boolean; createdAt: Date }): CampaignEventView {
  return {
    id: row.id,
    kind: row.kind as CampaignEventView["kind"],
    bossId: row.bossId,
    headline: row.headline,
    detail: row.detail,
    seen: row.seen,
    createdAt: row.createdAt.toISOString(),
  };
}

/** Campaign feed for the "Call-Outs & Invitationals" panel (§35 Phase 3). */
export async function listCampaignEvents(playerId: string, limit = 20): Promise<CampaignEventView[]> {
  const rows = await prisma.pveEncounterEvent.findMany({
    where: { playerId },
    orderBy: [{ seen: "asc" }, { createdAt: "desc" }],
    take: limit,
  });
  return rows.map(toCampaignEventView);
}

export async function markCampaignEventsSeen(playerId: string, ids: string[]): Promise<void> {
  if (!ids.length) return;
  await prisma.pveEncounterEvent.updateMany({ where: { playerId, id: { in: ids } }, data: { seen: true } });
}

export async function listBosses(playerId: string): Promise<BossListEntry[]> {
  const [rows, historyRows] = await Promise.all([progressRows(playerId), opponentHistoryRows(playerId)]);
  return PVE_BOSS_LIST.map((boss) => {
    const history = historySummary(historyRows.get(boss.id));
    return {
      boss: bossPreview(boss),
      progress: toProgressView(boss.id, isUnlocked(boss.id, rows), rows.get(boss.id)),
      rivalry: rivalryStatus(history),
      escalationDeltas: escalateBoss(boss, history).deltas,
    };
  });
}

/** Phase 3 side content (§35 Phase 3) — outside the fixed 20-boss ladder,
 * unlocked by reputation/record/circuit completion instead of "previous
 * boss cleared" (see isSideEncounterUnlocked). */
export async function listSideEncounters(playerId: string): Promise<BossListEntry[]> {
  const [rows, historyRows, campaignState] = await Promise.all([
    progressRows(playerId),
    opponentHistoryRows(playerId),
    prisma.pveCampaignState.findUnique({ where: { playerId } }),
  ]);
  const ctx: SideEncounterUnlockContext = {
    reputation: campaignState?.reputation ?? 0,
    completedCircuitIds: completedCircuitIds(rows),
    totalLossesAcrossHistory: [...historyRows.values()].reduce((sum, r) => sum + r.losses, 0),
    rivalryDeciderBossIds: PVE_BOSS_ORDER.filter((id) => rivalryStatus(historySummary(historyRows.get(id))).deciderDue),
  };
  return PVE_SIDE_ENCOUNTERS.filter((encounter) => isSideEncounterUnlocked(encounter, ctx)).map((encounter) => {
    const history = historySummary(historyRows.get(encounter.id));
    const def = encounter as unknown as PveBossDefinition;
    return {
      boss: bossPreview(def),
      progress: toProgressView(encounter.id as PveBossId, true, rows.get(encounter.id)),
      rivalry: rivalryStatus(history),
      escalationDeltas: escalateBoss(def, history).deltas,
    };
  });
}

/** Campaign state is derived from authoritative PvE clear records. This keeps the
 * presentation layer extensible without a second, competing progression store. */
export async function campaignProgress(playerId: string): Promise<CampaignProgressView> {
  const [rows, state] = await Promise.all([progressRows(playerId), prisma.pveCampaignState.findUnique({ where: { playerId } })]);
  const completed = PVE_BOSS_ORDER.filter((id) => (rows.get(id)?.clearCount ?? 0) > 0);
  const unlockedCircuitIds = PVE_CIRCUITS.filter((c) => c.order === 1 || c.bossIds.some((id) => isUnlocked(id, rows))).map((c) => c.id);
  return {
    completedCount: completed.length,
    totalCount: PVE_BOSS_ORDER.length,
    reputation: state?.reputation ?? completed.reduce((sum, id) => sum + Math.round(PVE_BOSSES[id].rewards.firstClearCredits / 10), 0),
    rank: Math.max(1, 100 - completed.length * 5),
    unlockedCircuitIds,
  };
}

type FightSim = ReturnType<LiveCombatV2Session["finalize"]>;

export type StartBossFightResult = {
  sessionId: string;
  matchSeed: number;
  chicken: Chicken;
  bossFighter: Chicken;
  boss: ReturnType<typeof bossPreview>;
  maxTurns: number;
  snapshotA: ReturnType<LiveCombatV2Session["snapshotA"]>;
  snapshotB: ReturnType<LiveCombatV2Session["snapshotB"]>;
  rivalry: import("./rivalry").RivalryStatus;
  escalationDeltas: import("./escalation").EscalationDelta[];
};

export type BossFightResult = {
  won: boolean;
  result: FightSim;
  log: FightSim["log"];
  boss: ReturnType<typeof bossPreview>;
  bossFighter: Chicken;
  rewards: { credits: number; firstClear: boolean; experienceMultiplier: number };
  playerCredits: number;
  chicken: unknown;
  progress: BossProgressView;
  summary: {
    durationTurns: number;
    outcomeReason: string;
    analysis: string | null;
  };
  battleReport: BattleReport;
  rivalry: import("./rivalry").RivalryStatus;
  newEvents: CampaignEventView[];
};

/**
 * Validates the matchup and opens a live, steppable boss fight (spec's
 * player-commands work extended to PvE): builds both fighters and a
 * `BattleSession`, stashes it in `bossFightSessions` for the step route to
 * advance one turn at a time, and returns the initial snapshots a UI needs
 * to render before the first command is even issued. Nothing is persisted
 * yet — that only happens once the fight actually ends, in `finishBossFight`.
 */
export async function startBossFight(
  playerId: string,
  bossIdRaw: string,
  chickenId: string,
): Promise<StartBossFightResult> {
  const boss = getBoss(bossIdRaw);
  if (!boss) throw new PveError("BOSS_NOT_FOUND");

  const sideEncounter = PVE_SIDE_ENCOUNTERS.find((e) => e.id === boss.id);
  const [rows, historyRows] = await Promise.all([progressRows(playerId), opponentHistoryRows(playerId)]);
  if (sideEncounter) {
    const campaignState = await prisma.pveCampaignState.findUnique({ where: { playerId } });
    const ctx: SideEncounterUnlockContext = {
      reputation: campaignState?.reputation ?? 0,
      completedCircuitIds: completedCircuitIds(rows),
      totalLossesAcrossHistory: [...historyRows.values()].reduce((sum, r) => sum + r.losses, 0),
      rivalryDeciderBossIds: PVE_BOSS_ORDER.filter((id) => rivalryStatus(historySummary(historyRows.get(id))).deciderDue),
    };
    if (!isSideEncounterUnlocked(sideEncounter, ctx)) throw new PveError("BOSS_LOCKED");
  } else if (!isUnlocked(boss.id, rows)) {
    throw new PveError("BOSS_LOCKED");
  }

  const row = await prisma.chicken.findUnique({ where: { id: chickenId } });
  if (!row) throw new PveError("CHICKEN_NOT_FOUND");
  if (row.playerId !== playerId) throw new PveError("CHICKEN_NOT_OWNED");

  const chicken = row as unknown as Chicken;
  if (!canFight(chicken)) throw new PveError("CHICKEN_NOT_ELIGIBLE");

  const history = historySummary(historyRows.get(boss.id));
  const bossFighter = buildBossFighter(boss, history);
  const session = new LiveCombatV2Session(chicken, bossFighter);
  const sessionId = createBossFightSession({ session, playerId, chickenId, chicken, bossId: boss.id, bossFighter });

  return {
    sessionId,
    matchSeed: session.matchSeed,
    chicken,
    bossFighter,
    boss: bossPreview(boss),
    maxTurns: MAX_TURNS,
    snapshotA: session.snapshotA(),
    snapshotB: session.snapshotB(),
    rivalry: rivalryStatus(history),
    escalationDeltas: escalateBoss(boss, history).deltas,
  };
}

/**
 * Settles a boss fight whose `BattleSession` has already run to completion
 * (the step route only calls this once `session.step()` reports
 * `fightOver`) and persists the outcome in a single transaction (§29-30).
 * One finish == one fight == one reward: first-clear status is decided by
 * reading firstClearedAt inside the transaction, so repeated fights each pay
 * the repeat reward once the boss is already cleared. The session is dropped
 * either way — a fight can only ever be finished once.
 */
export async function finishBossFight(playerId: string, sessionId: string): Promise<BossFightResult> {
  const entry = getBossFightSession(sessionId);
  if (!entry) throw new PveError("SESSION_NOT_FOUND");
  if (entry.playerId !== playerId) throw new PveError("SESSION_NOT_FOUND");
  endBossFightSession(sessionId);

  const { session, chicken, chickenId, bossFighter } = entry;
  const boss = getBoss(entry.bossId);
  if (!boss) throw new PveError("BOSS_NOT_FOUND");

  const [rows, historyRows, campaignStateBefore] = await Promise.all([
    progressRows(playerId),
    opponentHistoryRows(playerId),
    prisma.pveCampaignState.findUnique({ where: { playerId } }),
  ]);
  const historyBefore = historyRows.get(boss.id) ?? null;
  const rivalryBefore = rivalryStatus(historySummary(historyBefore ?? undefined));
  const result = session.finalize();
  const won = result.winnerId === chicken.id;

  // Scale the combat experience the fight already produced by boss difficulty
  // (§20) — still the existing experience pipeline, just weighted.
  const gained = result.experienceGained?.[chicken.id];
  if (gained && boss.rewards.experienceMultiplier !== 1) {
    for (const key of Object.keys(gained) as (keyof CombatExperience)[]) {
      gained[key] = Math.round(gained[key] * boss.rewards.experienceMultiplier);
    }
  }

  const outcome = applyFightOutcome(chicken, result);
  const battleReport = buildBattleReport(chicken, result, chicken.id, outcome);
  // `newTraits` is a derived summary field for the battle report, not a Chicken
  // column — strip it before persisting (mirrors the other two fight routes).
  const { newTraits, ...persistedOutcome } = outcome;
  void newTraits;
  const existing = rows.get(boss.id);
  const firstClear = won && (existing?.clearCount ?? 0) === 0;
  const credits = won
    ? firstClear
      ? boss.rewards.firstClearCredits
      : boss.rewards.repeatCredits
    : 0;

  const reputationEarned = won && firstClear ? Math.round(boss.rewards.firstClearCredits / 10) : 0;
  const [updatedChicken, updatedPlayer, progressRow, newEvents, rivalryAfterFight] = await prisma.$transaction(async (tx) => {
    const uc = await tx.chicken.update({ where: { id: chickenId }, data: persistedOutcome });

    const up = credits > 0
      ? await tx.player.update({ where: { id: playerId }, data: { credits: { increment: credits } } })
      : await tx.player.findUniqueOrThrow({ where: { id: playerId } });

    let pr = existing ?? null;
    if (won) {
      const now = new Date();
      pr = await tx.pveProgress.upsert({
        where: { playerId_bossId: { playerId, bossId: boss.id } },
        create: {
          playerId,
          bossId: boss.id,
          clearCount: 1,
          firstClearedAt: now,
          firstClearChickenId: chickenId,
          lastClearedAt: now,
        },
        update: {
          clearCount: { increment: 1 },
          lastClearedAt: now,
          ...(existing?.firstClearedAt
            ? {}
            : { firstClearedAt: now, firstClearChickenId: chickenId }),
        },
      });
    }
    await tx.pveCampaignState.upsert({
      where: { playerId },
      create: { playerId, reputation: reputationEarned },
      update: reputationEarned ? { reputation: { increment: reputationEarned } } : {},
    });
    await tx.pveOpponentHistory.upsert({
      where: { playerId_bossId: { playerId, bossId: boss.id } },
      create: {
        playerId, bossId: boss.id,
        wins: won ? 1 : 0, losses: won ? 0 : 1,
        kosFor: won && result.outcomeReason === "ko" ? 1 : 0,
        kosAgainst: !won && result.outcomeReason === "ko" ? 1 : 0,
      },
      update: {
        wins: won ? { increment: 1 } : undefined,
        losses: won ? undefined : { increment: 1 },
        kosFor: won && result.outcomeReason === "ko" ? { increment: 1 } : undefined,
        kosAgainst: !won && result.outcomeReason === "ko" ? { increment: 1 } : undefined,
        lastFightAt: new Date(),
      },
    });
    // Everything below reads back the rows this same transaction just wrote,
    // so "before" vs "after" comparisons (streaks, rivalry deciders, newly
    // unlocked side content, reputation milestones) never race a later fight.
    const [rowsAfter, historyRowsAfter, campaignStateAfter] = await Promise.all([
      tx.pveProgress.findMany({ where: { playerId } }),
      tx.pveOpponentHistory.findMany({ where: { playerId } }),
      tx.pveCampaignState.findUniqueOrThrow({ where: { playerId } }),
    ]);
    const rowsAfterMap = new Map(rowsAfter.map((r) => [r.bossId, r]));
    const historyRowsAfterMap = new Map(historyRowsAfter.map((r) => [r.bossId, r]));
    const rivalryAfter = rivalryStatus(historySummary(historyRowsAfterMap.get(boss.id)));

    const unlockCtxBefore: SideEncounterUnlockContext = {
      reputation: campaignStateBefore?.reputation ?? 0,
      completedCircuitIds: completedCircuitIds(rows),
      totalLossesAcrossHistory: [...historyRows.values()].reduce((sum, r) => sum + r.losses, 0),
      rivalryDeciderBossIds: PVE_BOSS_ORDER.filter((id) => rivalryStatus(historySummary(historyRows.get(id))).deciderDue),
    };
    const unlockCtxAfter: SideEncounterUnlockContext = {
      reputation: campaignStateAfter.reputation,
      completedCircuitIds: completedCircuitIds(rowsAfterMap),
      totalLossesAcrossHistory: [...historyRowsAfterMap.values()].reduce((sum, r) => sum + r.losses, 0),
      rivalryDeciderBossIds: PVE_BOSS_ORDER.filter((id) => rivalryStatus(historySummary(historyRowsAfterMap.get(id))).deciderDue),
    };
    const newlyUnlockedSideEncounters = PVE_SIDE_ENCOUNTERS.filter(
      (encounter) => !isSideEncounterUnlocked(encounter, unlockCtxBefore) && isSideEncounterUnlocked(encounter, unlockCtxAfter),
    );

    const events = deriveCampaignEvents({
      boss,
      won,
      priorHistory: historyBefore ? { wins: historyBefore.wins, losses: historyBefore.losses } : null,
      rivalry: rivalryAfter,
      wasRivalryDeciderDueBefore: rivalryBefore.deciderDue,
      reputationBefore: campaignStateBefore?.reputation ?? 0,
      reputationAfter: campaignStateAfter.reputation,
      newlyUnlockedSideEncounters,
    });
    const created = events.length
      ? await Promise.all(events.map((e) => tx.pveEncounterEvent.create({ data: { playerId, kind: e.kind, bossId: e.bossId, headline: e.headline, detail: e.detail } })))
      : [];

    return [uc, up, pr, created, rivalryAfter] as const;
  });

  return {
    won,
    result,
    log: result.log,
    boss: bossPreview(boss),
    bossFighter,
    rewards: { credits, firstClear, experienceMultiplier: boss.rewards.experienceMultiplier },
    playerCredits: updatedPlayer.credits,
    chicken: updatedChicken,
    progress: toProgressView(boss.id, true, progressRow ?? undefined),
    rivalry: rivalryAfterFight,
    newEvents: newEvents.map(toCampaignEventView),
    summary: {
      durationTurns: result.totalTurns,
      outcomeReason: result.outcomeReason,
      analysis: result.analysis?.[chicken.id] ?? null,
    },
    battleReport,
  };
}

export type DevPveAction =
  | { action: "UNLOCK_ALL" }
  | { action: "RESET_PROGRESS" }
  | { action: "COMPLETE_BOSS"; bossId: string }
  | { action: "RESET_BOSS"; bossId: string };

export async function runDevPveAction(playerId: string, body: DevPveAction) {
  switch (body.action) {
    case "UNLOCK_ALL": {
      const now = new Date();
      const rows = await progressRows(playerId);
      // Clearing every boss except the last unlocks the whole ladder.
      for (const id of PVE_BOSS_ORDER.slice(0, -1)) {
        if ((rows.get(id)?.clearCount ?? 0) > 0) continue;
        await prisma.pveProgress.upsert({
          where: { playerId_bossId: { playerId, bossId: id } },
          create: { playerId, bossId: id, clearCount: 1, firstClearedAt: now, lastClearedAt: now },
          update: { clearCount: 1, firstClearedAt: now, lastClearedAt: now },
        });
      }
      return listBosses(playerId);
    }
    case "RESET_PROGRESS": {
      await prisma.pveProgress.deleteMany({ where: { playerId } });
      return listBosses(playerId);
    }
    case "COMPLETE_BOSS": {
      if (!getBoss(body.bossId)) throw new PveError("BOSS_NOT_FOUND");
      const now = new Date();
      await prisma.pveProgress.upsert({
        where: { playerId_bossId: { playerId, bossId: body.bossId } },
        create: { playerId, bossId: body.bossId, clearCount: 1, firstClearedAt: now, lastClearedAt: now },
        update: { clearCount: { increment: 1 }, lastClearedAt: now },
      });
      return listBosses(playerId);
    }
    case "RESET_BOSS": {
      if (!getBoss(body.bossId)) throw new PveError("BOSS_NOT_FOUND");
      await prisma.pveProgress.deleteMany({ where: { playerId, bossId: body.bossId } });
      return listBosses(playerId);
    }
    default:
      throw new PveError("UNKNOWN_ACTION");
  }
}

export { PVE_BOSSES };
