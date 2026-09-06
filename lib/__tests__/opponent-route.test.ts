import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { POST } from "../../app/api/chickens/[id]/opponent/route";
import { FIGHTING_STYLES, GENETIC_STAT_KEYS, type GrowthStage, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedChicken(
  playerId: string,
  overrides: { growthStage?: GrowthStage; iv?: StatBlock } = {},
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
      iv: overrides.iv ?? statBlock(50),
      ev: statBlock(0),
      traits: [],
      age: 1,
      health: 100,
      energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
      growthStage: overrides.growthStage ?? "adult",
    },
  });
  return id;
}

function postRequest(id: string) {
  return new Request(`http://localhost/api/chickens/${id}/opponent`, { method: "POST" });
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/chickens/:id/opponent returns a full, unpersisted NPC chicken", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id);

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 200);

  const opponent = await response.json();
  assert.ok(opponent.id);
  assert.ok(FIGHTING_STYLES.includes(opponent.fightingStyle));
  assert.ok(opponent.colorScheme?.feathers);
  assert.equal(opponent.injured, false);

  const stored = await prisma.chicken.findUnique({ where: { id: opponent.id } });
  assert.equal(stored, null);
});

test("POST /api/chickens/:id/opponent returns 404 for an unknown chicken", async () => {
  const response = await POST(postRequest("missing"), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/opponent returns 400 when the chicken cannot battle", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, { growthStage: "chick" });

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 400);
});
