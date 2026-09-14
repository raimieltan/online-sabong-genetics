import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { getOrCreateRoosterTraining, redistributeEffortForChicken } from "../training/service";
import { TrainingError } from "../training/errors";
import { REDISTRIBUTE_CREDITS_PER_POINT } from "../training/effort";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedChicken(playerId: string) {
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id,
      playerId,
      name: "Test",
      sex: "rooster",
      generation: 0,
      bloodlineId: id,
      iv: statBlock(50),
      ev: statBlock(0),
      traits: [],
      age: 1,
      health: 100,
      energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
      growthStage: "adult",
    },
  });
  return id;
}

test.beforeEach(async () => {
  await prisma.roosterTraining.deleteMany();
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("getOrCreateRoosterTraining creates a row once and reuses it after", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);

  const first = await getOrCreateRoosterTraining(chickenId, statBlock(50));
  const second = await getOrCreateRoosterTraining(chickenId, statBlock(50));

  assert.equal(first.id, second.id);
  assert.equal(first.physicalXP, 0);
});

test("redistributeEffortForChicken moves effort and debits credits", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);
  const roosterTraining = await getOrCreateRoosterTraining(chickenId, statBlock(50));

  await prisma.roosterTraining.update({
    where: { id: roosterTraining.id },
    data: { effortSpent: { ...roosterTraining.effortSpent, power: 40 } },
  });

  const before = await prisma.player.findUnique({ where: { id: player.id } });
  const result = await redistributeEffortForChicken(player.id, chickenId, "power", "speed", 10);

  const after = await prisma.player.findUnique({ where: { id: player.id } });
  assert.equal(result.effortSpent.power, 30);
  assert.equal(result.effortSpent.speed, 10);
  assert.equal(before!.credits - after!.credits, 10 * REDISTRIBUTE_CREDITS_PER_POINT);
});

test("redistributeEffortForChicken throws INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE when the player can't afford it", async () => {
  const player = await getOrCreatePlayer();
  const chickenId = await seedChicken(player.id);
  const roosterTraining = await getOrCreateRoosterTraining(chickenId, statBlock(50));
  await prisma.roosterTraining.update({
    where: { id: roosterTraining.id },
    data: { effortSpent: { ...roosterTraining.effortSpent, power: 40 } },
  });
  await prisma.player.update({ where: { id: player.id }, data: { credits: 0 } });

  await assert.rejects(
    () => redistributeEffortForChicken(player.id, chickenId, "power", "speed", 10),
    (err: unknown) => err instanceof TrainingError && err.code === "INSUFFICIENT_CREDITS_FOR_REDISTRIBUTE"
  );
});
