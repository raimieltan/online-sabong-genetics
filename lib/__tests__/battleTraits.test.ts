import test from "node:test";
import assert from "node:assert/strict";

import {
  BATTLE_SCARRED_TRAIT,
  VETERAN_TRAIT,
  evaluateBattleTraits,
} from "../combat/battleTraits";
import type { InjuryRecord, Trait } from "../types";

function injury(overrides: Partial<InjuryRecord> = {}): InjuryRecord {
  return {
    id: "inj-1",
    severity: "minor",
    label: "Scratch",
    incurredAt: Date.now(),
    recoveryRemaining: 1,
    permanent: false,
    ...overrides,
  };
}

test("no traits earned below every threshold", () => {
  const earned = evaluateBattleTraits({ traits: [], battleHardening: 3 }, { confidence: 50 }, []);
  assert.deepEqual(earned, []);
});

test("veteran earned once battleHardening reaches the threshold", () => {
  const earned = evaluateBattleTraits({ traits: [], battleHardening: 15 }, { confidence: 50 }, []);
  assert.deepEqual(earned, [VETERAN_TRAIT]);
});

test("veteran is not re-awarded once already held", () => {
  const earned = evaluateBattleTraits(
    { traits: [VETERAN_TRAIT], battleHardening: 30 },
    { confidence: 50 },
    []
  );
  assert.deepEqual(earned, []);
});

test("battle-scarred earned once confidence craters", () => {
  const earned = evaluateBattleTraits({ traits: [], battleHardening: 0 }, { confidence: 15 }, []);
  assert.deepEqual(earned, [BATTLE_SCARRED_TRAIT]);
});

test("battle-scarred earned from accumulated severe injuries even with steady confidence", () => {
  const earned = evaluateBattleTraits({ traits: [], battleHardening: 0 }, { confidence: 60 }, [
    injury({ id: "a", severity: "serious" }),
    injury({ id: "b", severity: "career_altering", permanent: true, recoveryRemaining: 0 }),
  ]);
  assert.deepEqual(earned, [BATTLE_SCARRED_TRAIT]);
});

test("minor injuries alone never trigger battle-scarred", () => {
  const earned = evaluateBattleTraits({ traits: [], battleHardening: 0 }, { confidence: 60 }, [
    injury({ id: "a", severity: "minor" }),
    injury({ id: "b", severity: "minor" }),
    injury({ id: "c", severity: "minor" }),
  ]);
  assert.deepEqual(earned, []);
});

test("battle-scarred is not re-awarded once already held", () => {
  const earned = evaluateBattleTraits(
    { traits: [BATTLE_SCARRED_TRAIT], battleHardening: 0 },
    { confidence: 5 },
    []
  );
  assert.deepEqual(earned, []);
});

test("both traits can be earned in the same evaluation", () => {
  const earned = evaluateBattleTraits({ traits: [], battleHardening: 15 }, { confidence: 10 }, []);
  assert.deepEqual(earned, [VETERAN_TRAIT, BATTLE_SCARRED_TRAIT]);
});

test("veteran and battle-scarred are distinct, well-formed Trait objects", () => {
  const traits: Trait[] = [VETERAN_TRAIT, BATTLE_SCARRED_TRAIT];
  for (const t of traits) {
    assert.equal(typeof t.id, "string");
    assert.equal(typeof t.name, "string");
    assert.equal(typeof t.description, "string");
    assert.ok(["common", "uncommon", "rare", "epic", "legendary"].includes(t.rarity));
  }
  assert.notEqual(VETERAN_TRAIT.id, BATTLE_SCARRED_TRAIT.id);
});
