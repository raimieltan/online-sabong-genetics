import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { createChicken, generateUniqueChickName } from "@/lib/chickenGenerator";
import { prisma } from "@/lib/db";
import type { ChickenColorScheme, MutationGenome, PhysicalBlock, StatBlock, Trait } from "@/lib/types";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleHatch(context);
}

export async function handleHatch(
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
  const egg = await prisma.egg.findUnique({ where: { id } });

  if (!egg || egg.playerId !== player.id) {
    return NextResponse.json({ error: "Egg not found" }, { status: 404 });
  }
  if (egg.status !== "incubating") {
    return NextResponse.json({ error: "Egg has already hatched" }, { status: 400 });
  }

  const name = await generateUniqueChickName(async (candidate) => {
    const existing = await prisma.chicken.findFirst({ where: { name: candidate }, select: { id: true } });
    return existing !== null;
  });

  const chick = createChicken({
    name,
    sex: egg.sex as "rooster" | "hen",
    generation: egg.generation,
    parents: { fatherId: egg.fatherId, motherId: egg.motherId },
    bloodlineId: egg.bloodlineId,
    breed: egg.breed ?? undefined,
    iv: egg.iv as unknown as StatBlock,
    physical: egg.physical as unknown as PhysicalBlock,
    colorScheme: egg.colorScheme as unknown as ChickenColorScheme,
    mutations: egg.mutations as unknown as MutationGenome,
    traits: egg.traits as unknown as Trait[],
    growthStage: "chick",
  });

  const [chicken] = await prisma.$transaction([
    prisma.chicken.create({
      data: {
        id: chick.id,
        playerId: player.id,
        name: chick.name,
        sex: chick.sex,
        generation: chick.generation,
        fatherId: chick.parents.fatherId,
        motherId: chick.parents.motherId,
        bloodlineId: chick.bloodlineId,
        breed: chick.breed,
        iv: chick.iv,
        ev: chick.ev,
        physical: chick.physical,
        mutations: chick.mutations,
        traits: chick.traits,
        age: chick.age,
        health: chick.health,
        energy: chick.energy,
        record: chick.record,
        status: chick.status,
        growthStage: chick.growthStage,
        fightingStyle: chick.fightingStyle,
        colorScheme: chick.colorScheme,
        injured: chick.injured,
      },
    }),
    prisma.egg.delete({ where: { id: egg.id } }),
  ]);

  return NextResponse.json(chicken, { status: 201 });
}
