import test from "node:test";
import assert from "node:assert/strict";

import { inheritMutations, inheritPhysicalBlock, inheritPhysicalTrait, inheritStat, inheritStatBlock } from "../genetics";
import { MUTATION_POOL } from "../mutations";
import {
  GENETIC_STAT_KEYS,
  PHYSICAL_TRAIT_KEYS,
  PHYSICAL_TRAIT_RANGE,
  type MutationGenome,
  type PhysicalBlock,
  type StatBlock,
} from "../types";

function queueRng(values: number[]): () => number {
  const queue = [...values];
  return () => {
    const next = queue.shift();
    if (next === undefined) {
      throw new Error("queueRng exhausted");
    }
    return next;
  };
}

test("inheritStat averages parents with zero noise and no mutation", () => {
  const rng = queueRng([0.5, 0.5, 0.5, 0.5, 0.5]);
  assert.equal(inheritStat(80, 60, rng), 70);
});

test("inheritStat applies a mutation bonus when the mutation roll succeeds", () => {
  const rng = queueRng([0.5, 0.5, 0.5, 0.5, 0.0, 0.5]);
  assert.equal(inheritStat(50, 50, rng), 65);
});

test("inheritStat clamps to 99", () => {
  const rng = queueRng([0.5, 1, 1, 1, 0.9]);
  assert.equal(inheritStat(99, 99, rng), 99);
});

test("inheritStat clamps to 1", () => {
  const rng = queueRng([0.5, 0, 0, 0, 0.9]);
  assert.equal(inheritStat(1, 1, rng), 1);
});

test("inheritStat stays within [1, 99] over many random trials", () => {
  for (let i = 0; i < 1000; i++) {
    const value = inheritStat(50, 50);
    assert.ok(value >= 1 && value <= 99, `value ${value} out of range`);
  }
});

test("inheritStatBlock fills every genetic stat key", () => {
  const father: StatBlock = { power: 90, speed: 82, stamina: 70, defense: 60, accuracy: 75, agility: 65 };
  const mother: StatBlock = { power: 80, speed: 94, stamina: 66, defense: 58, accuracy: 70, agility: 72 };
  const child = inheritStatBlock(father, mother);
  for (const key of GENETIC_STAT_KEYS) {
    assert.ok(Number.isInteger(child[key]));
    assert.ok(child[key] >= 1 && child[key] <= 99);
  }
});

test("inheritPhysicalTrait averages parents with zero noise", () => {
  const rng = queueRng([0.5, 0.5, 0.5, 0.5]);
  assert.equal(inheritPhysicalTrait(1.2, 1.0, { min: 0.7, max: 1.4 }, rng), 1.1);
});

test("inheritPhysicalTrait clamps to the range max", () => {
  const rng = queueRng([0.5, 1, 1, 1]);
  assert.equal(inheritPhysicalTrait(1.4, 1.4, { min: 0.7, max: 1.4 }, rng), 1.4);
});

test("inheritPhysicalTrait clamps to the range min", () => {
  const rng = queueRng([0.5, 0, 0, 0]);
  assert.equal(inheritPhysicalTrait(0.7, 0.7, { min: 0.7, max: 1.4 }, rng), 0.7);
});

test("inheritPhysicalBlock fills every physical trait key within its rig-supported range", () => {
  const father: PhysicalBlock = { body: 1.3, neck: 1.8, legs: 1.5, tail: 1.9, wings: 1.6 };
  const mother: PhysicalBlock = { body: 0.9, neck: 0.9, legs: 0.8, tail: 0.6, wings: 0.7 };
  for (let i = 0; i < 200; i++) {
    const child = inheritPhysicalBlock(father, mother);
    for (const key of PHYSICAL_TRAIT_KEYS) {
      const { min, max } = PHYSICAL_TRAIT_RANGE[key];
      assert.ok(child[key] >= min && child[key] <= max, `${key}=${child[key]} out of range`);
    }
  }
});

test("inheritMutations: two carrier parents always produce an expressed offspring, resolving incompatible conflicts by catalog order", () => {
  const bothCarry: MutationGenome = Object.fromEntries(
    MUTATION_POOL.map((def) => [def.id, { carrier: true, expressed: true }])
  );
  const rng = queueRng(new Array(10).fill(0));
  const child = inheritMutations(bothCarry, bothCarry, rng);

  assert.deepEqual(child.extra_toed, { carrier: true, expressed: true });
  assert.deepEqual(child.albino, { carrier: true, expressed: true });
  assert.deepEqual(child.giant, { carrier: true, expressed: true });
  // luminescent loses its incompatibility tie with albino (earlier in catalog order)
  assert.deepEqual(child.luminescent, { carrier: true, expressed: false });
  // two_headed loses its incompatibility tie with extra_toed (earlier in catalog order)
  assert.deepEqual(child.two_headed, { carrier: true, expressed: false });
});

test("inheritMutations: a single recessive carrier from one parent stays a hidden, unexpressed carrier", () => {
  const father: MutationGenome = { albino: { carrier: true, expressed: false } };
  const mother: MutationGenome = {};
  // Per-mutation in catalog order (extra_toed, albino, luminescent, giant, two_headed): a spontaneous
  // roll is drawn for every not-yet-expressed mutation, plus a pass-roll for albino's single carrier.
  const rng = queueRng([0.99, 0.1, 0.99, 0.99, 0.99, 0.99]);
  const child = inheritMutations(father, mother, rng);

  assert.deepEqual(child.albino, { carrier: true, expressed: false });
});

test("inheritMutations: a single dominant-copy allele expresses immediately", () => {
  const father: MutationGenome = { luminescent: { carrier: true, expressed: true } };
  const mother: MutationGenome = {};
  // extra_toed and albino draw a spontaneous roll each (no carriers), then luminescent's pass-roll
  // fires and expresses immediately (dominant, skipping its spontaneous roll), then giant/two_headed spontaneous rolls.
  const rng = queueRng([0.99, 0.99, 0.1, 0.99, 0.99]);
  const child = inheritMutations(father, mother, rng);

  assert.deepEqual(child.luminescent, { carrier: true, expressed: true });
});

test("inheritMutations: a spontaneous mutation roll can produce a fresh, uninherited mutation", () => {
  const rng = queueRng([0.005, 0.5, 0.5, 0.5, 0.5]);
  const child = inheritMutations({}, {}, rng);

  assert.deepEqual(child.extra_toed, { carrier: true, expressed: true });
  assert.equal(child.albino, undefined);
  assert.equal(child.luminescent, undefined);
  assert.equal(child.giant, undefined);
  assert.equal(child.two_headed, undefined);
});

test("inheritMutations: an inherited expression beats a spontaneous incompatible one", () => {
  const twoHeadedCarrier: MutationGenome = { two_headed: { carrier: true, expressed: false } };
  const rng = queueRng([0.005, 0.5, 0.5, 0.5, 0.1, 0.1]);
  const child = inheritMutations(twoHeadedCarrier, twoHeadedCarrier, rng);

  assert.deepEqual(child.two_headed, { carrier: true, expressed: true });
  assert.deepEqual(child.extra_toed, { carrier: true, expressed: false });
});
