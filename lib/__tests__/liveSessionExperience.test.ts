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

test("continuous V2 result records the replay seed and authoritative final health", () => {
  const chickenA = makeChicken({ id: "fighter-a" });
  const chickenB = makeChicken({ id: "fighter-b" });
  const session = new LiveCombatV2Session(chickenA, chickenB, 42);

  while (!session.fightOver && session.turn < MAX_TURNS) session.step();
  const result = session.finalize();
  const winnerHealth = result.finalHealth?.[result.winnerId];
  const loserHealth = result.finalHealth?.[result.loserId];

  assert.equal(result.matchSeed, 42);
  assert.ok(winnerHealth);
  assert.ok(loserHealth);
  assert.ok(winnerHealth.percent >= loserHealth.percent);
});

test("a continuous V2 knockout can create and persist a recovery injury", () => {
  const chickenA = makeChicken({ id: "fighter-a" });
  const chickenB = makeChicken({ id: "fighter-b" });
  const session = new LiveCombatV2Session(chickenA, chickenB, 0);
  session.state.fighters[1].health = 0;
  session.state.result = { winnerId: chickenA.id, finishReason: "KO", durationTicks: 1 };
  session.state.phase = "finished";

  const result = session.finalize();
  const injury = result.newInjuries?.[chickenB.id]?.[0];
  const outcome = applyFightOutcome(chickenB, result);

  assert.equal(injury?.severity, "minor");
  assert.equal(outcome.injured, true);
  assert.equal(outcome.status, "injured");
  assert.ok(outcome.injuries.some((entry) => entry.id === injury?.id));
  assert.equal(session.finalize(), result, "finalization must not roll a second injury");
});
