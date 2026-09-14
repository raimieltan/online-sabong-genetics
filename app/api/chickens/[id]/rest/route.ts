import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";
import { applyRecovery, type RecoveryMethod } from "@/lib/recovery/engine";
import type { Chicken } from "@/lib/types";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const row = await prisma.chicken.findUnique({ where: { id } });

  if (!row || row.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }
  const chicken = row as unknown as Chicken;

  const body = (await request.json().catch(() => ({}))) as { method?: RecoveryMethod };
  const method: RecoveryMethod = body.method === "extended_rest" ? "extended_rest" : "rest";

  const result = applyRecovery(chicken, method, 0);

  const updated = await prisma.chicken.update({
    where: { id },
    data: {
      energy: result.energy,
      condition: result.condition,
      stress: result.stress,
      morale: result.morale,
      trainingState: result.trainingState as object,
      injuries: result.injuries as object,
      illnesses: result.illnesses as object,
      injured: result.injuries.some((i) => !i.permanent && i.recoveryRemaining > 0),
    },
  });

  return NextResponse.json(updated);
}
