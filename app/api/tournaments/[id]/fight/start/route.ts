import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { canFight } from "@/lib/combat";
import { CombatServiceError, createCombatEncounter, createSession } from "@/lib/combat/service";
import { prisma } from "@/lib/db";
import { currentOpponent } from "@/lib/tournament";
import { TournamentError } from "@/lib/tournament/errors";
import { getTournament } from "@/lib/tournament/service";
import type { Chicken } from "@/lib/types";

/** Opens the bracket's player match as the common authoritative session. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const player = await requirePlayer();
    const config = await request.json().catch(() => ({})) as { coachingMode?: "MANUAL" | "AUTO"; openingCommand?: "PRESS" | "WAIT" | "COUNTER" | "RECOVER"; disconnectPolicy?: "KEEP_INSTRUCTION" | "AUTO_COACH" };
    const tournament = await getTournament(player.id, id);
    if (tournament.status === "complete") throw new TournamentError("TOURNAMENT_COMPLETE");
    const row = await prisma.chicken.findUnique({ where: { id: tournament.chickenId } });
    const chicken = row as unknown as Chicken | null;
    if (!chicken || !canFight(chicken)) throw new TournamentError("CHICKEN_NOT_ELIGIBLE");
    const opponent = currentOpponent(tournament);
    if (!opponent) throw new TournamentError("TOURNAMENT_FIGHT_INVALID");
    const encounter = await createCombatEncounter({ ownerPlayerId: player.id, fighterId: chicken.id, opponent: opponent.chicken, mode: "TOURNAMENT", modeContextId: id });
    const combatView = await createSession({ fighterId: chicken.id, encounterId: encounter.id, coachingMode: config.coachingMode ?? "MANUAL", openingCommand: config.openingCommand ?? "WAIT", disconnectPolicy: config.disconnectPolicy ?? "KEEP_INSTRUCTION", idempotencyKey: encounter.id }, player.id);
    return NextResponse.json({ ...combatView, combatView, opponent: opponent.chicken });
  } catch (error) {
    if (error instanceof TournamentError) return NextResponse.json({ error: error.code }, { status: error.status });
    if (error instanceof CombatServiceError) return NextResponse.json({ error: error.code }, { status: error.status });
    return toErrorResponse(error);
  }
}
