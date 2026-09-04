import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { inheritStatBlock } from "@/lib/genetics";
import { getOrCreatePlayer } from "@/lib/player";
import { inheritTraits } from "@/lib/traits";
import type { StatBlock, Trait } from "@/lib/types";

export async function POST(request: Request) {
  const body = (await request.json()) as { fatherId?: string; motherId?: string };
  const { fatherId, motherId } = body;

  if (!fatherId || !motherId) {
    return NextResponse.json({ error: "fatherId and motherId are required" }, { status: 400 });
  }

  const player = await getOrCreatePlayer();
  const [father, mother] = await Promise.all([
    prisma.chicken.findUnique({ where: { id: fatherId } }),
    prisma.chicken.findUnique({ where: { id: motherId } }),
  ]);

  if (!father || !mother) {
    return NextResponse.json({ error: "Both parents must exist" }, { status: 404 });
  }
  if (father.playerId !== player.id || mother.playerId !== player.id) {
    return NextResponse.json({ error: "Both parents must be owned by the player" }, { status: 403 });
  }
  if (father.sex !== "rooster" || mother.sex !== "hen") {
    return NextResponse.json(
      { error: "fatherId must be a rooster and motherId must be a hen" },
      { status: 400 }
    );
  }

  const iv = inheritStatBlock(father.iv as unknown as StatBlock, mother.iv as unknown as StatBlock);
  const traits = inheritTraits(father.traits as unknown as Trait[], mother.traits as unknown as Trait[]);
  const generation = Math.max(father.generation, mother.generation) + 1;

  const egg = await prisma.egg.create({
    data: {
      id: randomUUID(),
      playerId: player.id,
      fatherId: father.id,
      motherId: mother.id,
      bloodlineId: father.bloodlineId,
      generation,
      sex: Math.random() < 0.5 ? "rooster" : "hen",
      iv,
      traits,
      status: "incubating",
    },
  });

  return NextResponse.json(egg, { status: 201 });
}
