import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

import { handleFight } from "../../app/api/chickens/[id]/fight/route";
import { generateRandomChicken } from "../chickenGenerator";
import { beginSession, createCombatEncounter, createSession, getSession, issueCommand, syncSession, triggerSessionAwakening } from "../combat/service";
import { emptyCombatCareer } from "../combat/evolution";
import { prisma } from "../db";
import { currentOpponent } from "../tournament";
import { startTournament } from "../tournament/service";
import { GENETIC_STAT_KEYS, type GrowthStage, type StatBlock } from "../types";
import { getOrCreateTestPlayer, testRequirePlayer } from "./testHelpers";

function statBlock(value: number): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach(key => { block[key] = value; });
  return block;
}

async function seedChicken(playerId: string, overrides: { growthStage?: GrowthStage; injured?: boolean; awakening?: "unbreakable" } = {}) {
  const id = randomUUID();
  const combatCareer = emptyCombatCareer();
  if (overrides.awakening) combatCareer.awakenings.find(item => item.id === overrides.awakening)!.unlocked = true;
  await prisma.chicken.create({ data: { id, playerId, name: "Test", sex: "rooster", generation: 0, bloodlineId: id, iv: statBlock(80), ev: statBlock(50), traits: [], age: 1, health: 100, energy: 100, record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 }, combatCareer, status: "active", growthStage: overrides.growthStage ?? "adult", injured: overrides.injured ?? false } });
  return id;
}

function request(id: string, body: unknown, key = randomUUID()) {
  return new Request(`http://localhost/api/chickens/${id}/fight`, { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": key }, body: JSON.stringify(body) });
}

test.beforeEach(async () => {
  await prisma.combatSettlementRecord.deleteMany();
  await prisma.combatCommandRecord.deleteMany();
  await prisma.combatEventRecord.deleteMany();
  await prisma.combatSessionRecord.deleteMany();
  await prisma.combatEncounter.deleteMany();
  await prisma.egg.deleteMany();
  await prisma.chicken.deleteMany();
  await prisma.player.deleteMany();
});

test("fight route creates an unresolved authoritative session from a server encounter", async () => {
  const player = await getOrCreateTestPlayer();
  const fighterId = await seedChicken(player.id);
  const encounter = await createCombatEncounter({ ownerPlayerId: player.id, fighterId, opponent: generateRandomChicken({ name: "NPC" }), mode: "NORMAL" });
  const response = await handleFight(request(fighterId, { encounterId: encounter.id, openingCommand: "WAIT" }), { params: Promise.resolve({ id: fighterId }) }, testRequirePlayer(player));
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.status, "CREATED");
  assert.equal(body.phase, "READ");
  assert.equal(body.result, null);
  assert.ok(body.events.some((event: { type: string }) => event.type === "SESSION_STARTED"));
  assert.equal(body.allowedActions.sync, false);

  const active = await syncSession(body.sessionId, player.id, body.latestEventCursor);
  assert.equal(active.status, "ACTIVE");
  assert.equal(active.allowedActions.sync, true);
});

test("fight route rejects client-authored opponents", async () => {
  const player = await getOrCreateTestPlayer();
  const fighterId = await seedChicken(player.id);
  const response = await handleFight(request(fighterId, { opponent: generateRandomChicken({ name: "Fake" }) }), { params: Promise.resolve({ id: fighterId }) }, testRequirePlayer(player));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, "CLIENT_OPPONENT_FORBIDDEN");
});

test("creation idempotency returns the same session and one fighter lease", async () => {
  const player = await getOrCreateTestPlayer();
  const fighterId = await seedChicken(player.id);
  const encounter = await createCombatEncounter({ ownerPlayerId: player.id, fighterId, opponent: generateRandomChicken({ name: "NPC" }), mode: "NORMAL" });
  const key = randomUUID();
  const first = await handleFight(request(fighterId, { encounterId: encounter.id }, key), { params: Promise.resolve({ id: fighterId }) }, testRequirePlayer(player));
  const second = await handleFight(request(fighterId, { encounterId: encounter.id }, key), { params: Promise.resolve({ id: fighterId }) }, testRequirePlayer(player));
  assert.equal((await first.json()).sessionId, (await second.json()).sessionId);
  assert.equal(await prisma.combatSessionRecord.count(), 1);
});

