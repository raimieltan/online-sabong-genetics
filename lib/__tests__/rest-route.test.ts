import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { POST } from "../../app/api/chickens/[id]/rest/route";
import { MAX_ENERGY } from "../training";
import { GENETIC_STAT_KEYS, type GrowthStage, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedChicken(
  playerId: string,
  overrides: { growthStage?: GrowthStage; energy?: number } = {},
) {
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
      energy: overrides.energy ?? 20,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
      growthStage: overrides.growthStage ?? "chick",
    },
  });
  return id;
}

function postRequest(id: string) {
  return new Request(`http://localhost/api/chickens/${id}/rest`, { method: "POST" });
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/chickens/:id/rest restores energy to MAX_ENERGY", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, { energy: 5 });

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 200);

  const chicken = await response.json();
  assert.equal(chicken.energy, MAX_ENERGY);
});

test("POST /api/chickens/:id/rest works even for a chick (no growth-stage gate)", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, { growthStage: "chick", energy: 0 });

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 200);
});

test("POST /api/chickens/:id/rest returns 404 for an unknown chicken", async () => {
  const response = await POST(postRequest("missing"), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/rest returns 404 for a chicken owned by another player", async () => {
  await getOrCreatePlayer();
  const otherPlayer = await prisma.player.create({ data: {} });
  const id = await seedChicken(otherPlayer.id, {});

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 404);
});
