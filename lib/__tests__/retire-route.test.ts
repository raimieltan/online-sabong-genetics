import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { POST } from "../../app/api/chickens/[id]/retire/route";
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
      age: 5,
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
  return new Request(`http://localhost/api/chickens/${id}/retire`, { method: "POST" });
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/chickens/:id/retire sets growthStage and status to retired", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, "senior");

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 200);

  const chicken = await response.json();
  assert.equal(chicken.growthStage, "retired");
  assert.equal(chicken.status, "retired");
});

test("POST /api/chickens/:id/retire returns 404 for an unknown chicken", async () => {
  const response = await POST(postRequest("missing"), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/retire returns 404 for a chicken owned by another player", async () => {
  await getOrCreatePlayer();
  const otherPlayer = await prisma.player.create({ data: {} });
  const id = await seedChicken(otherPlayer.id, "senior");

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/retire returns 400 for a non-senior chicken", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, "adult");

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 400);
});
