import assert from "node:assert/strict";
import test from "node:test";

import { CanonicalCombatRuntime, digestSemantic, type CanonicalCombatEvent } from "../combat-v2/canonical";
import {
  captureExchangeLock,
  COMBAT_INTERPRETATION_VERSION,
  createExchangeAccumulator,
  evaluateReadQuality,
  isExchangeResolvedPayload,
  recordExchangeEvidence,
  resolveExchangeInterpretation,
  type ExchangeAccumulatorState,
  type InterpretationEvidenceEvent,
  type InterpretationMetrics,
} from "../combat-v2/interpretation";
import { makeChicken } from "./testHelpers";

const metrics = (
  playerHealth = 100,
  opponentHealth = 100,
  playerStamina = 100,
  opponentStamina = 100,
  playerBalance = 100,
  opponentBalance = 100,
): InterpretationMetrics => ({
  player: { health: playerHealth, stamina: playerStamina, balance: playerBalance },
  opponent: { health: opponentHealth, stamina: opponentStamina, balance: opponentBalance },
});

function evidence(cursor: number, type: string, payload: Record<string, unknown> = {}): InterpretationEvidenceEvent {
  return { id: `event-${cursor}`, cursor, logicalTick: cursor, exchangeIndex: 0, type, payload };
}

function record(accumulator: ExchangeAccumulatorState, cursor: number, type: string, payload: Record<string, unknown>, state = metrics()) {
  recordExchangeEvidence(accumulator, evidence(cursor, type, payload), state);
}

function lockedAccumulator(command: "PRESS" | "WAIT" | "COUNTER" | "RECOVER", tellType: "weight_forward" | "recovering" = "weight_forward") {
  const accumulator = createExchangeAccumulator(0);
  record(accumulator, 1, "COMMAND_ACCEPTED", { command });
  record(accumulator, 2, "TELL_STARTED", { fighterId: "opponent", detail: tellType });
  record(accumulator, 3, "COMMAND_LOCKED", { command });
  captureExchangeLock(accumulator, {
    tick: 10,
    command,
    distance: 2.5,
    tells: [{ id: `opponent:${tellType}:2`, type: tellType, family: "FORWARD_LOAD", strength: .8, confidence: .9, commitsAtTick: 20, isFeint: false }],
    metrics: metrics(),
  }, "event-3");
  return accumulator;
}

function resolve(
  accumulator: ExchangeAccumulatorState,
  finalMetrics = metrics(),
) {
  const payload = resolveExchangeInterpretation({ accumulator, playerId: "player", opponentId: "opponent", finalMetrics });
  assert.ok(payload);
  return payload;
}

function assertExecutionIntegrity(payload: ReturnType<typeof resolve>) {
  const exchangeRefs = new Set(payload.refs.actionEventIds);
  const ownedRefs = payload.executions.flatMap(execution => execution.refs.actionEventIds);
  assert.equal(new Set(ownedRefs).size, ownedRefs.length, "execution evidence must not overlap");
  assert.ok(ownedRefs.every(id => exchangeRefs.has(id)), "execution evidence must belong to exchange evidence");
  for (const execution of payload.executions) {
    const cursors = execution.refs.actionEventIds.map(id => Number(id.replace("event-", "")));
    assert.deepEqual(cursors, [...cursors].sort((a, b) => a - b), "execution evidence must remain ordered");
  }
  if (payload.executions.length) {
    for (const key of ["damageDealt", "damageTaken", "staminaDelta", "balanceDelta"] as const) {
      const executionTotal = payload.executions.reduce((sum, item) => sum + item[key], 0);
      assert.ok(Math.abs(executionTotal - payload.consequences[key]) < 1e-9, `${key} must reconcile`);
    }
  }
}

