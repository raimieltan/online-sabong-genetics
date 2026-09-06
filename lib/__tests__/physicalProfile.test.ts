import test from "node:test";
import assert from "node:assert/strict";

import { resolvePhysicalProfile, resolveVisualTraits } from "../physicalProfile";
import { makeChicken, physicalBlock } from "./testHelpers";

test("resolvePhysicalProfile returns all-1.0 modifiers for an all-1 baseline chicken", () => {
  const chicken = makeChicken({ physical: physicalBlock(1) });
  const profile = resolvePhysicalProfile(chicken);

  assert.equal(profile.mass, 1);
  assert.equal(profile.reach, 1);
  assert.equal(profile.mobility, 1);
  assert.equal(profile.stability, 1);
  assert.equal(profile.wingControl, 1);
  assert.equal(profile.kickPower, 1);
});

test("resolvePhysicalProfile: a bigger body raises both mass and stability (heavier, harder to knock back)", () => {
  const baseline = resolvePhysicalProfile(makeChicken({ physical: physicalBlock(1) }));
  const bigBody = resolvePhysicalProfile(makeChicken({ physical: { ...physicalBlock(1), body: 1.4 } }));

  assert.ok(bigBody.mass > baseline.mass);
  assert.ok(bigBody.stability > baseline.stability);
});

test("resolvePhysicalProfile: thinner legs relative to body lower stability", () => {
  const baseline = resolvePhysicalProfile(makeChicken({ physical: physicalBlock(1) }));
  const thinLegs = resolvePhysicalProfile(makeChicken({ physical: { ...physicalBlock(1), legs: 2.0 } }));

  assert.ok(thinLegs.stability < baseline.stability);
});

test("resolvePhysicalProfile: longer/thicker legs raise reach and kick power", () => {
  const baseline = resolvePhysicalProfile(makeChicken({ physical: physicalBlock(1) }));
  const longLegs = resolvePhysicalProfile(makeChicken({ physical: { ...physicalBlock(1), legs: 2.0 } }));

  assert.ok(longLegs.reach > baseline.reach);
  assert.ok(longLegs.kickPower > baseline.kickPower);
});

test("resolvePhysicalProfile: bigger wings relative to body raise wingControl", () => {
  const baseline = resolvePhysicalProfile(makeChicken({ physical: physicalBlock(1) }));
  const bigWings = resolvePhysicalProfile(makeChicken({ physical: { ...physicalBlock(1), wings: 2.0 } }));

  assert.ok(bigWings.wingControl > baseline.wingControl);
});

test("resolvePhysicalProfile: two chickens with identical combat stats but different physiques diverge in physical profile", () => {
  const sprinter = resolvePhysicalProfile(
    makeChicken({ physical: { body: 0.85, neck: 1, legs: 1.35, tail: 1, wings: 1.0 } })
  );
  const tank = resolvePhysicalProfile(
    makeChicken({ physical: { body: 1.35, neck: 1, legs: 0.85, tail: 1, wings: 0.9 } })
  );

  assert.ok(sprinter.reach > tank.reach);
  assert.ok(tank.mass > sprinter.mass);
  assert.ok(tank.stability > sprinter.stability);
});

test("resolvePhysicalProfile modifiers stay within the balancing band regardless of extreme proportions", () => {
  const extreme = resolvePhysicalProfile(
    makeChicken({ physical: { body: 0.6, neck: 2.2, legs: 2.0, tail: 2.2, wings: 2.0 } })
  );
  for (const value of Object.values(extreme)) {
    assert.ok(value >= 0.85 && value <= 1.15, `modifier ${value} outside balancing band`);
  }
});

test("resolveVisualTraits returns only expressed mutations' visual tags", () => {
  const chicken = makeChicken({
    mutations: {
      albino: { carrier: true, expressed: true },
      luminescent: { carrier: true, expressed: false },
    },
  });

  assert.deepEqual(resolveVisualTraits(chicken), ["ALBINO"]);
});

test("resolveVisualTraits returns an empty list for a chicken with no expressed mutations", () => {
  const chicken = makeChicken({ mutations: {} });
  assert.deepEqual(resolveVisualTraits(chicken), []);
});
