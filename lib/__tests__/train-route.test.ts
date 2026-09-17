import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { handleTrain } from "../../app/api/chickens/[id]/train/route";
import { createOtherTestPlayer, getOrCreateTestPlayer, testRequirePlayer } from "./testHelpers";
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

test("POST /api/chickens/:id/train starts an authoritative training session", async () => {
  const player = await getOrCreateTestPlayer();
  const id = await seedChicken(player.id, {});

  const response = await handleTrain(postRequest(id, "power"), { params: Promise.resolve({ id }) }, testRequirePlayer(player));
  assert.equal(response.status, 202);

  const session = await response.json();
  assert.equal(session.status, "ACTIVE");
  assert.equal(session.programId, "STRENGTH");
  const chicken = await prisma.chicken.findUniqueOrThrow({ where: { id } });
  assert.equal((chicken.ev as Record<string, number>).power, 0);
  assert.equal(chicken.energy, 100);
});

test("POST /api/chickens/:id/train returns 404 for an unknown chicken", async () => {
  const player = await getOrCreateTestPlayer();
  const response = await handleTrain(postRequest("missing", "power"), {
    params: Promise.resolve({ id: "missing" }),
  }, testRequirePlayer(player));
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/train returns 404 for a chicken owned by another player", async () => {
  const player = await getOrCreateTestPlayer();
  const otherPlayer = await createOtherTestPlayer();
  const id = await seedChicken(otherPlayer.id, {});

  const response = await handleTrain(postRequest(id, "power"), { params: Promise.resolve({ id }) }, testRequirePlayer(player));
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/train returns 400 for an invalid stat", async () => {
  const player = await getOrCreateTestPlayer();
  const id = await seedChicken(player.id, {});

  const response = await handleTrain(postRequest(id, "not-a-stat"), { params: Promise.resolve({ id }) }, testRequirePlayer(player));
  assert.equal(response.status, 400);
});

test("POST /api/chickens/:id/train returns 400 for a chick (untrainable stage)", async () => {
  const player = await getOrCreateTestPlayer();
  const id = await seedChicken(player.id, { growthStage: "chick" });

  const response = await handleTrain(postRequest(id, "power"), { params: Promise.resolve({ id }) }, testRequirePlayer(player));
  assert.equal(response.status, 400);
});

test("POST /api/chickens/:id/train returns 400 when energy is insufficient", async () => {
  const player = await getOrCreateTestPlayer();
  const id = await seedChicken(player.id, { energy: 0 });

  const response = await handleTrain(postRequest(id, "power"), { params: Promise.resolve({ id }) }, testRequirePlayer(player));
  assert.equal(response.status, 400);
});

test("POST /api/chickens/:id/train persists the requested intensity", async () => {
  const player = await getOrCreateTestPlayer();
  const id = await seedChicken(player.id, {});

  const response = await handleTrain(
    new Request(`http://localhost/api/chickens/${id}/train`, {
      method: "POST",
      body: JSON.stringify({ stat: "power", intensity: "hard" }),
    }),
    { params: Promise.resolve({ id }) },
    testRequirePlayer(player)
  );
  assert.equal(response.status, 202);

  const body = await response.json();
  assert.equal(body.status, "ACTIVE");
  assert.equal(body.intensity, "hard");
  assert.ok(body.stressCost > 0);
});