test("read quality is fixed at command lock and independent from outcome", () => {
  const good = lockedAccumulator("COUNTER");
  const bad = lockedAccumulator("RECOVER");
  assert.equal(evaluateReadQuality(good.lock!), "GOOD");
  assert.equal(evaluateReadQuality(bad.lock!), "BAD");

  record(good, 4, "COMMAND_RESOLVED", { fighterId: "player", command: "COUNTER", grade: "FULL", reasons: [] });
  record(good, 5, "ACTION_STARTED", { fighterId: "player", actionId: "wing_counter" }, metrics(100, 100, 92));
  record(good, 6, "ACTION_ENDED", { fighterId: "player", actionId: "wing_counter", engineType: "ATTACK_MISSED" }, metrics(100, 100, 88));
  const missed = resolveExchangeInterpretation({ accumulator: good, playerId: "player", opponentId: "opponent", finalMetrics: metrics(100, 100, 88) });
  assert.equal(missed?.read.quality, "GOOD");
  assert.equal(missed?.primaryOutcome, "MISSED");

  record(bad, 4, "COMMAND_RESOLVED", { fighterId: "player", command: "RECOVER", grade: "FULL", reasons: [] });
  record(bad, 5, "ACTION_STARTED", { fighterId: "player", actionId: "peck_strike" }, metrics(100, 100, 92));
  record(bad, 6, "HIT", { fighterId: "player", targetId: "opponent", actionId: "peck_strike", value: 12 }, metrics(100, 88, 92));
  record(bad, 7, "ACTION_ENDED", { fighterId: "player", actionId: "peck_strike", engineType: "ATTACK_ENDED" }, metrics(100, 88, 90));
  const lucky = resolveExchangeInterpretation({ accumulator: bad, playerId: "player", opponentId: "opponent", finalMetrics: metrics(100, 88, 90) });
  assert.equal(lucky?.read.quality, "BAD");
  assert.equal(lucky?.primaryOutcome, "CLEAN_HIT");
  assert.equal(lucky?.exchangeResult, "ADVANTAGE");
});

test("multi-contact interpretation keeps ordered non-overlapping execution evidence", () => {
  const accumulator = lockedAccumulator("COUNTER");
  record(accumulator, 4, "COMMAND_RESOLVED", { fighterId: "player", command: "COUNTER", grade: "PARTIAL", reasons: ["TEMPERAMENT_MISMATCH"] });
  record(accumulator, 5, "ACTION_STARTED", { fighterId: "player", actionId: "spur_lunge" }, metrics(100, 100, 92));
  record(accumulator, 6, "HIT", { fighterId: "player", targetId: "opponent", actionId: "spur_lunge", value: 6 }, metrics(100, 94, 90));
  record(accumulator, 7, "ACTION_ENDED", { fighterId: "player", actionId: "spur_lunge", engineType: "ATTACK_ENDED" }, metrics(100, 94, 90));
  record(accumulator, 8, "ACTION_STARTED", { fighterId: "player", actionId: "peck_strike" }, metrics(100, 94, 84));
  record(accumulator, 9, "COUNTER_TRIGGERED", { fighterId: "opponent", targetId: "player", actionId: "wing_counter", value: 12 }, metrics(88, 94, 82));
  record(accumulator, 10, "HEALTH_CHANGED", { fighterId: "player", targetId: "opponent", value: 12 }, metrics(88, 94, 82));
  record(accumulator, 11, "ACTION_ENDED", { fighterId: "player", actionId: "peck_strike", engineType: "ATTACK_ENDED" }, metrics(88, 94, 80));

  const resolved = resolveExchangeInterpretation({ accumulator, playerId: "player", opponentId: "opponent", finalMetrics: metrics(88, 94, 80) });
  assert.ok(resolved);
  assert.equal(resolved.read.quality, "GOOD");
  assert.equal(resolved.coaching.compliance, "PARTIAL");
  assert.deepEqual(resolved.executions.map(item => item.outcome), ["GLANCING_HIT", "COUNTERED"]);
  assert.equal(resolved.primaryOutcome, "COUNTERED");
  assert.equal(resolved.exchangeResult, "DISADVANTAGE");
  const ownedRefs = resolved.executions.flatMap(item => item.refs.actionEventIds);
  assert.equal(new Set(ownedRefs).size, ownedRefs.length);
  assert.ok(ownedRefs.every(id => resolved.refs.actionEventIds.includes(id)));
  assert.equal(resolved.executions.reduce((sum, item) => sum + item.damageDealt, 0), resolved.consequences.damageDealt);
  assert.equal(resolved.executions.reduce((sum, item) => sum + item.damageTaken, 0), resolved.consequences.damageTaken);
});

