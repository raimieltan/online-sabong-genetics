import test from "node:test";
import assert from "node:assert/strict";

import { ageUpRequirements, canChickenAgeUp, growthVisualScale } from "../growth";
import type { Chicken } from "../types";

function maturitySubject(overrides: Partial<Chicken> = {}) {
  return {
    age: 0,
    condition: 100,
    energy: 100,
    growthStage: "chick",
    health: 100,
    injured: false,
    status: "active",
    ...overrides,
  } as Pick<Chicken, "age" | "condition" | "energy" | "growthStage" | "health" | "injured" | "status">;
}

test("visual growth reaches full size at adult and does not scale up afterward", () => {
  assert.equal(growthVisualScale("chick"), 0.46);
  assert.equal(growthVisualScale("juvenile"), 0.66);
  assert.equal(growthVisualScale("young_adult"), 0.84);
  assert.equal(growthVisualScale("adult"), 1);
  assert.equal(growthVisualScale("prime"), 1);
  assert.equal(growthVisualScale("senior"), 1);
  assert.equal(growthVisualScale("retired"), 1);
});

test("a healthy active chicken is ready to mature", () => {
  assert.equal(canChickenAgeUp(maturitySubject()), true);
  assert.equal(ageUpRequirements(maturitySubject()).every((requirement) => requirement.met), true);
});

test("maturity is blocked until every readiness requirement is met", () => {
  const chicken = maturitySubject({ energy: 20, health: 70, injured: true });
  const unmet = ageUpRequirements(chicken).filter((requirement) => !requirement.met).map((requirement) => requirement.id);

  assert.equal(canChickenAgeUp(chicken), false);
  assert.deepEqual(unmet, ["healthy", "energy"]);
});

test("a chicken cannot mature past the senior stage", () => {
  assert.equal(canChickenAgeUp(maturitySubject({ age: 5, growthStage: "senior" })), false);
});
