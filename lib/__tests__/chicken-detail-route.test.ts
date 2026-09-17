import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../db";
import { UnauthenticatedError } from "../auth/errors";
import { handleGetChicken } from "../../app/api/chickens/[id]/route";
import { ensureTestAuthUser } from "./testHelpers";

const OWNER_AUTH_ID = "66666666-6666-6666-6666-666666666666";
const REQUESTER_AUTH_ID = "77777777-7777-7777-7777-777777777777";

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
  await Promise.all([ensureTestAuthUser(OWNER_AUTH_ID), ensureTestAuthUser(REQUESTER_AUTH_ID)]);
});

async function createTestChicken(playerId: string, id: string) {
  return prisma.chicken.create({
    data: {
      id,
      playerId,
      name: "Test",
      sex: "MALE",
      generation: 0,
      bloodlineId: "bloodline-1",
      iv: {},
      ev: {},
      traits: [],
      age: 1,
      health: 100,
      energy: 100,
      record: { wins: 0, losses: 0 },
      status: "IDLE",
      growthStage: "ADULT",
    },
  });
}

test("GET /api/chickens/:id returns the chicken for its owner", async () => {
  const owner = await prisma.player.create({ data: { authUserId: OWNER_AUTH_ID } });
  const chicken = await createTestChicken(owner.id, "chk-owner-1");

  const res = await handleGetChicken(
    { params: Promise.resolve({ id: chicken.id }) },
    { requirePlayer: async () => owner }
  );

  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, chicken.id);
});

test("GET /api/chickens/:id returns 404 for an unknown id", async () => {
  const owner = await prisma.player.create({ data: { authUserId: OWNER_AUTH_ID } });

  const res = await handleGetChicken(
    { params: Promise.resolve({ id: "missing" }) },
    { requirePlayer: async () => owner }
  );

  assert.equal(res.status, 404);
});

test("GET returns 404 for another player's chicken", async () => {
  const owner = await prisma.player.create({ data: { authUserId: OWNER_AUTH_ID } });
  const requester = await prisma.player.create({ data: { authUserId: REQUESTER_AUTH_ID } });
  const chicken = await createTestChicken(owner.id, "chk-owner-2");

  const res = await handleGetChicken(
    { params: Promise.resolve({ id: chicken.id }) },
    { requirePlayer: async () => requester }
  );

  assert.equal(res.status, 404);
});

test("GET returns 401 when unauthenticated", async () => {
  const res = await handleGetChicken(
    { params: Promise.resolve({ id: "chk-owner-1" }) },
    {
      requirePlayer: async () => {
        throw new UnauthenticatedError();
      },
    }
  );

  assert.equal(res.status, 401);
});