function advanceToResolved(runtime: CanonicalCombatRuntime): CanonicalCombatEvent[] {
  const events: CanonicalCombatEvent[] = [];
  for (let ticks = 0; ticks < 4_000 && !events.some(event => event.type === "EXCHANGE_RESOLVED"); ticks++) {
    runtime.advance(1);
    events.push(...runtime.drainEvents());
  }
  return events;
}

test("canonical runtime emits exactly one traceable recap and restores it deterministically", () => {
  const runtime = CanonicalCombatRuntime.create({ sessionId: "interpretation-session", seed: 144, fighterA: makeChicken({ id: "player" }), fighterB: makeChicken({ id: "opponent" }), openingCommand: "COUNTER" });
  const openingEvents = runtime.drainEvents();
  while (runtime.checkpoint.phase === "READ") runtime.advance(1);
  const lockedEvents = runtime.drainEvents();
  const checkpoint = structuredClone(runtime.checkpoint);
  const restored = CanonicalCombatRuntime.restore(checkpoint);

  const originalEvents = advanceToResolved(runtime);
  const restoredEvents = advanceToResolved(restored);
  assert.equal(digestSemantic(originalEvents), digestSemantic(restoredEvents));

  const allEvents = [...openingEvents, ...lockedEvents, ...originalEvents];
  const recaps = allEvents.filter(event => event.type === "EXCHANGE_RESOLVED");
  assert.equal(recaps.length, 1);
  const refs = recaps[0].payload.refs as { instructionEventId: string; commandLockEventId: string; complianceEventIds: string[]; tellEventIds: string[]; actionEventIds: string[] };
  const knownIds = new Set(allEvents.map(event => event.id));
  assert.ok([refs.instructionEventId, refs.commandLockEventId, ...refs.complianceEventIds, ...refs.tellEventIds, ...refs.actionEventIds].every(id => knownIds.has(id)));
});

test("canonical checkpoints restore deterministically from every externally reachable phase", () => {
  const expectedPhases = new Set(["READ", "APPROACH", "CLASH", "DISENGAGE", "TERMINAL"]);
  const observedPhases = new Set<string>();

  for (let seed = 1; seed <= 20 && observedPhases.size < expectedPhases.size; seed++) {
    const scout = CanonicalCombatRuntime.create({ sessionId: `phase-scout-${seed}`, seed, fighterA: makeChicken({ id: "player" }), fighterB: makeChicken({ id: "opponent" }), openingCommand: "WAIT" });
    scout.drainEvents();
    for (let ticks = 0; ticks < 8_000; ticks++) {
      const phase = scout.checkpoint.phase;
      if (expectedPhases.has(phase) && !observedPhases.has(phase)) {
        observedPhases.add(phase);
        const checkpoint = structuredClone(scout.checkpoint);
        const first = CanonicalCombatRuntime.restore(checkpoint);
        const second = CanonicalCombatRuntime.restore(checkpoint);
        first.advance(30);
        second.advance(30);
        assert.equal(digestSemantic(first.drainEvents()), digestSemantic(second.drainEvents()), phase);
        assert.equal(digestSemantic(first.checkpoint), digestSemantic(second.checkpoint), phase);
      }
      if (scout.checkpoint.state.phase === "finished") break;
      scout.advance(1);
      scout.drainEvents();
    }
  }

  assert.deepEqual(observedPhases, expectedPhases);
});

test("overlapping reconnect delivery cannot present an exchange recap twice", () => {
  const runtime = CanonicalCombatRuntime.create({ sessionId: "reconnect-recap", seed: 144, fighterA: makeChicken({ id: "player" }), fighterB: makeChicken({ id: "opponent" }), openingCommand: "COUNTER" });
  const events = runtime.drainEvents();
  for (let ticks = 0; ticks < 8_000 && events.filter(event => event.type === "EXCHANGE_RESOLVED").length < 2; ticks++) {
    runtime.advance(1);
    events.push(...runtime.drainEvents());
  }

  const recapEvents = events.filter(event => event.type === "EXCHANGE_RESOLVED");
  assert.ok(recapEvents.length >= 2);
  const seen = new Set<string>();
  const presented: string[] = [];
  const consume = (delivery: readonly CanonicalCombatEvent[]) => {
    for (const event of delivery) {
      if (event.type !== "EXCHANGE_RESOLVED" || !isExchangeResolvedPayload(event.payload) || seen.has(event.id)) continue;
      seen.add(event.id);
      presented.push(event.id);
    }
  };

  consume(events);
  consume(events.slice(Math.floor(events.length / 2)));
  consume(events);
  assert.deepEqual(presented, recapEvents.map(event => event.id));
});

