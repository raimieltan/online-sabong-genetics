import test from "node:test";
import assert from "node:assert/strict";

import {
  createRooster,
  getStatTotal,
  calculateOdds,
  generateRandomRooster,
  PRESET_ROOSTERS,
  COLOR_PALETTES,
} from "../roosterGenerator";
import { STAT_KEYS } from "../types";

test("createRooster derives maxHp as 50 + stamina * 1.5 and full HP start", () => {
  const rooster = createRooster({
    name: "Test",
    type: "Custom",
    speed: 50,
    stamina: 60,
    damage: 50,
    aggression: 50,
    defense: 50,
    luck: 50,
    colorScheme: COLOR_PALETTES[0],
  });

  assert.equal(rooster.maxHp, 50 + 60 * 1.5);
  assert.equal(rooster.hp, rooster.maxHp);
  assert.equal(rooster.fatigued, false);
  assert.ok(rooster.id.length > 0);
});

test("createRooster respects an explicit id instead of generating one", () => {
  const rooster = createRooster({
    id: "fixed-id",
    name: "Test",
    type: "Custom",
    speed: 50,
    stamina: 60,
    damage: 50,
    aggression: 50,
    defense: 50,
    luck: 50,
    colorScheme: COLOR_PALETTES[0],
  });

  assert.equal(rooster.id, "fixed-id");
});

test("getStatTotal sums all six base stats", () => {
  const rooster = createRooster({
    name: "Test",
    type: "Custom",
    speed: 10,
    stamina: 20,
    damage: 30,
    aggression: 40,
    defense: 50,
    luck: 60,
    colorScheme: COLOR_PALETTES[0],
  });

  assert.equal(getStatTotal(rooster), 10 + 20 + 30 + 40 + 50 + 60);
});

test("calculateOdds matches (opponentTotal / selectedTotal) * 1.8, floored at 1.05", () => {
  const weak = createRooster({
    name: "Weak",
    type: "Custom",
    speed: 20,
    stamina: 20,
    damage: 20,
    aggression: 20,
    defense: 20,
    luck: 20,
    colorScheme: COLOR_PALETTES[0],
  });
  const strong = createRooster({
    name: "Strong",
    type: "Custom",
    speed: 90,
    stamina: 90,
    damage: 90,
    aggression: 90,
    defense: 90,
    luck: 90,
    colorScheme: COLOR_PALETTES[0],
  });

  const expected = Number(((getStatTotal(strong) / getStatTotal(weak)) * 1.8).toFixed(2));
  assert.equal(calculateOdds(weak, strong), expected);

  // Betting on the far stronger rooster should approach the 1.05 floor.
  const oddsOnFavorite = calculateOdds(strong, weak);
  assert.ok(oddsOnFavorite >= 1.05);
});

test("calculateOdds never returns below the 1.05 floor for an overwhelming favorite", () => {
  const favorite = createRooster({
    name: "Favorite",
    type: "Custom",
    speed: 100,
    stamina: 100,
    damage: 100,
    aggression: 100,
    defense: 100,
    luck: 100,
    colorScheme: COLOR_PALETTES[0],
  });
  const underdog = createRooster({
    name: "Underdog",
    type: "Custom",
    speed: 20,
    stamina: 20,
    damage: 20,
    aggression: 20,
    defense: 20,
    luck: 20,
    colorScheme: COLOR_PALETTES[0],
  });

  assert.equal(calculateOdds(favorite, underdog), 1.05);
});

test("PRESET_ROOSTERS contains exactly Lightning, Fortress, and Champion with spec stats", () => {
  assert.equal(PRESET_ROOSTERS.length, 3);

  const byName = Object.fromEntries(PRESET_ROOSTERS.map((r) => [r.name, r]));

  assert.equal(byName.Lightning.type, "Speed Demon");
  assert.equal(byName.Lightning.speed, 85);
  assert.equal(byName.Lightning.stamina, 40);
  assert.equal(byName.Lightning.damage, 70);
  assert.equal(byName.Lightning.aggression, 80);
  assert.equal(byName.Lightning.defense, 20);
  assert.equal(byName.Lightning.luck, 50);

  assert.equal(byName.Fortress.type, "Tank");
  assert.equal(byName.Fortress.stamina, 90);
  assert.equal(byName.Fortress.defense, 85);

  assert.equal(byName.Champion.type, "Balanced");
  assert.equal(byName.Champion.speed, 65);

  for (const rooster of PRESET_ROOSTERS) {
    assert.equal(rooster.maxHp, 50 + rooster.stamina * 1.5);
    assert.equal(rooster.hp, rooster.maxHp);
    assert.equal(rooster.fatigued, false);
  }
});

test("PRESET_ROOSTERS have stable ids across module evaluation", () => {
  const ids = PRESET_ROOSTERS.map((r) => r.id);
  assert.deepEqual(ids, ["preset-lightning", "preset-fortress", "preset-champion"]);
});

test("generateRandomRooster produces a stat pool totaling 300-350 points, each stat 20-100", () => {
  for (let i = 0; i < 200; i += 1) {
    const rooster = generateRandomRooster();
    const total = getStatTotal(rooster);

    assert.ok(total >= 300 && total <= 350, `total ${total} out of range`);
    for (const key of STAT_KEYS) {
      const value = rooster[key];
      assert.ok(value >= 20 && value <= 100, `${key}=${value} out of range`);
    }
    assert.equal(rooster.maxHp, 50 + rooster.stamina * 1.5);
    assert.equal(rooster.hp, rooster.maxHp);
    assert.equal(rooster.fatigued, false);
    assert.equal(rooster.type, "Custom");
  }
});

test("generateRandomRooster uses the provided name when given", () => {
  const rooster = generateRandomRooster("Custom Name");
  assert.equal(rooster.name, "Custom Name");
});

test("generateRandomRooster falls back to a non-empty name when none is given", () => {
  const rooster = generateRandomRooster();
  assert.ok(rooster.name.length > 0);
});

test("generateRandomRooster assigns distinct ids across calls", () => {
  const first = generateRandomRooster();
  const second = generateRandomRooster();
  assert.notEqual(first.id, second.id);
});
