import test from "node:test";
import assert from "node:assert/strict";

import { inheritStat, inheritStatBlock } from "../genetics";
import { GENETIC_STAT_KEYS, type StatBlock } from "../types";

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
