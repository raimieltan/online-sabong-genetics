import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
import { generateUniqueRandomChicken } from "@/lib/chickenGenerator";
import { prisma } from "@/lib/db";

export async function GET() {
  return handleGetChickens();
}

export async function handleGetChickens(deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }) {
  try {
    return await handleGet(deps);
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function handleGet(deps: { requirePlayer: typeof requirePlayer }) {
  const player = await deps.requirePlayer();
  const chickens = await prisma.chicken.findMany({
    where: { playerId: player.id },
    orderBy: { createdAt: "asc" },
  });
  const developmentRows = await prisma.roosterTraining.findMany({
    where: { chickenId: { in: chickens.map((chicken) => chicken.id) } },
  });
  const developmentByChicken = new Map(
    developmentRows.map((row) => [row.chickenId, {
      physicalXP: row.physicalXP,
      combatXP: row.combatXP,
      tacticalXP: row.tacticalXP,
      disciplineXP: row.disciplineXP,
      recoveryXP: row.recoveryXP,
      effortSpent: row.effortSpent,
      trainingPotential: row.trainingPotential,
      discovered: row.discovered,
      traits: row.traits,
      breakthroughs: row.breakthroughs,
      traitProgress: row.traitProgress,
      specializationProgress: row.specializationProgress,
    }]),
  );
  return NextResponse.json(chickens.map((chicken) => ({
    ...chicken,
    trainingDevelopment: developmentByChicken.get(chicken.id) ?? null,
  })));
}

export async function POST() {
  return handleCreateChicken();
}

export async function handleCreateChicken(deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }) {
  try {
    return await handlePost(deps);
  } catch (error) {
    return toErrorResponse(error);
  }
}

async function handlePost(deps: { requirePlayer: typeof requirePlayer }) {
  const player = await deps.requirePlayer();
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
