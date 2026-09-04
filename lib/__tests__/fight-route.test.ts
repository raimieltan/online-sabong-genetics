import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { generateRandomChicken } from "../chickenGenerator";
import { POST } from "../../app/api/chickens/[id]/fight/route";
import { GENETIC_STAT_KEYS, type Chicken, type GrowthStage, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedChicken(
  playerId: string,
  overrides: { growthStage?: GrowthStage; iv?: StatBlock; injured?: boolean } = {},
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
      iv: overrides.iv ?? statBlock(80),
      ev: statBlock(50),
      traits: [],
      age: 1,
      health: 100,
      energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
      growthStage: overrides.growthStage ?? "adult",
      injured: overrides.injured ?? false,
    },
  });
  return id;
}

function postRequest(id: string, opponent: Chicken) {
  return new Request(`http://localhost/api/chickens/${id}/fight`, {
    method: "POST",
    body: JSON.stringify({ opponent }),
  });
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/chickens/:id/fight runs a fight and updates the player chicken's record", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, { iv: statBlock(90) });
  const opponent = generateRandomChicken({ name: "NPC" });

  const response = await POST(postRequest(id, opponent), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.ok(body.result.winnerId === id || body.result.winnerId === opponent.id);
  assert.ok(Array.isArray(body.log));
  assert.ok(body.log.length > 0);

  const updated = await prisma.chicken.findUnique({ where: { id } });
  const wonOrLost = updated!.record as { wins: number; losses: number };
  assert.equal(wonOrLost.wins + wonOrLost.losses, 1);
});

test("POST /api/chickens/:id/fight returns 404 for an unknown chicken", async () => {
  const opponent = generateRandomChicken({ name: "NPC" });
  const response = await POST(postRequest("missing", opponent), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/fight returns 400 when the chicken cannot battle", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, { growthStage: "chick" });
  const opponent = generateRandomChicken({ name: "NPC" });

  const response = await POST(postRequest(id, opponent), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 400);
});

test("POST /api/chickens/:id/fight returns 400 when the chicken is already injured", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, { injured: true });
  const opponent = generateRandomChicken({ name: "NPC" });

  const response = await POST(postRequest(id, opponent), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 400);
});
