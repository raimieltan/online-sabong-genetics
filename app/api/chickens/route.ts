import { NextResponse } from "next/server";

import { generateUniqueRandomChicken } from "@/lib/chickenGenerator";
import { prisma } from "@/lib/db";
import { getOrCreatePlayer } from "@/lib/player";

export async function GET() {
  const player = await getOrCreatePlayer();
  const chickens = await prisma.chicken.findMany({
    where: { playerId: player.id },
    orderBy: { createdAt: "asc" },
  });
  return NextResponse.json(chickens);
}

export async function POST() {
  const player = await getOrCreatePlayer();
  const generated = await generateUniqueRandomChicken({}, async (name) => {
    const existing = await prisma.chicken.findFirst({ where: { name }, select: { id: true } });
    return existing !== null;
  });

  const chicken = await prisma.chicken.create({
    data: {
      id: generated.id,
      playerId: player.id,
      name: generated.name,
      sex: generated.sex,
      generation: generated.generation,
      fatherId: generated.parents.fatherId,
      motherId: generated.parents.motherId,
      bloodlineId: generated.bloodlineId,
      breed: generated.breed,
      iv: generated.iv,
      ev: generated.ev,
      physical: generated.physical,
      mutations: generated.mutations,
      traits: generated.traits,
      age: generated.age,
      health: generated.health,
      energy: generated.energy,
      record: generated.record,
      status: generated.status,
      growthStage: generated.growthStage,
      fightingStyle: generated.fightingStyle,
      colorScheme: generated.colorScheme,
      injured: generated.injured,
    },
  });

  return NextResponse.json(chicken, { status: 201 });
}
