import { NextResponse } from "next/server";

import { generateRandomChicken } from "@/lib/chickenGenerator";
import { applyFightOutcome, canFight, generateMatchedOpponent, simulateFight } from "@/lib/combat";
import { buildBattleReport, type BattleReport } from "@/lib/combat/battleReport";
import { prisma } from "@/lib/db";
import { BATTLE_WIN_CREDITS, earnCredits } from "@/lib/economy";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken } from "@/lib/types";

/**
 * "pve" — one of the player's chickens vs. a generated, stat-matched NPC.
 * "pvp" — two of the player's own chickens fight each other.
 * "exhibition" — the player has no fightable chicken right now (all resting/
 * injured/hens/chicks), so two fully generated NPCs headline instead. Nothing
 * is persisted for an exhibition bout — it exists purely so the feed never
 * goes dark waiting on the player's coop to heal.
 */
export type LiveMode = "pve" | "pvp" | "exhibition";

export async function POST() {
  const player = await getOrCreatePlayer();
  const rows = await prisma.chicken.findMany({ where: { playerId: player.id } });
  const owned = rows as unknown as Chicken[];
  const eligible = owned.filter(canFight);

  let mode: LiveMode;
  let chickenA: Chicken;
  let chickenB: Chicken;

  if (eligible.length >= 2 && Math.random() < 0.5) {
    mode = "pvp";
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    chickenA = shuffled[0];
    chickenB = shuffled[1];
  } else if (eligible.length >= 1) {
    mode = "pve";
    chickenA = eligible[Math.floor(Math.random() * eligible.length)];
    chickenB = generateMatchedOpponent(chickenA);
  } else {
    mode = "exhibition";
    chickenA = generateRandomChicken({ sex: "rooster" });
    chickenB = generateMatchedOpponent(chickenA);
  }

  const result = simulateFight(chickenA, chickenB);
  const ownedSides = mode === "pvp" ? [chickenA, chickenB] : mode === "pve" ? [chickenA] : [];

  let updatedA: Chicken = chickenA;
  let updatedB: Chicken = chickenB;
  let creditsEarned = 0;
  let credits = player.credits;
  let battleReportA: BattleReport | undefined;
  let battleReportB: BattleReport | undefined;

  if (ownedSides.length > 0) {
    const outcomeA = applyFightOutcome(chickenA, result);
    const outcomeB = mode === "pvp" ? applyFightOutcome(chickenB, result) : undefined;
    // `newTraits` is a derived summary field for the battle report, not a Chicken
    // column — passing it through to Prisma throws a validation error.
    const { newTraits: _newTraitsA, ...persistedA } = outcomeA;
    let persistedB: Omit<typeof outcomeA, "newTraits"> | undefined;
    if (outcomeB) {
      const { newTraits: _newTraitsB, ...rest } = outcomeB;
      persistedB = rest;
    }
    const [rowA, rowB] = await Promise.all([
      prisma.chicken.update({ where: { id: chickenA.id }, data: persistedA }),
      persistedB
        ? prisma.chicken.update({ where: { id: chickenB.id }, data: persistedB })
        : Promise.resolve(chickenB),
    ]);
    updatedA = rowA as unknown as Chicken;
    updatedB = rowB as unknown as Chicken;
    battleReportA = buildBattleReport(chickenA, result, chickenA.id, outcomeA);
    battleReportB = outcomeB ? buildBattleReport(chickenB, result, chickenB.id, outcomeB) : undefined;

    if (ownedSides.some((c) => c.id === result.winnerId)) {
      creditsEarned = BATTLE_WIN_CREDITS;
      const updatedPlayer = await prisma.player.update({
        where: { id: player.id },
        data: { credits: earnCredits(player.credits, BATTLE_WIN_CREDITS) },
      });
      credits = updatedPlayer.credits;
    }
  }

  return NextResponse.json({
    mode,
    chickenA,
    chickenB,
    updatedA,
    updatedB,
    result,
    log: result.log,
    battleReportA,
    battleReportB,
    creditsEarned,
    credits,
  });
}
