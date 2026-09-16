import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { canFight, generatePveOpponent } from "@/lib/combat";
import type { Chicken } from "@/lib/types";
import { createCombatEncounter } from "@/lib/combat/service";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleOpponent(context);
}

export async function handleOpponent(
  { params }: { params: Promise<{ id: string }> },
  deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }
) {
  try {
    return await handlePost(params, deps);
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function handlePost(params: Promise<{ id: string }>, deps: { requirePlayer: typeof requirePlayer }) {
  const { id } = await params;
  const player = await deps.requirePlayer();
  const chicken = await prisma.chicken.findUnique({ where: { id } });

  if (!chicken || chicken.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }
  if (!canFight(chicken as unknown as Chicken)) {
    return NextResponse.json({ error: "Chicken cannot battle right now" }, { status: 400 });
  }

  const { opponent, encounter } = generatePveOpponent(chicken as unknown as Chicken);
  const combatEncounter = await createCombatEncounter({
    ownerPlayerId: player.id,
    fighterId: id,
    opponent,
    mode: "NORMAL",
    modeContextId: encounter.id,
  });

  return NextResponse.json({ opponent, encounter, combatEncounterId: combatEncounter.id });
}
