import { NextResponse } from "next/server";

import { hasActiveInjury, tickInjuryRecovery } from "@/lib/career/injuries";
import { recoverCondition } from "@/lib/career/condition";
import { prisma } from "@/lib/db";
import { healChicken } from "@/lib/combat";
import { getOrCreatePlayer } from "@/lib/player";
import type { Chicken, InjuryRecord } from "@/lib/types";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const player = await getOrCreatePlayer();
  const row = await prisma.chicken.findUnique({ where: { id } });

  if (!row || row.playerId !== player.id) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  const chicken = row as unknown as Chicken;
  const { health } = healChicken();
  // A full heal clears out whatever's left of any non-permanent injury outright
  // (spec §27-28: heal/rest is one of the paths condition recovers through).
  const injuries: InjuryRecord[] = tickInjuryRecovery((chicken.injuries ?? []).map((i) => ({ ...i, recoveryRemaining: 0 })));
  const condition = recoverCondition(chicken.condition ?? 100, 100);

  const updated = await prisma.chicken.update({
    where: { id },
    data: { injured: hasActiveInjury(injuries), health, injuries, condition },
  });

  return NextResponse.json(updated);
}
