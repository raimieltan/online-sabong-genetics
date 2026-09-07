import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { inheritColorScheme, inheritMutations, inheritPhysicalBlock, inheritStatBlock } from "@/lib/genetics";
import { canBreed } from "@/lib/growth";
import { getOrCreatePlayer } from "@/lib/player";
import { inheritTraits } from "@/lib/traits";
import type { ChickenColorScheme, GrowthStage, MutationGenome, PhysicalBlock, StatBlock, Trait } from "@/lib/types";

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
  if (!canBreed(father.growthStage as GrowthStage) || !canBreed(mother.growthStage as GrowthStage)) {
    return NextResponse.json(
      { error: "Both parents must be old enough to breed (adult or older)" },
      { status: 400 }
    );
  }

  const iv = inheritStatBlock(father.iv as unknown as StatBlock, mother.iv as unknown as StatBlock);
  const physical = inheritPhysicalBlock(
    father.physical as unknown as PhysicalBlock,
    mother.physical as unknown as PhysicalBlock
  );
  const mutations = inheritMutations(
    father.mutations as unknown as MutationGenome,
    mother.mutations as unknown as MutationGenome
  );
  const traits = inheritTraits(father.traits as unknown as Trait[], mother.traits as unknown as Trait[]);
  const colorScheme = inheritColorScheme(
    father.colorScheme as unknown as ChickenColorScheme,
    mother.colorScheme as unknown as ChickenColorScheme
  );
  const generation = Math.max(father.generation, mother.generation) + 1;
  // Purebred parents produce a purebred chick; any other pairing is "mixed" (undefined) — flavor only, never read by combat.
  const breed = father.breed && father.breed === mother.breed ? father.breed : undefined;

  const egg = await prisma.egg.create({
    data: {
      id: randomUUID(),
      playerId: player.id,
      fatherId: father.id,
      motherId: mother.id,
      bloodlineId: father.bloodlineId,
      breed,
      generation,
      sex: Math.random() < 0.5 ? "rooster" : "hen",
      iv,
      physical,
      colorScheme,
      mutations,
      traits,
      status: "incubating",
    },
  });

  return NextResponse.json(egg, { status: 201 });
}
