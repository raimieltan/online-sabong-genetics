import test from "node:test";
import assert from "node:assert/strict";

import { prisma } from "../db";
import { STARTING_CREDITS } from "../economy";
import { GET } from "../../app/api/player/route";

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("GET /api/player returns the wallet with starting credits for a new player", async () => {
  const response = await GET();
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.credits, STARTING_CREDITS);
  assert.equal(body.tournamentTokens, 0);
  assert.ok(body.id);
});
