import test from "node:test";
import assert from "node:assert/strict";
import { deriveCombatIdentity, withIdentity } from "../combat/identity";
import type { BehavioralProfile } from "../types";

const profile: BehavioralProfile = {
  aggression: 0.85,
  caution: 0.15,
  patience: 0.2,
  riskTolerance: 0.8,
  pressurePreference: 0.5,
  counterPreference: 0.1,
  recoveryPreference: 0.15,
  persistence: 0.3,
};

test("deriveCombatIdentity pulls only the 3 MVP axes off BehavioralProfile", () => {
  assert.deepEqual(deriveCombatIdentity(profile), {
    aggression: 0.85,
    patience: 0.2,
    riskTolerance: 0.8,
  });
});

test("withIdentity overwrites only the 3 identity fields, leaving the other 5 untouched", () => {
  const adjusted = withIdentity(profile, { aggression: 0.5, patience: 0.5, riskTolerance: 0.5 });
  assert.equal(adjusted.aggression, 0.5);
  assert.equal(adjusted.patience, 0.5);
  assert.equal(adjusted.riskTolerance, 0.5);
  assert.equal(adjusted.caution, profile.caution);
  assert.equal(adjusted.pressurePreference, profile.pressurePreference);
  assert.equal(adjusted.counterPreference, profile.counterPreference);
  assert.equal(adjusted.recoveryPreference, profile.recoveryPreference);
  assert.equal(adjusted.persistence, profile.persistence);
});
