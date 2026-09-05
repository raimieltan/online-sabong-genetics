import test from "node:test";
import assert from "node:assert/strict";

import {
  MAX_TURNS,
  canFight,
  effectiveStat,
  generateMatchedOpponent,
  healChicken,
  rollHitZone,
  simulateFight,
} from "../combat";
import { makeChicken, statBlock } from "./testHelpers";
import { HIT_ZONES } from "../types";

test("effectiveStat weights IV above EV (60/40)", () => {
  const chicken = makeChicken({ iv: statBlock(100), ev: statBlock(0) });
  assert.equal(effectiveStat(chicken, "power"), 60);

  const trained = makeChicken({ iv: statBlock(0), ev: statBlock(100) });
  assert.equal(effectiveStat(trained, "power"), 40);
});

test("canFight requires a battle-eligible growth stage and no injury", () => {
  assert.equal(canFight(makeChicken({ growthStage: "adult", injured: false })), true);
  assert.equal(canFight(makeChicken({ growthStage: "adult", injured: true })), false);
  assert.equal(canFight(makeChicken({ growthStage: "chick", injured: false })), false);
});

test("canFight excludes hens — hens do not fight per baseline spec", () => {
  assert.equal(
    canFight(makeChicken({ sex: "hen", growthStage: "adult", injured: false })),
    false
  );
  assert.equal(
    canFight(makeChicken({ sex: "rooster", growthStage: "adult", injured: false })),
    true
  );
});

test("healChicken clears the injured flag and restores health", () => {
  const result = healChicken();
  assert.equal(result.injured, false);
  assert.ok(result.health > 0);
});

test("rollHitZone always returns a valid zone and is driven entirely by rng", () => {
  const zone = rollHitZone(() => 0);
  assert.ok(HIT_ZONES.includes(zone));

  const lastZone = rollHitZone(() => 0.9999);
  assert.ok(HIT_ZONES.includes(lastZone));
});

test("rollHitZone favors body/wings/legs over head/neck across many rolls", () => {
  let rngValue = 0;
  const rng = () => {
    rngValue = (rngValue + 0.0137) % 1;
    return rngValue;
  };
  const counts: Record<string, number> = {};
  for (let i = 0; i < 1000; i++) {
    const zone = rollHitZone(rng);
    counts[zone] = (counts[zone] ?? 0) + 1;
  }
  assert.ok((counts.body ?? 0) > (counts.head ?? 0));
  assert.ok((counts.body ?? 0) > (counts.neck ?? 0));
});

test("generateMatchedOpponent produces a full, distinct chicken within a stat tolerance band", () => {
  const player = makeChicken({ id: "player", iv: statBlock(60), ev: statBlock(20) });
  const totalKeys = ["power", "speed", "stamina", "defense", "accuracy", "agility"] as const;
  const playerTotal = totalKeys.reduce((sum, key) => sum + effectiveStat(player, key), 0);

  const opponent = generateMatchedOpponent(player);

  assert.notEqual(opponent.id, player.id);
  assert.equal(opponent.injured, false);
  const opponentTotal = totalKeys.reduce((sum, key) => sum + effectiveStat(opponent, key), 0);
  const ratio = opponentTotal / playerTotal;
  assert.ok(ratio >= 0.6 && ratio <= 1.6, `expected opponent total within tolerance, got ratio ${ratio}`);
});

test("generateMatchedOpponent always produces a rooster — hens do not fight", () => {
  const player = makeChicken({ id: "player" });
  for (let i = 0; i < 20; i += 1) {
    const opponent = generateMatchedOpponent(player);
    assert.equal(opponent.sex, "rooster");
  }
});

test("simulateFight declares a winner and terminates within MAX_TURNS", () => {
  const a = makeChicken({ id: "a", iv: statBlock(90), ev: statBlock(50) });
  const b = makeChicken({ id: "b", iv: statBlock(30), ev: statBlock(10) });

  const result = simulateFight(a, b);

  assert.ok(result.winnerId === "a" || result.winnerId === "b");
  assert.ok(result.loserId === "a" || result.loserId === "b");
  assert.notEqual(result.winnerId, result.loserId);
  assert.ok(result.totalTurns <= MAX_TURNS);
  assert.ok(result.log.length > 0);
  assert.ok(["ko", "timeout", "critical_injury"].includes(result.outcomeReason));
});

test("simulateFight is deterministic for a given rng", () => {
  const a = makeChicken({ id: "a", iv: statBlock(70) });
  const b = makeChicken({ id: "b", iv: statBlock(65) });

  let seed1 = 1;
  const rng1 = () => {
    seed1 = (seed1 * 16807) % 2147483647;
    return (seed1 - 1) / 2147483646;
  };
  let seed2 = 1;
  const rng2 = () => {
    seed2 = (seed2 * 16807) % 2147483647;
    return (seed2 - 1) / 2147483646;
  };

  const result1 = simulateFight(a, b, rng1);
  const result2 = simulateFight(a, b, rng2);

  assert.deepEqual(result1, result2);
});

test("simulateFight favors the far stronger chicken across many trials", () => {
  const strong = makeChicken({ id: "strong", iv: statBlock(95), ev: statBlock(80) });
  const weak = makeChicken({ id: "weak", iv: statBlock(15), ev: statBlock(0) });

  let wins = 0;
  for (let i = 0; i < 30; i++) {
    const result = simulateFight(strong, weak);
    if (result.winnerId === "strong") wins++;
  }
  assert.ok(wins >= 25, `expected the far stronger chicken to win most fights, won ${wins}/30`);
});

test("a head/neck crit can trigger a critical injury that ends the fight immediately", () => {
  // rng sequence tuned to force: attacker picked, no miss, crit, head zone, then
  // the critical-injury roll succeeding on the very first turn.
  const values = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
  let i = 0;
  const rng = () => values[Math.min(i++, values.length - 1)];

  const a = makeChicken({ id: "a", iv: statBlock(99), ev: statBlock(100) });
  const b = makeChicken({ id: "b", iv: statBlock(1), ev: statBlock(0) });

  const result = simulateFight(a, b, rng);

  assert.equal(result.outcomeReason, "critical_injury");
  assert.equal(result.totalTurns, 1);
  assert.equal(result.injuredChickenId, "b");
  assert.equal(result.winnerId, "a");
  assert.equal(result.log[0].isCritical, true);
  assert.equal(result.log[0].hitZone, "head");
});
