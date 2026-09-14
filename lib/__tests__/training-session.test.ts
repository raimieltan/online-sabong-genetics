import test from "node:test";
import assert from "node:assert/strict";

import { applyTrainingSession } from "../training/session";
import { defaultRoosterTrainingState } from "../training/state";
import { statBlock } from "./testHelpers";

test("applyTrainingSession at moderate intensity matches today's plain EV gain when potential/effort don't bind", () => {
  const roosterTraining = defaultRoosterTrainingState(statBlock(100));
  const result = applyTrainingSession({
    roosterTraining,
    ev: statBlock(10),
    category: "strength",
    stat: "power",
    baseGain: 5,
    trainingFatigue: 0,
    lifeStageMultiplier: 1,
    intensity: "moderate",
    extremeSessionStreak: 0,
    rng: () => 0.999, // never breakthroughs, never trainingPotential-limited (already rolled)
  });

  assert.equal(result.ev.power, 15);
  assert.equal(result.energyMultiplier, 1);
  assert.equal(result.fatigueMultiplier, 1);
  assert.equal(result.stressGain, 0);
});

test("applyTrainingSession clamps EV to trainingPotential, not the flat 100 cap", () => {
  const roosterTraining = defaultRoosterTrainingState({ ...statBlock(100), power: 12 });
  const result = applyTrainingSession({
    roosterTraining,
    ev: statBlock(10),
    category: "strength",
    stat: "power",
    baseGain: 5,
    trainingFatigue: 0,
    lifeStageMultiplier: 1,
    intensity: "moderate",
    extremeSessionStreak: 0,
    rng: () => 0.999,
  });

  assert.equal(result.ev.power, 12);
});

test("applyTrainingSession credits XP pools for the trained category", () => {
  const roosterTraining = defaultRoosterTrainingState(statBlock(100));
  const result = applyTrainingSession({
    roosterTraining,
    ev: statBlock(10),
    category: "recovery",
    stat: "stamina",
    baseGain: 5,
    trainingFatigue: 0,
    lifeStageMultiplier: 1,
    intensity: "moderate",
    extremeSessionStreak: 0,
    rng: () => 0.999,
  });

  assert.equal(result.roosterTraining.recoveryXP, 10);
});

test("applyTrainingSession at hard intensity produces stress", () => {
  const roosterTraining = defaultRoosterTrainingState(statBlock(100));
  const result = applyTrainingSession({
    roosterTraining,
    ev: statBlock(10),
    category: "strength",
    stat: "power",
    baseGain: 5,
    trainingFatigue: 0,
    lifeStageMultiplier: 1,
    intensity: "hard",
    extremeSessionStreak: 0,
    rng: () => 0.999,
  });

  assert.equal(result.stressGain, 8);
  assert.ok(result.injuryChance > 0);
});

test("applyTrainingSession forces the overtrained trigger after 5 extreme sessions at high fatigue", () => {
  const roosterTraining = defaultRoosterTrainingState(statBlock(100));
  const result = applyTrainingSession({
    roosterTraining,
    ev: statBlock(10),
    category: "strength",
    stat: "power",
    baseGain: 5,
    trainingFatigue: 85,
    lifeStageMultiplier: 1,
    intensity: "extreme",
    extremeSessionStreak: 5,
    rng: () => 0.999,
  });

  assert.equal(result.overtrainedTriggered, true);
  assert.ok(result.roosterTraining.traits.some((t) => t.id === "overtrained"));
});
