import assert from "node:assert/strict";
import test from "node:test";

import { CanonicalCombatRuntime, CANONICAL_COMMANDS, digestSemantic, experienceFromCanonicalEvents, publicFighters, type CanonicalCombatEvent } from "../combat-v2/canonical";
import { createInjuryRecord } from "../combat/injuries";
import { effectiveStat } from "../combat/stats";
import { makeChicken } from "./testHelpers";

test("canonical coaching vocabulary is exactly four commands", () => {
  assert.deepEqual(CANONICAL_COMMANDS, ["PRESS", "WAIT", "COUNTER", "RECOVER"]);
});

test("last command in READ wins and locks when commitment begins", () => {
  const runtime = CanonicalCombatRuntime.create({ sessionId: "command-session", seed: 91, fighterA: makeChicken({ id: "a" }), fighterB: makeChicken({ id: "b" }), openingCommand: "WAIT" });
  runtime.drainEvents();
  runtime.acceptCommand("PRESS");
  runtime.acceptCommand("COUNTER");
  assert.equal(runtime.checkpoint.activeCommand, "COUNTER");
  while (runtime.checkpoint.phase === "READ") runtime.advance(1);
  const events = runtime.drainEvents();
  assert.ok(events.some(event => event.type === "COMMAND_LOCKED" && event.payload.command === "COUNTER"));
  assert.throws(() => runtime.acceptCommand("RECOVER"), /COMMAND_LOCKED/);
});

test("same snapshots, seed, and command log produce identical semantic output", () => {
  const run = () => {
    const runtime = CanonicalCombatRuntime.create({ sessionId: "replay-session", seed: 144, fighterA: makeChicken({ id: "a" }), fighterB: makeChicken({ id: "b" }), openingCommand: "PRESS" });
    const events = runtime.drainEvents();
    while (runtime.checkpoint.state.phase === "active") { runtime.advance(30); events.push(...runtime.drainEvents()); }
    return { events, result: runtime.result(events) };
  };
  assert.equal(digestSemantic(run()), digestSemantic(run()));
});

test("canonical results preserve combat XP and Flow State afterimage markers", () => {
  const event = (cursor: number, engineType: string, fighterId: string, targetId: string): CanonicalCombatEvent => ({
    id: `event-${cursor}`, sessionId: "xp-session", cursor, logicalTick: cursor,
    exchangeIndex: 0, type: engineType, payload: { engineType, fighterId, targetId }, semantic: true,
  });
  const gained = experienceFromCanonicalEvents(["a", "b"], [
    event(1, "ATTACK_LANDED", "a", "b"),
    event(2, "EVADE", "b", "a"),
  ]);
  assert.equal(gained.a.offensive, 2);
  assert.equal(gained.a.adaptation, 1);
  assert.equal(gained.b.evasion, 2);
  assert.equal(gained.b.adaptation, 1);

  const runtime = CanonicalCombatRuntime.create({ sessionId: "mirage-session", seed: 8, fighterA: makeChicken({ id: "a" }), fighterB: makeChicken({ id: "b" }), openingCommand: "WAIT" });
  runtime.checkpoint.state.fighters[0].lastMirageEvadeTick = 42;
  assert.equal(publicFighters(runtime.checkpoint.state)[0].lastMirageEvadeTick, 42);
});

test("deterministic injury metadata never depends on wall clock or process counters", () => {
  const context = { sessionId: "s", eventCursor: 18, fighterId: "b", injuryType: "wing-sprain", occurredAtTick: 603 };
  const first = createInjuryRecord(() => 0.2, "serious", context);
  const second = createInjuryRecord(() => 0.2, "serious", context);
  assert.deepEqual(first, second);
  assert.equal(first.incurredAt, 603);
});

test("a permanent injury modifier is applied once by source id", () => {
  const injury = { ...createInjuryRecord(() => 0.2, "career_altering", { sessionId: "s", eventCursor: 2, fighterId: "a", occurredAtTick: 50 }), statPenalty: { power: -10 } };
  const healthy = makeChicken({ id: "healthy" });
  const once = makeChicken({ id: "once", injuries: [injury] });
  const duplicate = makeChicken({ id: "duplicate", injuries: [injury, { ...injury }] });
  assert.equal(effectiveStat(once, "power"), effectiveStat(duplicate, "power"));
  assert.ok(effectiveStat(once, "power") < effectiveStat(healthy, "power"));
});
