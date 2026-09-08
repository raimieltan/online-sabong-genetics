import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { POST } from "../../app/api/chickens/[id]/train/route";
import { ENERGY_PER_TRAIN, EV_PER_TRAIN } from "../training";
import { GENETIC_STAT_KEYS, type GrowthStage, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedChicken(
  playerId: string,
  overrides: { growthStage?: GrowthStage; energy?: number; ev?: StatBlock } = {},
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
      ev: overrides.ev ?? statBlock(0),
      traits: [],
      age: 1,
      health: 100,
      energy: overrides.energy ?? 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
      growthStage: overrides.growthStage ?? "adult",
    },
  });
  return id;
}

function postRequest(id: string, stat: string) {
  return new Request(`http://localhost/api/chickens/${id}/train`, {
    method: "POST",
    body: JSON.stringify({ stat }),
  });
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/chickens/:id/train raises the trained stat's EV and spends energy", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, {});

  const response = await POST(postRequest(id, "power"), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 200);

  const chicken = await response.json();
  assert.equal(chicken.ev.power, EV_PER_TRAIN);
  assert.equal(chicken.energy, 100 - ENERGY_PER_TRAIN);
});

test("POST /api/chickens/:id/train returns 404 for an unknown chicken", async () => {
  const response = await POST(postRequest("missing", "power"), {
    params: Promise.resolve({ id: "missing" }),
  });
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/train returns 404 for a chicken owned by another player", async () => {
  await getOrCreatePlayer();
  const otherPlayer = await prisma.player.create({ data: {} });
  const id = await seedChicken(otherPlayer.id, {});

  const response = await POST(postRequest(id, "power"), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/train returns 400 for an invalid stat", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, {});

  const response = await POST(postRequest(id, "not-a-stat"), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 400);
});

test("POST /api/chickens/:id/train returns 400 for a chick (untrainable stage)", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, { growthStage: "chick" });

  const response = await POST(postRequest(id, "power"), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 400);
});

test("POST /api/chickens/:id/train returns 400 when energy is insufficient", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, { energy: ENERGY_PER_TRAIN - 1 });

  const response = await POST(postRequest(id, "power"), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 400);
});

test("POST /api/chickens/:id/train accepts an intensity and returns roosterTraining + stressGain", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, {});

  const response = await POST(
    new Request(`http://localhost/api/chickens/${id}/train`, {
      method: "POST",
      body: JSON.stringify({ stat: "power", intensity: "hard" }),
    }),
    { params: Promise.resolve({ id }) }
  );
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.ok(body.roosterTraining);
  assert.ok(body.stressGain > 0);
});
