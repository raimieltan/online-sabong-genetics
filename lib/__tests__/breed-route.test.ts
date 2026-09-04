import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { POST } from "../../app/api/breed/route";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

function zeroBlock(): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = 50));
  return block;
}

async function seedChicken(
  overrides: Partial<{ sex: string; generation: number; bloodlineId: string; growthStage: string }>
) {
  const player = await getOrCreatePlayer();
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id,
      playerId: player.id,
      name: "Test",
      sex: overrides.sex ?? "rooster",
      generation: overrides.generation ?? 0,
      bloodlineId: overrides.bloodlineId ?? id,
      iv: zeroBlock(),
      ev: zeroBlock(),
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

function postRequest(body: unknown) {
  return new Request("http://localhost/api/breed", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/breed creates an egg with the rooster's bloodline and generation + 1", async () => {
  const fatherId = await seedChicken({ sex: "rooster", generation: 2, bloodlineId: "father-line" });
  const motherId = await seedChicken({ sex: "hen", generation: 1 });

  const response = await POST(postRequest({ fatherId, motherId }));
  assert.equal(response.status, 201);

  const egg = await response.json();
  assert.equal(egg.bloodlineId, "father-line");
  assert.equal(egg.generation, 3);
  assert.equal(egg.status, "incubating");
  for (const key of GENETIC_STAT_KEYS) {
    assert.ok(egg.iv[key] >= 1 && egg.iv[key] <= 99);
  }
});

test("POST /api/breed rejects two roosters", async () => {
  const fatherId = await seedChicken({ sex: "rooster" });
  const secondRoosterId = await seedChicken({ sex: "rooster" });

  const response = await POST(postRequest({ fatherId, motherId: secondRoosterId }));
  assert.equal(response.status, 400);
});

test("POST /api/breed rejects a chick that hasn't reached adulthood", async () => {
  const fatherId = await seedChicken({ sex: "rooster", growthStage: "chick" });
  const motherId = await seedChicken({ sex: "hen" });

  const response = await POST(postRequest({ fatherId, motherId }));
  assert.equal(response.status, 400);
});

test("POST /api/breed rejects a missing parent id", async () => {
  const fatherId = await seedChicken({ sex: "rooster" });

  const response = await POST(postRequest({ fatherId, motherId: "does-not-exist" }));
  assert.equal(response.status, 404);
});
