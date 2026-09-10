import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";
import { listBosses, campaignProgress } from "@/lib/pve/service";
import { currentOpponent, type TournamentState } from "@/lib/tournament";
import { getTournamentDefinition } from "@/lib/tournament";

type Activity = {
  id: string;
  type: "training" | "breeding" | "recovery" | "tournament" | "progression";
  occurredAt: Date;
  title: string;
  summary?: string;
  destination?: string;
};

/**
 * A read-only composition of the existing ranch systems. Nothing in this
 * route is persisted for the homepage: the UI always reflects canonical
 * chicken, facility, medical, PvE, and tournament records.
 */
export async function GET() {
  const player = await getOrCreatePlayer();
  const [chickens, eggs, activeTraining, completedTraining, treatments, activeTournament, bosses, campaign, pveClears] = await Promise.all([
    prisma.chicken.findMany({ where: { playerId: player.id }, orderBy: { createdAt: "asc" } }),
    prisma.egg.findMany({ where: { playerId: player.id }, orderBy: { laidAt: "desc" } }),
    prisma.trainingSession.findMany({ where: { playerId: player.id, status: "ACTIVE" }, orderBy: { startedAt: "asc" } }),
    prisma.trainingSession.findMany({ where: { playerId: player.id, status: "COMPLETED", completedAt: { not: null } }, orderBy: { completedAt: "desc" }, take: 8 }),
    prisma.medicalTreatment.findMany({ where: { playerId: player.id }, orderBy: { completedAt: "desc" }, take: 8 }),
    prisma.tournament.findFirst({ where: { playerId: player.id, status: "IN_PROGRESS" }, orderBy: { updatedAt: "desc" } }),
    listBosses(player.id),
    campaignProgress(player.id),
    prisma.pveProgress.findMany({ where: { playerId: player.id, firstClearedAt: { not: null } }, orderBy: { firstClearedAt: "desc" }, take: 8 }),
  ]);

  const chickenById = new Map(chickens.map((chicken) => [chicken.id, chicken]));
  const trainingByChickenId = new Map(activeTraining.map((session) => [session.chickenId, session]));
  const activeTreatmentByChickenId = new Map(treatments.filter((treatment) => treatment.status === "ACTIVE").map((treatment) => [treatment.chickenId, treatment]));
  const injured = chickens.filter((chicken) => chicken.injured || chicken.status === "injured");
  const availableBoss = bosses.find((entry) => entry.progress.unlocked && !entry.progress.completed) ?? bosses.find((entry) => entry.progress.unlocked);

  const activities: Activity[] = [
    ...completedTraining.flatMap((session) => {
      const chicken = chickenById.get(session.chickenId);
      return chicken && session.completedAt ? [{
        id: `training-${session.id}`,
        type: "training" as const,
        occurredAt: session.completedAt,
        title: `${chicken.name} completed training`,
        summary: session.programId.replaceAll("_", " "),
        destination: "/training",
      }] : [];
    }),
    ...eggs.map((egg) => ({
      id: `egg-${egg.id}`,
      type: "breeding" as const,
      occurredAt: egg.laidAt,
      title: "A new egg is incubating",
      summary: `Generation ${egg.generation} · ${egg.breed ?? egg.bloodlineId}`,
      destination: "/coop",
    })),
    ...treatments.filter((treatment) => treatment.status === "COMPLETED" && treatment.completedAt).flatMap((treatment) => {
      const chicken = chickenById.get(treatment.chickenId);
      return chicken ? [{
        id: `recovery-${treatment.id}`,
        type: "recovery" as const,
        occurredAt: treatment.completedAt!,
        title: `${chicken.name} completed recovery`,
        summary: "Treatment has been resolved.",
        destination: "/clinic",
      }] : [];
    }),
    ...pveClears.flatMap((clear) => {
      const boss = bosses.find((entry) => entry.boss.id === clear.bossId)?.boss;
      return boss && clear.firstClearedAt ? [{
        id: `pve-${clear.id}`,
        type: "progression" as const,
        occurredAt: clear.firstClearedAt,
        title: `${boss.name} defeated`,
        summary: "Road to Glory progress advanced.",
        destination: "/pve",
      }] : [];
    }),
  ].sort((a, b) => b.occurredAt.getTime() - a.occurredAt.getTime()).slice(0, 6);

  const tournament = activeTournament ? (() => {
    // `currentOpponent` only needs the persisted bracket state. Its full type
    // is intentionally kept in the tournament domain rather than duplicated here.
    const opponent = currentOpponent({
      size: activeTournament.size as 8 | 16 | 32,
      tier: activeTournament.tier as "beginner" | "rookie" | "veteran" | "champion",
      totalRounds: activeTournament.totalRounds,
      currentRound: activeTournament.currentRound,
      status: "in_progress",
      entrants: activeTournament.entrants as never,
      history: activeTournament.history as never,
      placement: activeTournament.placement as 1 | 2 | 3 | null,
      tokensAwarded: activeTournament.tokensAwarded,
    } as TournamentState);
    const definition = getTournamentDefinition(activeTournament.definitionId);
    return {
      id: activeTournament.id,
      chickenId: activeTournament.chickenId,
      name: definition?.name ?? "Tournament",
      round: activeTournament.currentRound + 1,
      totalRounds: activeTournament.totalRounds,
      opponent: opponent?.chicken ?? null,
    };
  })() : null;

  return NextResponse.json({
    chickens,
    eggs,
    activeTraining,
    injuredChickenIds: injured.map((chicken) => chicken.id),
    activeTreatmentChickenIds: [...activeTreatmentByChickenId.keys()],
    trainingChickenIds: [...trainingByChickenId.keys()],
    tournament,
    progression: availableBoss ? { boss: availableBoss.boss, completed: campaign.completedCount, total: campaign.totalCount, rank: campaign.rank } : null,
    activities,
  });
}