test("ineligible fighters cannot consume an encounter", async () => {
  const player = await getOrCreateTestPlayer();
  const fighterId = await seedChicken(player.id, { growthStage: "chick" });
  const encounter = await createCombatEncounter({ ownerPlayerId: player.id, fighterId, opponent: generateRandomChicken({ name: "NPC" }), mode: "NORMAL" });
  const response = await handleFight(request(fighterId, { encounterId: encounter.id }), { params: Promise.resolve({ id: fighterId }) }, testRequirePlayer(player));
  assert.equal(response.status, 409);
});

test("command ids deduplicate and commands lock at commitment", async () => {
  const player = await getOrCreateTestPlayer();
  const fighterId = await seedChicken(player.id);
  const encounter = await createCombatEncounter({ ownerPlayerId: player.id, fighterId, opponent: generateRandomChicken({ name: "NPC" }), mode: "NORMAL" });
  const created = await createSession({ fighterId, encounterId: encounter.id, coachingMode: "MANUAL", openingCommand: "WAIT", disconnectPolicy: "KEEP_INSTRUCTION", idempotencyKey: randomUUID() }, player.id);
  const view = await beginSession(created.sessionId, player.id);
  const commandId = randomUUID();
  const first = await issueCommand(view.sessionId, { commandId, command: "PRESS", observedRevision: view.revision }, player.id);
  const duplicate = await issueCommand(view.sessionId, { commandId, command: "RECOVER", observedRevision: view.revision }, player.id);
  assert.deepEqual(duplicate, first);
  for (let index = 0; index < 20; index++) {
    await prisma.combatSessionRecord.update({ where: { id: view.sessionId }, data: { lastAdvancedAt: new Date(Date.now() - 1_000) } });
    const current = await syncSession(view.sessionId, player.id);
    if (current.phase !== "READ") {
      await assert.rejects(() => issueCommand(view.sessionId, { commandId: randomUUID(), command: "COUNTER", observedRevision: current.revision }, player.id), /COMMAND_LOCKED/);
      return;
    }
  }
  assert.fail("session never reached commitment");
});

test("manual awakening is authoritative, visible in projections, and idempotent", async () => {
  const player = await getOrCreateTestPlayer();
  const fighterId = await seedChicken(player.id, { awakening: "unbreakable" });
  const encounter = await createCombatEncounter({ ownerPlayerId: player.id, fighterId, opponent: generateRandomChicken({ name: "NPC" }), mode: "NORMAL" });
  const created = await createSession({ fighterId, encounterId: encounter.id, coachingMode: "MANUAL", openingCommand: "WAIT", disconnectPolicy: "KEEP_INSTRUCTION", idempotencyKey: randomUUID() }, player.id);
  const view = await beginSession(created.sessionId, player.id);
  assert.deepEqual(view.projection[0].unlockedAwakenings, ["unbreakable"]);
  assert.equal(view.allowedActions.awakening, true);

  const actionId = randomUUID();
  const first = await triggerSessionAwakening(view.sessionId, { actionId, type: "unbreakable", observedRevision: view.revision }, player.id);
  const duplicate = await triggerSessionAwakening(view.sessionId, { actionId, type: "unbreakable", observedRevision: view.revision }, player.id);
  assert.deepEqual(duplicate, first);

  const awakened = await getSession(view.sessionId, player.id);
  assert.equal(awakened.projection[0].awakening?.type, "unbreakable");
  assert.equal(awakened.allowedActions.awakening, false);
  assert.ok(awakened.events.some(event => event.type === "AWAKENING_STARTED" && event.payload.detail === "unbreakable"));
});

