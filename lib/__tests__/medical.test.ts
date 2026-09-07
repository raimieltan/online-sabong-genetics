import test from "node:test";
import assert from "node:assert/strict";

import { makeChicken } from "./testHelpers";
import { medicalStatus } from "../medical/status";
import { battleEligibility } from "../medical/eligibility";
import { trainingLocks, rehabStage, isTrainingLocked } from "../medical/rehab";
import { treatmentPlan, resolveTreatment, markInTreatment } from "../medical/treatment";
import { canTreatSeverity } from "../medical/config";
import { rollIllness, tickIllnessRecovery, createIllness } from "../medical/illness";
import { recoveryQuality, applyRecovery } from "../recovery/engine";
import type { InjuryRecord } from "../types";

function injury(overrides: Partial<InjuryRecord> = {}): InjuryRecord {
  return {
    id: "inj-1",
    severity: "serious",
    label: "Wing sprain",
    incurredAt: Date.now(),
    recoveryRemaining: 3,
    permanent: false,
    location: "wing",
    ...overrides,
  };
}

// --- medicalStatus ---------------------------------------------------------

test("medicalStatus is healthy for a fresh chicken", () => {
  assert.equal(medicalStatus(makeChicken()), "healthy");
});

test("medicalStatus reports critical for an untreated career-altering injury", () => {
  const chicken = makeChicken({ injuries: [injury({ severity: "career_altering", permanent: true, recoveryRemaining: 0 })] });
  assert.equal(medicalStatus(chicken), "critical");
});

test("medicalStatus reports injured for an active serious injury", () => {
  assert.equal(medicalStatus(makeChicken({ injuries: [injury()] })), "injured");
});

test("medicalStatus reports recovering once the injury is under treatment", () => {
  assert.equal(medicalStatus(makeChicken({ injuries: [injury({ severity: "minor", inTreatment: true })] })), "recovering");
});

test("medicalStatus reports needs_attention for an untreated minor injury", () => {
  assert.equal(medicalStatus(makeChicken({ injuries: [injury({ severity: "minor", recoveryRemaining: 1 })] })), "needs_attention");
});

// --- battleEligibility ----------------------------------------------------

test("battleEligibility passes a healthy adult rooster", () => {
  const result = battleEligibility(makeChicken());
  assert.equal(result.eligible, true);
  assert.deepEqual(result.reasons, []);
});

test("battleEligibility blocks a career-altering injury with a reason", () => {
  const chicken = makeChicken({ injuries: [injury({ severity: "career_altering", permanent: true, recoveryRemaining: 0 })] });
  const result = battleEligibility(chicken);
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((r) => r.toLowerCase().includes("career-altering")));
});

test("battleEligibility blocks low condition", () => {
  const result = battleEligibility(makeChicken({ condition: 20 }));
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((r) => r.toLowerCase().includes("condition")));
});

test("battleEligibility blocks an overtrained chicken", () => {
  const result = battleEligibility(
    makeChicken({ trainingState: { trainingPoints: 0, trainingFatigue: 95, history: [] } }),
  );
  assert.equal(result.eligible, false);
  assert.ok(result.reasons.some((r) => r.toLowerCase().includes("overtrained")));
});

// --- training locks -----------------------------------------------------

test("trainingLocks locks leg categories for a leg injury but never recovery", () => {
  const locks = trainingLocks([injury({ location: "leg" })]);
  assert.ok(locks.has("strength"));
  assert.ok(locks.has("speed"));
  assert.ok(!locks.has("recovery"));
});

test("trainingLocks ignores healed and minor injuries", () => {
  assert.equal(trainingLocks([injury({ recoveryRemaining: 0 })]).size, 0);
  assert.equal(trainingLocks([injury({ severity: "minor" })]).size, 0);
});

test("isTrainingLocked with an unlocated serious injury locks everything but recovery", () => {
  const inj = injury({ location: undefined });
  assert.equal(isTrainingLocked([inj], "strength"), true);
  assert.equal(isTrainingLocked([inj], "recovery"), false);
});

// --- rehab ladder -----------------------------------------------------

