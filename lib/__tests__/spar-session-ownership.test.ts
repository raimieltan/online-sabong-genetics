import test from "node:test";
import assert from "node:assert/strict";

import { createSparSession, getSparSession } from "../combat/sparSessions";
import { BattleSession } from "../combat/simulator";

test("getSparSession returns undefined for the wrong owner", () => {
  const fakeSession = {} as BattleSession;
  const id = createSparSession(fakeSession, "player-a");

  assert.equal(getSparSession(id, "player-b"), undefined);
  assert.equal(getSparSession(id, "player-a"), fakeSession);
});
