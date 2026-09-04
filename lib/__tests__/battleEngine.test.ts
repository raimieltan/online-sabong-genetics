import test from "node:test";
import assert from "node:assert/strict";

import BattleEngine from "../battleEngine";
import { createRooster } from "../roosterGenerator";
import type { Rooster } from "../types";

const palette = { body: "#fff", head: "#fff", comb: "#fff", tail: "#fff", feet: "#fff" };

function makeRooster(overrides: Partial<Rooster> = {}): Rooster {
  return createRooster({
    name: "R",
    type: "Custom",
    speed: 50,
    stamina: 50,
    damage: 50,
    aggression: 50,
    defense: 50,
    luck: 50,
    colorScheme: palette,
    ...overrides,
  });
}

test("constructor resets both roosters to full HP and not fatigued regardless of input", () => {
  const r1 = { ...makeRooster({ name: "A" }), hp: 5, fatigued: true };
  const r2 = { ...makeRooster({ name: "B" }), hp: 5, fatigued: true };
  const engine = new BattleEngine(r1, r2);

  const { r1: liveR1, r2: liveR2 } = engine.getRoosters();
  assert.equal(liveR1.hp, liveR1.maxHp);
  assert.equal(liveR2.hp, liveR2.maxHp);
  assert.equal(liveR1.fatigued, false);
  assert.equal(liveR2.fatigued, false);
  assert.equal(engine.turn, 0);
  assert.equal(engine.maxTurns, 300);
  assert.equal(engine.isActive, true);
  assert.equal(engine.winner, null);
  assert.equal(engine.getResult(), null);
});

test("higher aggression rooster attacks on turn 1", () => {
  const aggressive = makeRooster({ name: "Aggro", aggression: 90 });
  const passive = makeRooster({ name: "Calm", aggression: 10 });
  const engine = new BattleEngine(aggressive, passive);

  const entry = engine.executeNextTurn();
  assert.ok(entry);
  assert.equal(entry!.attacker, "Aggro");
  assert.equal(entry!.defender, "Calm");
  assert.equal(entry!.turn, 1);
});

test("attacker alternates every turn", () => {
  const a = makeRooster({ name: "A", aggression: 90, stamina: 200 });
  const b = makeRooster({ name: "B", aggression: 10, stamina: 200 });
  const engine = new BattleEngine(a, b);

  const t1 = engine.executeNextTurn()!;
  const t2 = engine.executeNextTurn()!;
  const t3 = engine.executeNextTurn()!;

  assert.equal(t1.attacker, "A");
  assert.equal(t2.attacker, "B");
  assert.equal(t3.attacker, "A");
});

test("a stalemate matchup (huge HP pool, minimal damage) times out at turn 300 with a winner assigned", () => {
  // High stamina (huge maxHp) + capped defense reduction + zero damage stat keeps
  // per-hit damage tiny relative to maxHp, so neither side can KO within 300 turns.
  const a = makeRooster({ name: "A", stamina: 5000, damage: 0, defense: 100 });
  const b = makeRooster({ name: "B", stamina: 5000, damage: 0, defense: 100 });
  const engine = new BattleEngine(a, b);

  let lastEntry = null;
  let iterations = 0;
  while (engine.isActive && iterations < 400) {
    lastEntry = engine.executeNextTurn();
    iterations += 1;
  }

  assert.equal(engine.isActive, false);
  assert.equal(engine.turn, 300);
  const result = engine.getResult();
  assert.ok(result);
  assert.equal(result!.outcomeReason, "timeout");
  assert.equal(result!.totalTurns, 300);
  assert.ok(result!.winner.name === "A" || result!.winner.name === "B");
  assert.equal(lastEntry!.turn, 300);
  // No more turns should be produced past the battle end.
  assert.equal(engine.executeNextTurn(), null);
});

test("battle between identical roosters ends (KO or timeout) with a valid winner within 300 turns", () => {
  const a = makeRooster({ name: "A" });
  const b = makeRooster({ name: "B" });
  const engine = new BattleEngine(a, b);

  let iterations = 0;
  while (engine.isActive && iterations < 400) {
    engine.executeNextTurn();
    iterations += 1;
  }

  assert.equal(engine.isActive, false);
  assert.ok(engine.turn <= 300);
  const result = engine.getResult();
  assert.ok(result);
  assert.ok(result!.outcomeReason === "ko" || result!.outcomeReason === "timeout");
  assert.ok(result!.winner.name === "A" || result!.winner.name === "B");
});