test("launch campaign sessions hide and reject awakening controls", async () => {
  const player = await getOrCreateTestPlayer();
  const fighterId = await seedChicken(player.id, { awakening: "unbreakable" });
  const encounter = await createCombatEncounter({
    ownerPlayerId: player.id,
    fighterId,
    opponent: generateRandomChicken({ name: "Campaign NPC" }),
    mode: "BOSS",
    modeContextId: "charger",
  });
  const view = await createSession({
    fighterId,
    encounterId: encounter.id,
    coachingMode: "MANUAL",
    openingCommand: "WAIT",
    disconnectPolicy: "KEEP_INSTRUCTION",
    idempotencyKey: randomUUID(),
  }, player.id);
  assert.equal(view.allowedActions.awakening, false);
  await assert.rejects(
    () => triggerSessionAwakening(view.sessionId, {
      actionId: randomUUID(),
      type: "unbreakable",
      observedRevision: view.revision,
    }, player.id),
    /AWAKENING_UNAVAILABLE/,
  );
});

test("terminal retries return one settlement and never duplicate consequences", async () => {
  const player = await getOrCreateTestPlayer();
  const fighterId = await seedChicken(player.id);
  const opponent = generateRandomChicken({ name: "NPC" });
  const encounter = await createCombatEncounter({ ownerPlayerId: player.id, fighterId, opponent, mode: "NORMAL" });
  const created = await createSession({ fighterId, encounterId: encounter.id, coachingMode: "AUTO", openingCommand: "PRESS", disconnectPolicy: "AUTO_COACH", idempotencyKey: randomUUID() }, player.id);
  let view = await beginSession(created.sessionId, player.id);
  for (let index = 0; index < 40 && view.status === "ACTIVE"; index++) {
    await prisma.combatSessionRecord.update({ where: { id: view.sessionId }, data: { lastAdvancedAt: new Date(Date.now() - 10_000) } });
    view = await syncSession(view.sessionId, player.id, view.latestEventCursor);
  }
  assert.equal(view.status, "SETTLED");
  const replay = await getSession(view.sessionId, player.id);
  assert.deepEqual(replay.result, view.result);
  assert.deepEqual(replay.settlement, view.settlement);
  assert.equal(await prisma.combatSettlementRecord.count({ where: { sessionId: view.sessionId } }), 1);
  assert.equal((await prisma.chicken.findUniqueOrThrow({ where: { id: fighterId } })).activeCombatSessionId, null);
});

test("authoritative tournament combat settles before resolving the bracket", async () => {
  const player = await getOrCreateTestPlayer();
  const fighterId = await seedChicken(player.id);
  const tournament = await startTournament(player.id, fighterId, 8, "beginner", "barangay-open");
  const opponent = currentOpponent(tournament);
  assert.ok(opponent);
  const encounter = await createCombatEncounter({ ownerPlayerId: player.id, fighterId, opponent: opponent.chicken, mode: "TOURNAMENT", modeContextId: tournament.id });
  const created = await createSession({ fighterId, encounterId: encounter.id, coachingMode: "AUTO", openingCommand: "PRESS", disconnectPolicy: "AUTO_COACH", idempotencyKey: randomUUID() }, player.id);
  let view = await beginSession(created.sessionId, player.id);

  for (let index = 0; index < 40 && view.status === "ACTIVE"; index += 1) {
    await prisma.combatSessionRecord.update({ where: { id: view.sessionId }, data: { lastAdvancedAt: new Date(Date.now() - 10_000) } });
    view = await syncSession(view.sessionId, player.id, view.latestEventCursor);
  }

  assert.equal(view.status, "SETTLED");
  assert.ok(view.settlement);
  assert.equal((await prisma.tournament.findUniqueOrThrow({ where: { id: tournament.id } })).currentRound, 1);
});
