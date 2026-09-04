import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { POST } from "../../app/api/chickens/[id]/heal/route";
import { MAX_HEALTH } from "../combat";
import { GENETIC_STAT_KEYS, type GrowthStage, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedChicken(
  playerId: string,
  overrides: { growthStage?: GrowthStage; injured?: boolean; health?: number } = {},
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
      health: overrides.health ?? 10,
      energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
      growthStage: overrides.growthStage ?? "adult",
      fightingStyle: "balanced",
      injured: overrides.injured ?? true,
    },
  });
  return id;
}

function postRequest(id: string) {
  return new Request(`http://localhost/api/chickens/${id}/heal`, { method: "POST" });
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/chickens/:id/heal clears the injured flag and restores health", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, { injured: true, health: 5 });

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 200);

  const chicken = await response.json();
  assert.equal(chicken.injured, false);
  assert.equal(chicken.health, MAX_HEALTH);
});

test("POST /api/chickens/:id/heal returns 404 for an unknown chicken", async () => {
  const response = await POST(postRequest("missing"), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/heal returns 404 for a chicken owned by another player", async () => {
  await getOrCreatePlayer();
  const otherPlayer = await prisma.player.create({ data: {} });
  const id = await seedChicken(otherPlayer.id, {});

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 404);
});
