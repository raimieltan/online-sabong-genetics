import { MUTATION_POOL } from "./mutations";
import type { Chicken, GeneticStatKey } from "./types";

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
  const { bodyGirth, bodyLength, chest, legLength, legThick, footSize, wingSpan, wingSize, neckThick } =
    chicken.physical;

  const body = (bodyGirth + bodyLength + chest) / 3;
  const wings = (wingSpan + wingSize) / 2;

  return {
    mass: toModifier(body),
    reach: toModifier(legLength),
    mobility: toModifier((wings + legLength) / (2 * bodyGirth)),
    stability: toModifier((bodyGirth + neckThick) / (2 * legLength)),
    wingControl: toModifier(wings / chest),
    kickPower: toModifier((legThick + footSize + bodyGirth) / 3),
  };
}

/**
 * Second, independent bounded modifier — a more direct trait→stat path
 * (spirit of roosterGenome.ts's deriveStats, re-derived for this game's 6
 * GeneticStatKeys) layered on top of `resolvePhysicalProfile`'s modifiers in
 * effectiveStat(). Same 0.85–1.15 cap and centralization principle: combat
 * never reads raw traits itself.
 */
export function traitStatModifier(chicken: Pick<Chicken, "physical">, key: GeneticStatKey): number {
  const t = chicken.physical;
  switch (key) {
    case "power":
      return toModifier((t.legThick + t.footSize + t.chest) / 3);
    case "speed":
      return toModifier((t.legLength + 1 / t.bodyGirth) / 2);
    case "stamina":
      return toModifier((t.chest + t.bodyGirth) / 2);
    case "defense":
      return toModifier((t.bodyGirth + t.wingSpan + t.neckThick) / 3);
    case "accuracy":
      return toModifier((t.headSize + t.beakLength + t.neckLength) / 3);
    case "agility":
      return toModifier((t.legLength + t.wingSpan + 1 / t.bodyGirth) / 3);
    default:
      return 1;
  }
}

/** Genome → expressed mutation tags for the render layer (spec item 16) — the model never reads raw genetics. */
export function resolveVisualTraits(chicken: Pick<Chicken, "mutations">): string[] {
  return MUTATION_POOL.filter((def) => chicken.mutations[def.id]?.expressed).map((def) => def.visualEffect);
}
