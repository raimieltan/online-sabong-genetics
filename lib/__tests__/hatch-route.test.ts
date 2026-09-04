import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { POST } from "../../app/api/eggs/[id]/hatch/route";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

function zeroBlock(): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = 50));
  return block;
}

async function seedEgg(playerId: string, overrides: Partial<{ status: string }> = {}) {
  const id = randomUUID();
  await prisma.egg.create({
    data: {
      id,
      playerId,
      fatherId: randomUUID(),
      motherId: randomUUID(),
      bloodlineId: "line-1",
      generation: 1,
      sex: "hen",
      iv: zeroBlock(),
      traits: [{ id: "iron-stamina", name: "Iron Stamina", rarity: "common", description: "x" }],
      status: overrides.status ?? "incubating",
    },
  });
  return id;
}

function postRequest(id: string) {
  return new Request(`http://localhost/api/eggs/${id}/hatch`, { method: "POST" });
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/eggs/:id/hatch creates a chick and deletes the egg", async () => {
  const player = await getOrCreatePlayer();
  const eggId = await seedEgg(player.id);

  const response = await POST(postRequest(eggId), { params: Promise.resolve({ id: eggId }) });
  assert.equal(response.status, 201);

  const chicken = await response.json();
  assert.equal(chicken.growthStage, "chick");
  assert.equal(chicken.bloodlineId, "line-1");
  assert.equal(chicken.generation, 1);
  assert.equal(chicken.age, 0);
  assert.equal(chicken.status, "active");
  assert.equal(chicken.traits.length, 1);

  const remainingEgg = await prisma.egg.findUnique({ where: { id: eggId } });
  assert.equal(remainingEgg, null);
});

test("POST /api/eggs/:id/hatch assigns a random name, not a fixed placeholder", async () => {
  const player = await getOrCreatePlayer();

  const names = new Set<string>();
  for (let i = 0; i < 10; i += 1) {
    const eggId = await seedEgg(player.id);
    const response = await POST(postRequest(eggId), { params: Promise.resolve({ id: eggId }) });
    const chicken = await response.json();
    assert.notEqual(chicken.name, "New Chick");
    names.add(chicken.name);
  }
  assert.ok(names.size > 1, "expected varied names across hatches");
});

test("POST /api/eggs/:id/hatch returns 404 for an unknown egg", async () => {
  const response = await POST(postRequest("missing"), { params: Promise.resolve({ id: "missing" }) });
  assert.equal(response.status, 404);
});

test("POST /api/eggs/:id/hatch returns 404 for an egg owned by another player", async () => {
  await getOrCreatePlayer();
  const otherPlayer = await prisma.player.create({ data: {} });
  const eggId = await seedEgg(otherPlayer.id);

  const response = await POST(postRequest(eggId), { params: Promise.resolve({ id: eggId }) });
  assert.equal(response.status, 404);
});

test("POST /api/eggs/:id/hatch returns 400 for an already-hatched egg", async () => {
  const player = await getOrCreatePlayer();
  const eggId = await seedEgg(player.id, { status: "hatched" });

  const response = await POST(postRequest(eggId), { params: Promise.resolve({ id: eggId }) });
  assert.equal(response.status, 400);
});