test("authoritative checkpoint keeps interpretation evidence compact during long exchanges", () => {
  const runtime = CanonicalCombatRuntime.create({ sessionId: "compact-session", seed: 144, fighterA: makeChicken({ id: "player" }), fighterB: makeChicken({ id: "opponent" }), openingCommand: "COUNTER" });
  runtime.drainEvents();
  let peakBytes = 0;
  let peakEvidence = 0;

  for (let ticks = 0; ticks < 4_000 && runtime.checkpoint.exchangeIndex === 0 && runtime.checkpoint.state.phase === "active"; ticks++) {
    runtime.advance(1);
    runtime.drainEvents();
    peakBytes = Math.max(peakBytes, JSON.stringify(runtime.checkpoint).length);
    peakEvidence = Math.max(peakEvidence, runtime.checkpoint.interpretation.events.length);
  }

  assert.ok(peakBytes < 100_000, `checkpoint grew to ${peakBytes} bytes`);
  assert.ok(peakEvidence < 200, `accumulator retained ${peakEvidence} events`);
});

test("no tell and no commitment resolves neutrally without inventing evidence", () => {
  const accumulator = createExchangeAccumulator(0);
  record(accumulator, 1, "COMMAND_ACCEPTED", { command: "WAIT" });
  record(accumulator, 2, "COMMAND_LOCKED", { command: "WAIT" });
  captureExchangeLock(accumulator, { tick: 4, command: "WAIT", distance: 4, tells: [], metrics: metrics() }, "event-2");
  record(accumulator, 3, "COMMAND_RESOLVED", { fighterId: "player", command: "WAIT", grade: "FULL", reasons: [] });

  const payload = resolve(accumulator);
  assert.deepEqual(payload.read, { decisiveTellId: null, tellPhaseAtCommandLock: null, quality: "NEUTRAL" });
  assert.equal(payload.primaryOutcome, "NO_COMMITMENT");
  assert.equal(payload.exchangeResult, "NO_DECISIVE_RESULT");
  assert.deepEqual(payload.executions, []);
});

test("a good read remains good when temperament resists and the fighter takes damage", () => {
  const accumulator = lockedAccumulator("COUNTER");
  record(accumulator, 4, "COMMAND_RESOLVED", { fighterId: "player", command: "COUNTER", grade: "RESISTED", reasons: ["TEMPERAMENT_MISMATCH"] });
  record(accumulator, 5, "ACTION_STARTED", { fighterId: "opponent", actionId: "spur_lunge" });
  record(accumulator, 6, "HIT", { fighterId: "opponent", targetId: "player", actionId: "spur_lunge", value: 12 }, metrics(88));
  record(accumulator, 7, "ACTION_ENDED", { fighterId: "opponent", actionId: "spur_lunge", engineType: "ATTACK_ENDED" }, metrics(88));

  const payload = resolve(accumulator, metrics(88));
  assert.equal(payload.read.quality, "GOOD");
  assert.deepEqual(payload.coaching, { command: "COUNTER", compliance: "RESISTED", reasons: ["TEMPERAMENT_MISMATCH"] });
  assert.equal(payload.exchangeResult, "DISADVANTAGE");
  assert.equal(payload.consequences.damageTaken, 12);
});

test("the strongest of multiple observable tells is the decisive tell", () => {
  const accumulator = createExchangeAccumulator(0);
  record(accumulator, 1, "COMMAND_ACCEPTED", { command: "PRESS" });
  record(accumulator, 2, "TELL_STARTED", { fighterId: "opponent", detail: "weight_forward" });
  record(accumulator, 3, "TELL_STARTED", { fighterId: "opponent", detail: "recovering" });
  record(accumulator, 4, "COMMAND_LOCKED", { command: "PRESS" });
  captureExchangeLock(accumulator, {
    tick: 10,
    command: "PRESS",
    distance: 2,
    tells: [
      { id: "weak-forward", type: "weight_forward", family: "FORWARD_LOAD", strength: .35, confidence: .6, commitsAtTick: 20, isFeint: false },
      { id: "strong-recovery", type: "recovering", family: "RECOVERY", strength: .9, confidence: .95, commitsAtTick: 18, isFeint: false },
    ],
    metrics: metrics(),
  }, "event-4");

  const payload = resolve(accumulator);
  assert.equal(payload.read.decisiveTellId, "strong-recovery");
  assert.equal(payload.read.quality, "GOOD");
  assert.deepEqual(payload.refs.tellEventIds, ["event-2", "event-3"]);
});

