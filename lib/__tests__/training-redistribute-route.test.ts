import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { getOrCreateRoosterTraining } from "../training/service";
import { POST } from "../../app/api/chickens/[id]/training/redistribute/route";
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

function postRequest(id: string, body: unknown) {
  return new Request(`http://localhost/api/chickens/${id}/training/redistribute`, {
    method: "POST",
    body: JSON.stringify(body),
  });
}

test.beforeEach(async () => {
  await prisma.roosterTraining.deleteMany();
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST redistribute moves effort and returns the updated RoosterTraining state", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id);
  const roosterTraining = await getOrCreateRoosterTraining(id, statBlock(50));
  await prisma.roosterTraining.update({
    where: { id: roosterTraining.id },
    data: { effortSpent: { ...roosterTraining.effortSpent, power: 40 } },
  });

  const response = await POST(postRequest(id, { from: "power", to: "speed", amount: 10 }), {
    params: Promise.resolve({ id }),
  });
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.effortSpent.power, 30);
  assert.equal(body.effortSpent.speed, 10);
});

test("POST redistribute returns 400 for an invalid stat", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id);
  await getOrCreateRoosterTraining(id, statBlock(50));

  const response = await POST(postRequest(id, { from: "not-a-stat", to: "speed", amount: 10 }), {
    params: Promise.resolve({ id }),
  });
  assert.equal(response.status, 400);
});

test("POST redistribute returns 404 for an unknown chicken", async () => {
  const response = await POST(postRequest("missing", { from: "power", to: "speed", amount: 10 }), {
    params: Promise.resolve({ id: "missing" }),
  });
  assert.equal(response.status, 404);
});
