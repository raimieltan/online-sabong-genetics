import test from "node:test";
import assert from "node:assert/strict";

import {
  nextGrowthStage,
  canAgeUp,
  canRetire,
  canTrain,
  canBattle,
  canBreed,
} from "../growth";
import { GROWTH_STAGES, type GrowthStage } from "../types";

test("nextGrowthStage advances through the ladder in order", () => {
  assert.equal(nextGrowthStage("chick"), "juvenile");
  assert.equal(nextGrowthStage("juvenile"), "young_adult");
  assert.equal(nextGrowthStage("young_adult"), "adult");
  assert.equal(nextGrowthStage("adult"), "prime");
  assert.equal(nextGrowthStage("prime"), "senior");
});

test("nextGrowthStage does not advance past senior", () => {
  assert.equal(nextGrowthStage("senior"), "senior");
});

test("nextGrowthStage does not advance past retired", () => {
  assert.equal(nextGrowthStage("retired"), "retired");
});

test("canAgeUp is true for every stage except senior and retired", () => {
  const expected: Record<GrowthStage, boolean> = {
    chick: true,
    juvenile: true,
    young_adult: true,
    adult: true,
    prime: true,
    senior: false,
    retired: false,
  };
  for (const stage of GROWTH_STAGES) {
    assert.equal(canAgeUp(stage), expected[stage], stage);
  }
});

test("canRetire is true only for senior", () => {
  const expected: Record<GrowthStage, boolean> = {
    chick: false,
    juvenile: false,
    young_adult: false,
    adult: false,
    prime: false,
    senior: true,
    retired: false,
  };
  for (const stage of GROWTH_STAGES) {
    assert.equal(canRetire(stage), expected[stage], stage);
  }
});

test("canTrain is true for young_adult, adult, prime, and senior", () => {
  const expected: Record<GrowthStage, boolean> = {
    chick: false,
    juvenile: false,
    young_adult: true,
    adult: true,
    prime: true,
    senior: true,
    retired: false,
  };
  for (const stage of GROWTH_STAGES) {
    assert.equal(canTrain(stage), expected[stage], stage);
  }
});

test("canBattle is true for young_adult, adult, prime, and senior", () => {
  const expected: Record<GrowthStage, boolean> = {
    chick: false,
    juvenile: false,
    young_adult: true,
    adult: true,
    prime: true,
    senior: true,
    retired: false,
  };
  for (const stage of GROWTH_STAGES) {
    assert.equal(canBattle(stage), expected[stage], stage);
  }
});

test("canBreed is true for adult, prime, senior, and retired", () => {
  const expected: Record<GrowthStage, boolean> = {
    chick: false,
    juvenile: false,
    young_adult: false,
    adult: true,
    prime: true,
    senior: true,
    retired: true,
  };
  for (const stage of GROWTH_STAGES) {
    assert.equal(canBreed(stage), expected[stage], stage);
  }
});