test("a feint produces a neutral read even when its apparent counter is selected", () => {
  const accumulator = lockedAccumulator("COUNTER");
  accumulator.lock!.tells[0].isFeint = true;
  const payload = resolve(accumulator);
  assert.equal(payload.read.quality, "NEUTRAL");
});

test("exchange result policy covers advantage, even, disadvantage, and no decisive result", () => {
  const cases = [
    { name: "advantage", end: metrics(100, 88, 95), result: "ADVANTAGE" },
    { name: "even", end: metrics(90, 90, 95), result: "EVEN" },
    { name: "disadvantage", end: metrics(88, 100, 95), result: "DISADVANTAGE" },
  ] as const;

  for (const fixture of cases) {
    const accumulator = lockedAccumulator("PRESS", "recovering");
    record(accumulator, 4, "COMMAND_RESOLVED", { fighterId: "player", command: "PRESS", grade: "FULL", reasons: [] });
    record(accumulator, 5, "ACTION_STARTED", { fighterId: "player", actionId: fixture.name }, metrics());
    record(accumulator, 6, "ACTION_ENDED", { fighterId: "player", actionId: fixture.name, engineType: "ATTACK_ENDED" }, fixture.end);
    const payload = resolve(accumulator, fixture.end);
    assert.equal(payload.exchangeResult, fixture.result, fixture.name);
    assertExecutionIntegrity(payload);
  }

  const noCommitment = createExchangeAccumulator(0);
  record(noCommitment, 1, "COMMAND_CARRIED", { command: "WAIT" });
  record(noCommitment, 2, "COMMAND_LOCKED", { command: "WAIT" });
  captureExchangeLock(noCommitment, { tick: 3, command: "WAIT", distance: 5, tells: [], metrics: metrics() }, "event-2");
  assert.equal(resolve(noCommitment).exchangeResult, "NO_DECISIVE_RESULT");
});

test("a block followed by a second commitment remains two ordered executions", () => {
  const accumulator = lockedAccumulator("PRESS", "recovering");
  record(accumulator, 4, "COMMAND_RESOLVED", { fighterId: "player", command: "PRESS", grade: "FULL", reasons: [] });
  record(accumulator, 5, "ACTION_STARTED", { fighterId: "player", actionId: "peck_strike" });
  record(accumulator, 6, "BLOCK", { fighterId: "player", targetId: "opponent", actionId: "peck_strike" });
  record(accumulator, 7, "ACTION_ENDED", { fighterId: "player", actionId: "peck_strike", engineType: "ATTACK_ENDED" });
  record(accumulator, 8, "ACTION_STARTED", { fighterId: "player", actionId: "spur_lunge" });
  record(accumulator, 9, "HIT", { fighterId: "player", targetId: "opponent", actionId: "spur_lunge", value: 10 }, metrics(100, 90));
  record(accumulator, 10, "ACTION_ENDED", { fighterId: "player", actionId: "spur_lunge", engineType: "ATTACK_ENDED" }, metrics(100, 90));

  const payload = resolve(accumulator, metrics(100, 90));
  assert.deepEqual(payload.executions.map(item => item.outcome), ["BLOCKED", "CLEAN_HIT"]);
  assertExecutionIntegrity(payload);
});

