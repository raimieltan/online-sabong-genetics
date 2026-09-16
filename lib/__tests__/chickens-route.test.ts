import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../db";
import { handleGetChickens, handleCreateChicken } from "../../app/api/chickens/route";
import { getOrCreateTestPlayer, testRequirePlayer } from "./testHelpers";

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("POST /api/chickens creates a chicken owned by the implicit player", async () => {
  const player = await getOrCreateTestPlayer();
  const response = await handleCreateChicken(testRequirePlayer(player));
  assert.equal(response.status, 201);
  const chicken = await response.json();
  assert.ok(chicken.id);
  assert.equal(chicken.generation, 0);

  const stored = await prisma.chicken.findUnique({ where: { id: chicken.id } });
  assert.ok(stored);
});

test("GET /api/chickens lists chickens for the player", async () => {
  const player = await getOrCreateTestPlayer();
  await handleCreateChicken(testRequirePlayer(player));
  await handleCreateChicken(testRequirePlayer(player));

  const response = await handleGetChickens(testRequirePlayer(player));
  const chickens = await response.json();
  assert.equal(chickens.length, 2);
});
