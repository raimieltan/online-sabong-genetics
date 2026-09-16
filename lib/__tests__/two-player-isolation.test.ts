import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { prisma } from "../db";
import { handleSell } from "../../app/api/chickens/[id]/sell/route";
import { handleRetire } from "../../app/api/chickens/[id]/retire/route";
import { handleAgeUp } from "../../app/api/chickens/[id]/age-up/route";
import { handleBuy } from "../../app/api/marketplace/[id]/buy/route";
import { handleHatch } from "../../app/api/eggs/[id]/hatch/route";
import { handleCancelTrainingSession } from "../../app/api/training-sessions/[id]/cancel/route";
import { handleBet } from "../../app/api/live/bet/route";
import { handleAdvanceTournament } from "../../app/api/tournaments/[id]/advance/route";
import { handleGetSession } from "../../app/api/combat/sessions/[sessionId]/route";
import { generateListing } from "../marketplace";
import { generateRandomChicken } from "../chickenGenerator";
import { createCombatEncounter, createSession } from "../combat/service";
import { startTrainingSession } from "../facilities/service";
import { startTournament } from "../tournament/service";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";
import { createTestPlayerPair, testRequirePlayer } from "./testHelpers";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = value));
  return block;
}

async function seedChicken(playerId: string) {
  const id = randomUUID();
  await prisma.chicken.create({
    data: {
      id,
      playerId,
      name: "Isolation Test",
      sex: "rooster",
      generation: 0,
      bloodlineId: id,
      iv: statBlock(80),
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
  await prisma.combatEventRecord.deleteMany();
  await prisma.combatSessionRecord.deleteMany();
  await prisma.combatEncounter.deleteMany();
  await prisma.liveMatch.deleteMany();
  await prisma.trainingSession.deleteMany();
  await prisma.facility.deleteMany();
  await prisma.tournament.deleteMany();
  await prisma.marketListing.deleteMany();
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("chicken sell: player B cannot sell player A's chicken", async () => {
  const { playerA, playerB } = await createTestPlayerPair();
  const chickenId = await seedChicken(playerA.id);

  const res = await handleSell({ params: Promise.resolve({ id: chickenId }) }, testRequirePlayer(playerB));
  assert.equal(res.status, 404);

  const unchanged = await prisma.chicken.findUnique({ where: { id: chickenId } });
  assert.equal(unchanged?.playerId, playerA.id);
});

test("chicken retire: player B cannot retire player A's chicken", async () => {
  const { playerA, playerB } = await createTestPlayerPair();
  const chickenId = await seedChicken(playerA.id);

  const res = await handleRetire({ params: Promise.resolve({ id: chickenId }) }, testRequirePlayer(playerB));
  assert.equal(res.status, 404);

  const unchanged = await prisma.chicken.findUnique({ where: { id: chickenId } });
  assert.equal(unchanged?.status, "active");
});

test("chicken age-up: player B cannot age up player A's chicken", async () => {
  const { playerA, playerB } = await createTestPlayerPair();
  const chickenId = await seedChicken(playerA.id);

  const res = await handleAgeUp({ params: Promise.resolve({ id: chickenId }) }, testRequirePlayer(playerB));
  assert.equal(res.status, 404);

  const unchanged = await prisma.chicken.findUnique({ where: { id: chickenId } });
  assert.equal(unchanged?.growthStage, "adult");
});

test("marketplace buy: purchasing a listing never touches another player's credits or roster", async () => {
  const { playerA, playerB } = await createTestPlayerPair();
  const { growthStage: _growthStage, ...listing } = generateListing();
  await prisma.marketListing.create({ data: listing });

  const res = await handleBuy({ params: Promise.resolve({ id: listing.id }) }, testRequirePlayer(playerB));
  assert.equal(res.status, 200);

  const untouchedPlayerA = await prisma.player.findUniqueOrThrow({ where: { id: playerA.id } });
  assert.equal(untouchedPlayerA.credits, playerA.credits);
  assert.equal(await prisma.chicken.count({ where: { playerId: playerA.id } }), 0);

  const updatedPlayerB = await prisma.player.findUniqueOrThrow({ where: { id: playerB.id } });
  assert.ok(updatedPlayerB.credits < playerB.credits);
  assert.equal(await prisma.chicken.count({ where: { playerId: playerB.id } }), 1);
});

test("eggs hatch: player B cannot hatch player A's egg", async () => {
  const { playerA, playerB } = await createTestPlayerPair();
  const eggId = randomUUID();
  await prisma.egg.create({
    data: {
      id: eggId,
      playerId: playerA.id,
      fatherId: "father",
      motherId: "mother",
      bloodlineId: eggId,
      generation: 0,
      sex: "rooster",
      iv: statBlock(50),
      traits: [],
      status: "incubating",
    },
  });

  const res = await handleHatch({ params: Promise.resolve({ id: eggId }) }, testRequirePlayer(playerB));
  assert.equal(res.status, 404);

  const unchanged = await prisma.egg.findUnique({ where: { id: eggId } });
  assert.equal(unchanged?.status, "incubating");
  assert.equal(await prisma.chicken.count({ where: { playerId: playerB.id } }), 0);
});

test("training-session cancel: player B cannot cancel player A's training session", async () => {
  const { playerA, playerB } = await createTestPlayerPair();
  const chickenId = await seedChicken(playerA.id);
  const session = await startTrainingSession(playerA.id, chickenId, "STRENGTH", undefined, "normal");

  const res = await handleCancelTrainingSession(
    { params: Promise.resolve({ id: session.id }) },
    testRequirePlayer(playerB)
  );
  assert.equal(res.status, 404);

  const unchanged = await prisma.trainingSession.findUnique({ where: { id: session.id } });
  assert.equal(unchanged?.status, "ACTIVE");
});

test("live bet: player B cannot place a bet on player A's live matchup", async () => {
  const { playerA, playerB } = await createTestPlayerPair();
  const chicken = generateRandomChicken({ name: "A" });
  const opponent = generateRandomChicken({ name: "B" });
  const match = await prisma.liveMatch.create({
    data: {
      playerId: playerA.id,
      mode: "exhibition",
      chickenA: chicken as unknown as object,
      chickenB: opponent as unknown as object,
      oddsA: 1.5,
      oddsB: 2.5,
      status: "open",
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  const res = await handleBet(
    new Request("http://x", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: match.id, side: "A", amount: 100 }),
    }),
    testRequirePlayer(playerB)
  );
  assert.equal(res.status, 404);

  const unchanged = await prisma.liveMatch.findUnique({ where: { id: match.id } });
  assert.equal(unchanged?.betAmount, null);
  const untouchedPlayerB = await prisma.player.findUniqueOrThrow({ where: { id: playerB.id } });
  assert.equal(untouchedPlayerB.credits, playerB.credits);
});

test("tournament advance: player B cannot advance player A's tournament", async () => {
  const { playerA, playerB } = await createTestPlayerPair();
  const chickenId = await seedChicken(playerA.id);
  const tournament = await startTournament(playerA.id, chickenId, 8, "beginner", "barangay-open");

  const res = await handleAdvanceTournament(
    { params: Promise.resolve({ id: tournament.id }) },
    testRequirePlayer(playerB)
  );
  assert.equal(res.status, 404);

  const unchanged = await prisma.tournament.findUniqueOrThrow({ where: { id: tournament.id } });
  assert.equal(unchanged.currentRound, tournament.currentRound);
});

test("canonical combat session read: player B cannot read player A's combat session", async () => {
  const { playerA, playerB } = await createTestPlayerPair();
  const fighterId = await seedChicken(playerA.id);
  const encounter = await createCombatEncounter({
    ownerPlayerId: playerA.id,
    fighterId,
    opponent: generateRandomChicken({ name: "NPC" }),
    mode: "NORMAL",
  });
  const created = await createSession(
    {
      fighterId,
      encounterId: encounter.id,
      coachingMode: "MANUAL",
      openingCommand: "WAIT",
      disconnectPolicy: "KEEP_INSTRUCTION",
      idempotencyKey: randomUUID(),
    },
    playerA.id
  );

  const res = await handleGetSession(
    new Request(`http://x?after=0`),
    { params: Promise.resolve({ sessionId: created.sessionId }) },
    testRequirePlayer(playerB)
  );
  assert.equal(res.status, 404);
});