test("a landed counter can be even when simultaneous incoming damage offsets it", () => {
  const accumulator = lockedAccumulator("COUNTER");
  record(accumulator, 4, "COMMAND_RESOLVED", { fighterId: "player", command: "COUNTER", grade: "FULL", reasons: [] });
  record(accumulator, 5, "ACTION_STARTED", { fighterId: "player", actionId: "wing_counter" });
  record(accumulator, 6, "COUNTER_TRIGGERED", { fighterId: "player", targetId: "opponent", actionId: "wing_counter", value: 10 }, metrics(100, 90));
  record(accumulator, 7, "HIT", { fighterId: "opponent", targetId: "player", actionId: "spur_lunge", value: 10 }, metrics(90, 90));
  record(accumulator, 8, "ACTION_ENDED", { fighterId: "player", actionId: "wing_counter", engineType: "ATTACK_ENDED" }, metrics(90, 90));

  const payload = resolve(accumulator, metrics(90, 90));
  assert.equal(payload.primaryOutcome, "CLEAN_HIT");
  assert.equal(payload.exchangeResult, "EVEN");
  assert.deepEqual(payload.consequences, { damageDealt: 10, damageTaken: 10, staminaDelta: 0, balanceDelta: 0 });
  assertExecutionIntegrity(payload);
});

test("disengagement without contact is represented without fabricating a hit", () => {
  const accumulator = lockedAccumulator("RECOVER", "weight_forward");
  record(accumulator, 4, "COMMAND_RESOLVED", { fighterId: "player", command: "RECOVER", grade: "FULL", reasons: [] });
  record(accumulator, 5, "ACTION_STARTED", { fighterId: "player", actionId: "sidestep" });
  record(accumulator, 6, "EVADE", { fighterId: "player", targetId: "opponent", actionId: "sidestep" });
  record(accumulator, 7, "ACTION_ENDED", { fighterId: "player", actionId: "sidestep", engineType: "ATTACK_ENDED" });

  const payload = resolve(accumulator);
  assert.equal(payload.executions[0].outcome, "DISENGAGED");
  assert.equal(payload.primaryOutcome, "DISENGAGED");
  assert.equal(payload.consequences.damageDealt, 0);
});

test("terminal finalization closes an unresolved player commitment as cancelled", () => {
  const accumulator = lockedAccumulator("PRESS", "recovering");
  record(accumulator, 4, "COMMAND_RESOLVED", { fighterId: "player", command: "PRESS", grade: "FULL", reasons: [] });
  record(accumulator, 5, "ACTION_STARTED", { fighterId: "player", actionId: "spur_lunge" }, metrics(6));
  record(accumulator, 6, "HEALTH_CHANGED", { fighterId: "opponent", targetId: "player", value: 6 }, metrics(0));

  const payload = resolve(accumulator, metrics(0));
  assert.equal(payload.executions[0].outcome, "CANCELLED");
  assert.equal(payload.exchangeResult, "DISADVANTAGE");
  assertExecutionIntegrity(payload);
});

test("carried commands remain the traceable instruction for the next exchange", () => {
  const accumulator = createExchangeAccumulator(3);
  recordExchangeEvidence(accumulator, { ...evidence(20, "COMMAND_CARRIED", { command: "WAIT" }), exchangeIndex: 3 }, metrics());
  recordExchangeEvidence(accumulator, { ...evidence(21, "COMMAND_LOCKED", { command: "WAIT" }), exchangeIndex: 3 }, metrics());
  captureExchangeLock(accumulator, { tick: 50, command: "WAIT", distance: 4, tells: [], metrics: metrics() }, "event-21");

  const payload = resolve(accumulator);
  assert.equal(payload.exchangeIndex, 3);
  assert.equal(payload.refs.instructionEventId, "event-20");
  assert.equal(payload.coaching.command, "WAIT");
});

test("auto-coach produces a canonical accepted instruction reference", () => {
  const runtime = CanonicalCombatRuntime.create({ sessionId: "auto-interpretation", seed: 55, fighterA: makeChicken({ id: "player" }), fighterB: makeChicken({ id: "opponent" }), openingCommand: "WAIT" });
  const events = runtime.drainEvents();
  for (let ticks = 0; ticks < 4_000 && !events.some(event => event.type === "EXCHANGE_RESOLVED"); ticks++) {
    runtime.advance(1, { autoCoach: true });
    events.push(...runtime.drainEvents());
  }
  const recap = events.find(event => event.type === "EXCHANGE_RESOLVED");
  assert.ok(recap);
  const instructionId = (recap.payload.refs as { instructionEventId: string }).instructionEventId;
  const instruction = events.find(event => event.id === instructionId);
  assert.equal(instruction?.type, "COMMAND_ACCEPTED");
  assert.ok(events.some(event => event.type === "AUTO_COMMAND_SELECTED"));
});