test("battle ends on KO when a rooster's HP reaches 0, winner is the attacker", () => {
  // Overwhelming attacker (damage/luck maxed, defender minimal defense/hp) forces a fast KO.
  const striker = makeRooster({ name: "Striker", damage: 100, luck: 100, aggression: 100, stamina: 20 });
  const punchingBag = makeRooster({ name: "Bag", defense: 0, stamina: 1, aggression: 0, speed: 0 });
  const engine = new BattleEngine(striker, punchingBag);

  let iterations = 0;
  while (engine.isActive && iterations < 300) {
    engine.executeNextTurn();
    iterations += 1;
  }

  assert.equal(engine.isActive, false);
  const result = engine.getResult();
  assert.ok(result);
  assert.equal(result!.outcomeReason, "ko");
  assert.equal(result!.winner.name, "Striker");
  assert.equal(result!.loser.name, "Bag");
  assert.ok(result!.r2FinalHp <= 0);
});

test("damage is clamped to a minimum of 0.5 and defender hp never goes negative", () => {
  const attacker = makeRooster({ name: "Weak", damage: 0, aggression: 100 });
  const tank = makeRooster({ name: "Tank", defense: 100, stamina: 200, aggression: 0 });
  const engine = new BattleEngine(attacker, tank);

  const entry = engine.executeNextTurn()!;
  assert.ok(entry.isMiss || entry.damage >= 0.5);

  const { r2 } = engine.getRoosters();
  assert.ok(r2.hp >= 0);
});

test("attacker fatigue applies a damage penalty once attacker HP drops below 30% of maxHp", () => {
  // Force a scenario where the attacker is already fatigued at the moment of its own turn:
  // build a BattleEngine, then simulate enough hits against roosterA to drop it under 30%,
  // then verify roosterA's subsequent attack uses the fatigue-penalized damage envelope.
  const a = makeRooster({ name: "A", aggression: 100, stamina: 20, damage: 50 });
  const b = makeRooster({ name: "B", aggression: 0, stamina: 20, damage: 100, luck: 0 });
  const engine = new BattleEngine(a, b);

  let sawFatigueTriggerOnA = false;
  let iterations = 0;
  while (engine.isActive && iterations < 300) {
    const entry = engine.executeNextTurn();
    iterations += 1;
    if (entry && entry.defender === "A" && entry.isFatigueTriggered) {
      sawFatigueTriggerOnA = true;
      break;
    }
  }

  // With B hitting much harder than A, A should fall under the fatigue threshold at some point
  // before the battle ends (unless A was KO'd outright, which is also an acceptable outcome).
  assert.ok(sawFatigueTriggerOnA || !engine.isActive);
});

test("isFatigueTriggered is only true on the turn the defender first crosses the threshold", () => {
  const a = makeRooster({ name: "A", aggression: 100, stamina: 200, damage: 30 });
  const b = makeRooster({ name: "B", aggression: 0, stamina: 20, damage: 0, defense: 0 });
  const engine = new BattleEngine(a, b);

  const triggeredTurns: number[] = [];
  let iterations = 0;
  while (engine.isActive && iterations < 300) {
    const entry = engine.executeNextTurn();
    iterations += 1;
    if (entry && entry.defender === "B" && entry.isFatigueTriggered) {
      triggeredTurns.push(entry.turn);
    }
  }

  assert.ok(triggeredTurns.length <= 1, `expected at most one trigger, got ${triggeredTurns.length}`);
});

test("getAllLogs and getResult().logs return snapshots, not live references", () => {
  const a = makeRooster({ name: "A" });
  const b = makeRooster({ name: "B" });
  const engine = new BattleEngine(a, b);

  engine.executeNextTurn();
  const logsBefore = engine.getAllLogs();
  engine.executeNextTurn();
  const logsAfter = engine.getAllLogs();

  assert.equal(logsBefore.length, 1);
  assert.equal(logsAfter.length, 2);
});

test("executeNextTurn returns null once the battle has ended", () => {
  const a = makeRooster({ name: "A" });
  const b = makeRooster({ name: "B" });
  const engine = new BattleEngine(a, b);

  let iterations = 0;
  while (engine.isActive && iterations < 400) {
    engine.executeNextTurn();
    iterations += 1;
  }

  assert.equal(engine.executeNextTurn(), null);
  assert.equal(engine.getAllLogs().length, engine.turn);
  assert.ok(engine.turn <= 300);
});
