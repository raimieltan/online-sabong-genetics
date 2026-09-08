import type { PveProgress } from "@prisma/client";

import { applyFightOutcome, canFight, simulateFight } from "../combat";
import { buildBattleReport, type BattleReport } from "../combat/battleReport";
import { deriveBehaviorProfile } from "../combat/behavior";
import { emptyExperience } from "../combat/experience";
import { createChicken } from "../chickenGenerator";
import { prisma } from "../db";
import type { BehavioralProfile, Chicken, CombatExperience } from "../types";
import { PVE_BOSSES, PVE_BOSS_LIST, bossPreview, getBoss, previousBossId } from "./bosses";
import { PveError } from "./errors";
import {
  PVE_BOSS_ORDER,
  type BossListEntry,
  type BossProgressView,
  type PveBossDefinition,
  type PveBossId,
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
export function buildBossFighter(boss: PveBossDefinition): Chicken {
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
    ...boss.behaviorOverrides,
  });
  const experience: CombatExperience = { ...emptyExperience(), ...boss.experienceBaseline };

  return {
    ...base,
    ev: boss.ev,
    fightingStyle: boss.fightingStyle,
    behavior,
    experience,
    condition: boss.condition ?? 100,
    age: 400,
  };
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

function isUnlocked(bossId: PveBossId, rows: Map<string, PveProgress>): boolean {
  const prev = previousBossId(bossId);
  if (!prev) return true;
  return (rows.get(prev)?.clearCount ?? 0) > 0;
}

export async function listBosses(playerId: string): Promise<BossListEntry[]> {
  const rows = await progressRows(playerId);
  return PVE_BOSS_LIST.map((boss) => ({
    boss: bossPreview(boss),
    progress: toProgressView(boss.id, isUnlocked(boss.id, rows), rows.get(boss.id)),
  }));
}

type FightSim = ReturnType<typeof simulateFight>;

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
};

/**
 * Runs one boss fight end to end and persists the outcome in a single
 * transaction (§29-30). One POST == one fight == one reward: first-clear
 * status is decided by reading firstClearedAt inside the transaction, so
 * repeated requests each run a fresh fight and only ever pay the repeat
 * reward once the boss is already cleared.
 */
export async function resolveBossFight(
  playerId: string,
  bossIdRaw: string,
  chickenId: string,
): Promise<BossFightResult> {
  const boss = getBoss(bossIdRaw);
  if (!boss) throw new PveError("BOSS_NOT_FOUND");

  const rows = await progressRows(playerId);
  if (!isUnlocked(boss.id, rows)) throw new PveError("BOSS_LOCKED");

  const row = await prisma.chicken.findUnique({ where: { id: chickenId } });
  if (!row) throw new PveError("CHICKEN_NOT_FOUND");
  if (row.playerId !== playerId) throw new PveError("CHICKEN_NOT_OWNED");

  const chicken = row as unknown as Chicken;
  if (!canFight(chicken)) throw new PveError("CHICKEN_NOT_ELIGIBLE");

  const bossFighter = buildBossFighter(boss);
  const result = simulateFight(chicken, bossFighter);
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
  const existing = rows.get(boss.id);
  const firstClear = won && (existing?.clearCount ?? 0) === 0;
  const credits = won
    ? firstClear
      ? boss.rewards.firstClearCredits
      : boss.rewards.repeatCredits
    : 0;

  const [updatedChicken, updatedPlayer, progressRow] = await prisma.$transaction(async (tx) => {
    const uc = await tx.chicken.update({ where: { id: chickenId }, data: outcome });

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
    return [uc, up, pr] as const;
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
