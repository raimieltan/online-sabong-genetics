import test from "node:test";
import assert from "node:assert/strict";
import { simulateBattle } from "../combat/simulator";
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

test("a coach is never called before its fighter has at least 1 CommandPoint", () => {
  const a = makeChicken({ id: "a", iv: statBlock(70), fightingStyle: "aggressive" });
  const b = makeChicken({ id: "b", iv: statBlock(70), fightingStyle: "counter" });
  let calledAtZeroCp = false;
  simulateBattle(a, b, () => 0.5, {
    coachA: (obs) => {
      if (obs.own.commandPoints < 1) calledAtZeroCp = true;
      return null;
    },
  });
  assert.equal(calledAtZeroCp, false);
});