test("stamina and balance evidence is retained, ordered, and attributable", () => {
  const accumulator = lockedAccumulator("RECOVER");
  record(accumulator, 4, "COMMAND_RESOLVED", { fighterId: "player", command: "RECOVER", grade: "FULL", reasons: [] });
  record(accumulator, 5, "ACTION_STARTED", { fighterId: "player", actionId: "sidestep" });
  record(accumulator, 6, "STAMINA_CHANGED", { fighterId: "player", value: 6 }, metrics(100, 100, 106));
  record(accumulator, 7, "BALANCE_CHANGED", { fighterId: "player", value: 4 }, metrics(100, 100, 106, 100, 104));
  record(accumulator, 8, "ACTION_ENDED", { fighterId: "player", actionId: "sidestep", engineType: "ATTACK_ENDED" }, metrics(100, 100, 106, 100, 104));

  const payload = resolve(accumulator, metrics(100, 100, 106, 100, 104));
  assert.deepEqual(payload.refs.actionEventIds, ["event-5", "event-6", "event-7", "event-8"]);
  assert.equal(payload.executions[0].staminaDelta, 6);
  assert.equal(payload.executions[0].balanceDelta, 4);
  assertExecutionIntegrity(payload);
});

test("identical evidence has a stable payload digest and old versions are not reinterpreted", () => {
  const build = () => {
    const accumulator = lockedAccumulator("COUNTER");
    record(accumulator, 4, "COMMAND_RESOLVED", { fighterId: "player", command: "COUNTER", grade: "FULL", reasons: [] });
    record(accumulator, 5, "ACTION_STARTED", { fighterId: "player", actionId: "wing_counter" });
    record(accumulator, 6, "ACTION_ENDED", { fighterId: "player", actionId: "wing_counter", engineType: "ATTACK_MISSED" });
    return resolve(accumulator);
  };
  const first = build();
  const second = build();
  assert.deepEqual(first, second);
  assert.equal(digestSemantic(first), digestSemantic(second));
  assert.equal(first.interpretationVersion, COMBAT_INTERPRETATION_VERSION);
  assert.equal(isExchangeResolvedPayload(first), true);
  assert.equal(isExchangeResolvedPayload({ ...first, interpretationVersion: COMBAT_INTERPRETATION_VERSION + 1 }), false);
});

test("canonical exchanges preserve interpretation invariants across representative seeds", () => {
  for (let seed = 1; seed <= 30; seed++) {
    const runtime = CanonicalCombatRuntime.create({ sessionId: `interpretation-fuzz-${seed}`, seed, fighterA: makeChicken({ id: "player" }), fighterB: makeChicken({ id: "opponent" }), openingCommand: ["PRESS", "WAIT", "COUNTER", "RECOVER"][seed % 4] as "PRESS" | "WAIT" | "COUNTER" | "RECOVER" });
    const events = runtime.drainEvents();
    while (runtime.checkpoint.state.phase === "active") {
      runtime.advance(60, { autoCoach: true });
      events.push(...runtime.drainEvents());
    }

    const recaps = events.filter(event => event.type === "EXCHANGE_RESOLVED");
    assert.ok(recaps.length > 0, `seed ${seed} produced no recap`);
    assert.equal(new Set(recaps.map(event => event.exchangeIndex)).size, recaps.length, `seed ${seed} duplicated an exchange recap`);
    for (const recap of recaps) {
      assert.equal(isExchangeResolvedPayload(recap.payload), true);
      const payload = recap.payload as unknown as ReturnType<typeof resolve>;
      const sameExchangeIds = new Set(events.filter(event => event.exchangeIndex === recap.exchangeIndex).map(event => event.id));
      const referenced = [payload.refs.instructionEventId, payload.refs.commandLockEventId, ...payload.refs.complianceEventIds, ...payload.refs.tellEventIds, ...payload.refs.actionEventIds];
      assert.ok(referenced.every(id => sameExchangeIds.has(id)), `seed ${seed} referenced evidence outside exchange ${recap.exchangeIndex}`);
      assertExecutionIntegrity(payload);
    }
  }
});
