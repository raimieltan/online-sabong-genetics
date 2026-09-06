import { MUTATION_POOL } from "./mutations";
import type { Chicken } from "./types";

/**
 * Combat-facing physical profile, derived from the 5 raw proportion genes
 * (and ratios between them) rather than exposing raw bone scales directly to
 * combat — keeps balancing centralized here instead of scattered through
 * lib/combat.ts (spec: "don't let every dimension directly affect combat").
 * Each field is a multiplier centered on 1.0 for a baseline (all-1) chicken.
 */
export type PhysicalProfile = {
  mass: number;
  reach: number;
  mobility: number;
  stability: number;
  wingControl: number;
  kickPower: number;
};

const MODIFIER_MIN = 0.85;
const MODIFIER_MAX = 1.15;
const MODIFIER_SENSITIVITY = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Compresses a raw ratio (which can range far wider than the modifier band) into a bounded multiplier. */
function toModifier(ratio: number): number {
  return clamp(1 + (ratio - 1) * MODIFIER_SENSITIVITY, MODIFIER_MIN, MODIFIER_MAX);
}

export function resolvePhysicalProfile(chicken: Pick<Chicken, "physical">): PhysicalProfile {
  const { body, legs, wings } = chicken.physical;

  return {
    mass: toModifier(body),
    reach: toModifier(legs),
    mobility: toModifier((wings + legs) / (2 * body)),
    stability: toModifier(body / legs),
    wingControl: toModifier(wings / body),
    kickPower: toModifier((body + legs) / 2),
  };
}

/** Genome → expressed mutation tags for the render layer (spec item 16) — the model never reads raw genetics. */
export function resolveVisualTraits(chicken: Pick<Chicken, "mutations">): string[] {
  return MUTATION_POOL.filter((def) => chicken.mutations[def.id]?.expressed).map((def) => def.visualEffect);
}
