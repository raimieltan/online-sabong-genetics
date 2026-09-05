import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { POST } from "../../app/api/chickens/[id]/tournament/route";
import { GENETIC_STAT_KEYS, type GrowthStage, type StatBlock } from "../types";

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
      iv: overrides.iv ?? statBlock(80),
      ev: statBlock(50),
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
  return new Request(`http://localhost/api/chickens/${id}/tournament`, { method: "POST" });
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/chickens/:id/tournament returns 404 for an unknown chicken", async () => {
  const response = await POST(postRequest("missing"), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(response.status, 404);
});

test("POST /api/chickens/:id/tournament returns 400 when the chicken cannot battle", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id, { growthStage: "chick" });

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 400);
});

test("POST /api/chickens/:id/tournament runs a full bracket and updates the chicken's record", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id);

  const response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.ok(body.matches.length >= 1);
  assert.ok([1, 2, 3, null].includes(body.placement));

  const updated = await prisma.chicken.findUnique({ where: { id } });
  const record = updated!.record as { wins: number; losses: number };
  assert.equal(record.wins + record.losses, body.matches.length);

  if (body.tokensAwarded > 0) {
    const updatedPlayer = await prisma.player.findUnique({ where: { id: player.id } });
    assert.equal(updatedPlayer!.tournamentTokens, player.tournamentTokens + body.tokensAwarded);
    assert.equal(body.tournamentTokens, updatedPlayer!.tournamentTokens);
  }
});

test("POST /api/chickens/:id/tournament awards a championship on the chicken's record for a 1st-place finish", async () => {
  const player = await getOrCreatePlayer();
  // Overwhelming stats make winning the whole bracket near-certain.
  const id = await seedChicken(player.id, { iv: statBlock(99) });

  let response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
  let body = await response.json();

  // Retry a few times in case of an unlucky roll — this is a probabilistic combat sim.
  for (let attempt = 0; attempt < 5 && body.placement !== 1; attempt++) {
    await prisma.chicken.update({ where: { id }, data: { injured: false, status: "active", health: 100 } });
    response = await POST(postRequest(id), { params: Promise.resolve({ id }) });
    body = await response.json();
  }

  assert.equal(body.placement, 1);
  const updated = await prisma.chicken.findUnique({ where: { id } });
  const record = updated!.record as { championships: number };
  assert.ok(record.championships >= 1);
});
