import assert from "node:assert/strict";
import { test } from "node:test";

import { getVillageSlot, paginateVillage, VILLAGE_CAPACITY } from "../coopVillage";

test("getVillageSlot gives every index a unique, non-overlapping position", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 60; i++) {
    const { home } = getVillageSlot(i);
    const key = `${home[0].toFixed(2)},${home[2].toFixed(2)}`;
    assert.ok(!seen.has(key), `slot ${i} collides at ${key}`);
    seen.add(key);
  }
});

test("getVillageSlot keeps adjacent huts at least a hut-width apart", () => {
  for (let i = 0; i < 40; i++) {
    for (let j = i + 1; j < 40; j++) {
      const a = getVillageSlot(i).home;
      const b = getVillageSlot(j).home;
      const dist = Math.hypot(a[0] - b[0], a[2] - b[2]);
      assert.ok(dist > 1.2, `slots ${i} and ${j} are only ${dist.toFixed(2)} apart`);
    }
  }
});

test("paginateVillage slices the roster by capacity", () => {
  const all = Array.from({ length: 30 }, (_, i) => i);
  const first = paginateVillage(all, 0);
  assert.equal(first.page, 0);
  assert.equal(first.pageCount, 3);
  assert.deepEqual(first.items, all.slice(0, VILLAGE_CAPACITY));

  const second = paginateVillage(all, 1);
  assert.deepEqual(second.items, all.slice(VILLAGE_CAPACITY, VILLAGE_CAPACITY * 2));
});

test("paginateVillage clamps an out-of-range page", () => {
  const all = Array.from({ length: 15 }, (_, i) => i);
  const result = paginateVillage(all, 9);
  assert.equal(result.pageCount, 2);
  assert.equal(result.page, 1);
  assert.deepEqual(result.items, all.slice(VILLAGE_CAPACITY));
});

test("paginateVillage always reports at least one page, even when empty", () => {
  const result = paginateVillage([], 0);
  assert.equal(result.pageCount, 1);
  assert.equal(result.page, 0);
  assert.deepEqual(result.items, []);
});