test("rehabStage walks from critical toward normal_training as recovery completes", () => {
  assert.equal(rehabStage(injury({ recoveryRemaining: 10 }), 10), "critical");
  assert.equal(rehabStage(injury({ recoveryRemaining: 1 }), 10), "normal_training");
  assert.equal(rehabStage(injury({ recoveryRemaining: 0 }), 10), "recovered");
});

// --- treatment plan ---------------------------------------------------

test("treatmentPlan is cheaper and faster at a higher clinic level", () => {
  const l1 = treatmentPlan("serious", 1);
  const l4 = treatmentPlan("serious", 4);
  assert.ok(l4.cost < l1.cost);
  assert.ok(l4.durationMinutes < l1.durationMinutes);
  assert.ok(l4.effectiveness > l1.effectiveness);
});

test("canTreatSeverity gates severe injuries behind higher clinic levels", () => {
  assert.equal(canTreatSeverity(1, "minor"), true);
  assert.equal(canTreatSeverity(1, "serious"), false);
  assert.equal(canTreatSeverity(2, "serious"), true);
  assert.equal(canTreatSeverity(3, "career_altering"), true);
});

test("resolveTreatment clears a non-permanent injury and eases a permanent one", () => {
  const nonPerm = injury({ id: "a" });
  const perm = injury({ id: "b", severity: "career_altering", permanent: true, recoveryRemaining: 0, statPenalty: { power: -10 } });

  const clearedResult = resolveTreatment([nonPerm], "a", 2);
  assert.equal(clearedResult.cleared, true);
  assert.equal(clearedResult.injuries.length, 0);

  const easedResult = resolveTreatment([perm], "b", 3);
  assert.equal(easedResult.cleared, false);
  assert.equal(easedResult.injuries.length, 1);
  assert.ok((easedResult.injuries[0].statPenalty?.power ?? -10) > -10);
});

test("markInTreatment flags only the targeted injury", () => {
  const marked = markInTreatment([injury({ id: "a" }), injury({ id: "b" })], "a");
  assert.equal(marked.find((i) => i.id === "a")?.inTreatment, true);
  assert.equal(marked.find((i) => i.id === "b")?.inTreatment, undefined);
});

// --- illness --------------------------------------------------------

test("rollIllness returns null for a fresh, unstressed chicken", () => {
  const always = () => 0.999;
  assert.equal(rollIllness(always, { trainingFatigue: 0, stress: 0, condition: 100 }), null);
});

test("rollIllness fires under heavy overtraining when the roll is low", () => {
  const always = () => 0;
  const result = rollIllness(always, { trainingFatigue: 95, stress: 70, condition: 40 });
  assert.ok(result);
  assert.ok(result!.recoveryRemaining > 0);
});

test("tickIllnessRecovery counts down and drops cleared illnesses", () => {
  const ill = createIllness("respiratory", "minor");
  const after = tickIllnessRecovery([ill], ill.recoveryRemaining);
  assert.equal(after.length, 0);
});

// --- recovery engine ----------------------------------------------------

test("recoveryQuality is lower with active injuries and high stress", () => {
  const healthy = recoveryQuality(makeChicken(), "rest", 0);
  const hurt = recoveryQuality(makeChicken({ injuries: [injury()], stress: 90 }), "rest", 0);
  assert.ok(hurt < healthy);
});

test("applyRecovery tops off energy, cuts fatigue and stress, lifts morale", () => {
  const chicken = makeChicken({
    energy: 10,
    stress: 60,
    morale: 40,
    trainingState: { trainingPoints: 0, trainingFatigue: 70, history: [] },
  });
  const result = applyRecovery(chicken, "rest", 0);
  assert.equal(result.energy, 100);
  assert.ok(result.trainingState.trainingFatigue < 70);
  assert.ok(result.stress < 60);
  assert.ok(result.morale > 40);
  assert.equal(result.trainingState.trainingPoints, 100);
});

test("applyRecovery at a recovery facility beats a plain rest", () => {
  const chicken = makeChicken({ stress: 80, trainingState: { trainingPoints: 0, trainingFatigue: 80, history: [] } });
  const plain = applyRecovery(chicken, "rest", 0);
  const facility = applyRecovery(chicken, "recovery_facility", 3);
  assert.ok(facility.quality > plain.quality);
  assert.ok(facility.stress < plain.stress);
});
