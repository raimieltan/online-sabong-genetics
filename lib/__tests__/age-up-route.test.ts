import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { POST } from "../../app/api/chickens/[id]/age-up/route";
import { GENETIC_STAT_KEYS, type GrowthStage, type StatBlock } from "../types";

function zeroBlock(): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = 50));
  return block;
}

async function seedChicken(playerId: string, growthStage: GrowthStage) {
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id,
      playerId,
      name: "Test",
      sex: "rooster",
      generation: 0,
      bloodlineId: id,
      iv: zeroBlock(),
      ev: zeroBlock(),
      traits: [],
      age: 1,
      health: 100,
      energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
      growthStage,
    },
  });
  return id;
}

function postRequest(id: string) {
  return new Request(`http://localhost/api/chickens/${id}/age-up`, { method: "POST" });
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/chickens/:id/age-up advances the growth stage and increments age", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, "chick");

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 200);

  const chicken = await response.json();
  assert.equal(chicken.growthStage, "juvenile");
  assert.equal(chicken.age, 2);
});

test("POST /api/chickens/:id/age-up returns 404 for an unknown chicken", async () => {
  const response = await POST(postRequest("missing"), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/age-up returns 404 for a chicken owned by another player", async () => {
  await getOrCreatePlayer();
  const otherPlayer = await prisma.player.create({ data: {} });
  const id = await seedChicken(otherPlayer.id, "chick");

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/age-up returns 400 for a senior chicken", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, "senior");

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 400);
});

test("POST /api/chickens/:id/age-up returns requirements when the chicken is not ready", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, "chick");
  await prisma.chicken.update({ where: { id }, data: { energy: 20 } });

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 400);

  const body = await response.json();
  assert.equal(body.error, "Chicken is not ready to age up");
  assert.deepEqual(body.unmetRequirements.map((requirement: { id: string }) => requirement.id), ["energy"]);
});
