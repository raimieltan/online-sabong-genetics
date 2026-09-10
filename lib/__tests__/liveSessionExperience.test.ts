import assert from "node:assert/strict";
import test from "node:test";

import { LiveCombatV2Session, MAX_TURNS } from "../combat-v2/liveSession";
import { applyFightOutcome } from "../combat";
import { makeChicken } from "./testHelpers";

test("continuous V2 fights return and persist combat experience", () => {
  const chickenA = makeChicken({ id: "fighter-a" });
  const chickenB = makeChicken({ id: "fighter-b" });
  const session = new LiveCombatV2Session(chickenA, chickenB, 42);

  while (!session.fightOver && session.turn < MAX_TURNS) session.step();
  const result = session.finalize();
  const outcome = applyFightOutcome(chickenA, result);

  assert.ok(result.experienceGained?.[chickenA.id]);
  assert.ok(Object.values(outcome.experience).some((value) => value > 0));
});
