import test from "node:test";
import assert from "node:assert/strict";
import { BattleSession, simulateBattle } from "../combat/simulator";
import { makeChicken, statBlock } from "./testHelpers";

test("a coach that always returns null behaves identically to no coach at all (same seed)", () => {
  const a = makeChicken({ id: "a", iv: statBlock(70), fightingStyle: "aggressive" });
  const b = makeChicken({ id: "b", iv: statBlock(70), fightingStyle: "counter" });
  const seeded = () => {
    let s = 42;
    return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff), s / 0x7fffffff);
  };
  const withNullCoach = simulateBattle(a, b, seeded(), { coachA: () => null });
  const withoutCoach = simulateBattle(a, b, seeded());
  assert.equal(withNullCoach.winnerId, withoutCoach.winnerId);
  assert.equal(withNullCoach.totalTurns, withoutCoach.totalTurns);
});

test("a coach can choose an instruction from the first turn without a resource gate", () => {
  const a = makeChicken({ id: "a", iv: statBlock(70), fightingStyle: "aggressive" });
  const b = makeChicken({ id: "b", iv: statBlock(70), fightingStyle: "counter" });
  let calls = 0;
  simulateBattle(a, b, () => 0.5, {
    coachA: (obs) => {
      calls += 1;
      return null;
    },
  });
  assert.ok(calls > 0);
});

test("a coaching instruction persists until it is replaced", () => {
  const defensiveStats = { ...statBlock(50), power: 1, defense: 99 };
  const a = makeChicken({ id: "a", iv: defensiveStats });
  const b = makeChicken({ id: "b", iv: defensiveStats });
  const session = new BattleSession(a, b, () => 0.99);

  session.step("PRESS");
  for (let turn = 0; turn < 4; turn += 1) session.step(null);
  assert.equal(session.snapshotA().pendingCommand, "PRESS");

  session.step("RECOVER");
  assert.equal(session.snapshotA().pendingCommand, "RECOVER");
});
