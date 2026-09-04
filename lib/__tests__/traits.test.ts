import test from "node:test";
import assert from "node:assert/strict";

import { TRAIT_POOL, inheritTraits } from "../traits";
import type { Trait } from "../types";

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

const IRON_STAMINA = TRAIT_POOL.find((t) => t.id === "iron-stamina") as Trait;
const CALM = TRAIT_POOL.find((t) => t.id === "calm") as Trait;

test("TRAIT_POOL has 7 seeded traits", () => {
  assert.equal(TRAIT_POOL.length, 7);
});

test("inheritTraits passes through a parent trait when the roll succeeds", () => {
  // father has 1 trait (roll 0.0 -> pass), mother has none, wild roll 0.9 -> no wild trait
  const rng = queueRng([0.0, 0.9]);
  const result = inheritTraits([IRON_STAMINA], [], rng);
  assert.deepEqual(result, [IRON_STAMINA]);
});

test("inheritTraits drops a parent trait when the roll fails", () => {
  const rng = queueRng([0.9, 0.9]);
  const result = inheritTraits([IRON_STAMINA], [], rng);
  assert.deepEqual(result, []);
});

test("inheritTraits does not duplicate a trait shared by both parents", () => {
  // both parents have IRON_STAMINA; first occurrence passes (0.0), second is
  // already seen so its roll is never consumed; wild roll 0.9 -> none
  const rng = queueRng([0.0, 0.9]);
  const result = inheritTraits([IRON_STAMINA], [IRON_STAMINA], rng);
  assert.deepEqual(result, [IRON_STAMINA]);
});

test("inheritTraits can add a wild trait", () => {
  // no parent traits to roll; wild roll 0.0 -> fires; weighted pick roll 0.0 -> first pool entry
  const rng = queueRng([0.0, 0.0]);
  const result = inheritTraits([], [], rng);
  assert.deepEqual(result, [TRAIT_POOL[0]]);
});

test("inheritTraits over many trials only returns traits from the input pools plus TRAIT_POOL", () => {
  const validIds = new Set([IRON_STAMINA.id, CALM.id, ...TRAIT_POOL.map((t) => t.id)]);
  for (let i = 0; i < 200; i++) {
    const result = inheritTraits([IRON_STAMINA], [CALM]);
    for (const trait of result) {
      assert.ok(validIds.has(trait.id));
    }
  }
});
