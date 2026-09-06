import test from "node:test";
import assert from "node:assert/strict";

import { chickenValue } from "../valuation";
import type { Trait } from "../types";
import { makeChicken as baseChicken, statBlock } from "./testHelpers";

function trait(rarity: Trait["rarity"]): Trait {
  return { id: rarity, name: rarity, rarity, description: "" };
}

test("chickenValue is always positive, even for a weak chicken", () => {
  assert.ok(chickenValue(baseChicken({ iv: statBlock(1) })) > 0);
});

test("chickenValue increases with higher IVs", () => {
  const weak = chickenValue(baseChicken({ iv: statBlock(30) }));
  const strong = chickenValue(baseChicken({ iv: statBlock(90) }));
  assert.ok(strong > weak);
});

test("chickenValue increases with rarer traits", () => {
  const noTraits = chickenValue(baseChicken());
  const legendary = chickenValue(baseChicken({ traits: [trait("legendary")] }));
  assert.ok(legendary > noTraits);
});

test("chickenValue increases with combat record (wins and championships)", () => {
  const rookie = chickenValue(baseChicken());
  const veteran = chickenValue(
    baseChicken({
      record: { wins: 20, losses: 2, championships: 3, koTko: 10, decisions: 10 },
    }),
  );
  assert.ok(veteran > rookie);
});

test("chickenValue is lower for a chick than an adult with identical genetics", () => {
  const chick = chickenValue(baseChicken({ growthStage: "chick" }));
  const adult = chickenValue(baseChicken({ growthStage: "adult" }));
  assert.ok(chick < adult);
});
