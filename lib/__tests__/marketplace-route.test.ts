import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { getOrCreatePlayer } from "../player";
import { generateListing, MARKET_STOCK_SIZE } from "../marketplace";
import { GET as marketGET } from "../../app/api/marketplace/route";
import { POST as buyPOST } from "../../app/api/marketplace/[id]/buy/route";
import { POST as sellPOST } from "../../app/api/chickens/[id]/sell/route";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedListing(price: number) {
  const listing = generateListing();
  await prisma.marketListing.create({ data: { ...listing, price } });
  return listing.id;
}

async function seedChicken(playerId: string) {
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
      health: 100,
      energy: 100,
      record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
      status: "active",
      growthStage: "adult",
    },
  });
  return id;
}

test.beforeEach(async () => {
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.marketListing.deleteMany();
  await prisma.player.deleteMany();
});

test("GET /api/marketplace restocks up to MARKET_STOCK_SIZE listings when empty", async () => {
  const response = await marketGET();
  assert.equal(response.status, 200);

  const listings = await response.json();
  assert.equal(listings.length, MARKET_STOCK_SIZE);
});

test("GET /api/marketplace does not restock when already at full stock", async () => {
  await marketGET();
  const before = await prisma.marketListing.findMany();

  await marketGET();
  const after = await prisma.marketListing.findMany();

  assert.equal(after.length, MARKET_STOCK_SIZE);
  assert.deepEqual(
    before.map((l) => l.id).sort(),
    after.map((l) => l.id).sort(),
  );
});

test("POST /api/marketplace/:id/buy returns 404 for an unknown listing", async () => {
  await getOrCreatePlayer();
  const response = await buyPOST(new Request("http://localhost/api/marketplace/missing/buy", { method: "POST" }), {
    params: Promise.resolve({ id: "missing" }),
  });
  assert.equal(response.status, 404);
});

test("POST /api/marketplace/:id/buy returns 400 when the player can't afford it", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedListing(player.credits + 1000);

  const response = await buyPOST(new Request(`http://localhost/api/marketplace/${id}/buy`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
  assert.equal(response.status, 400);
});

test("POST /api/marketplace/:id/buy deducts credits, creates the chicken, and removes the listing", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedListing(100);

  const response = await buyPOST(new Request(`http://localhost/api/marketplace/${id}/buy`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.equal(body.credits, player.credits - 100);

  const chicken = await prisma.chicken.findUnique({ where: { id: body.chicken.id } });
  assert.equal(chicken?.playerId, player.id);

  const listing = await prisma.marketListing.findUnique({ where: { id } });
  assert.equal(listing, null);
});

test("POST /api/chickens/:id/sell pays out credits and deletes the chicken", async () => {
  const player = await getOrCreatePlayer();
  const id = await seedChicken(player.id);

  const response = await sellPOST(new Request(`http://localhost/api/chickens/${id}/sell`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
  assert.equal(response.status, 200);

  const body = await response.json();
  assert.ok(body.creditsEarned > 0);

  const updatedPlayer = await prisma.player.findUnique({ where: { id: player.id } });
  assert.equal(updatedPlayer?.credits, player.credits + body.creditsEarned);

  const chicken = await prisma.chicken.findUnique({ where: { id } });
  assert.equal(chicken, null);
});

test("POST /api/chickens/:id/sell returns 404 for a chicken owned by another player", async () => {
  await getOrCreatePlayer();
  const otherPlayer = await prisma.player.create({ data: {} });
  const id = await seedChicken(otherPlayer.id);

  const response = await sellPOST(new Request(`http://localhost/api/chickens/${id}/sell`, { method: "POST" }), {
    params: Promise.resolve({ id }),
  });
  assert.equal(response.status, 404);
});
