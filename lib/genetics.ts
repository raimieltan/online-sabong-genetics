import { MUTATION_POOL } from "./mutations";
import {
  GENETIC_STAT_KEYS,
  PHYSICAL_TRAIT_KEYS,
  PHYSICAL_TRAIT_RANGE,
  type ChickenColorScheme,
  type MutationGenome,
  type PhysicalBlock,
  type StatBlock,
} from "./types";

const COLOR_KEYS = ["body", "hackle", "wings", "tail", "comb", "beak", "shanks"] as const;

export type Rng = () => number;

const MUTATION_CHANCE = 0.03;
const MUTATION_MIN_BONUS = 10;
const MUTATION_MAX_BONUS = 20;
const VARIANCE_SPREAD = 8;
const MIN_STAT = 1;
const MAX_STAT = 99;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * inheritStat draws weight, three noise samples, and a mutation check (and,
 * only if mutation fires, a magnitude) from rng in that exact order — tests
 * rely on this sequence to drive deterministic fake rngs.
 */
export function inheritStat(fatherValue: number, motherValue: number, rng: Rng = Math.random): number {
  const weight = 0.35 + rng() * 0.3;
  const weighted = fatherValue * weight + motherValue * (1 - weight);

  const noise = ((rng() - 0.5) + (rng() - 0.5) + (rng() - 0.5)) / 1.5;
  let result = weighted + noise * VARIANCE_SPREAD;

  if (rng() < MUTATION_CHANCE) {
    result += MUTATION_MIN_BONUS + rng() * (MUTATION_MAX_BONUS - MUTATION_MIN_BONUS);
  }

  return Math.round(clamp(result, MIN_STAT, MAX_STAT));
}

export function inheritStatBlock(father: StatBlock, mother: StatBlock, rng: Rng = Math.random): StatBlock {
  const result = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => {
    result[key] = inheritStat(father[key], mother[key], rng);
  });
  return result;
}

/** Physical proportions are a genetic block, not a mutation — no mutation-bonus roll, just blend + noise. */
export function inheritPhysicalTrait(
  fatherValue: number,
  motherValue: number,
  range: { min: number; max: number },
  rng: Rng = Math.random
): number {
  const weight = 0.35 + rng() * 0.3;
  const weighted = fatherValue * weight + motherValue * (1 - weight);

  const spread = (range.max - range.min) * 0.08;
  const noise = ((rng() - 0.5) + (rng() - 0.5) + (rng() - 0.5)) / 1.5;
  const result = weighted + noise * spread;

  return Number(clamp(result, range.min, range.max).toFixed(2));
}

export function inheritPhysicalBlock(
  father: PhysicalBlock,
  mother: PhysicalBlock,
  rng: Rng = Math.random
): PhysicalBlock {
  const result = {} as PhysicalBlock;
  PHYSICAL_TRAIT_KEYS.forEach((key) => {
    result[key] = inheritPhysicalTrait(father[key], mother[key], PHYSICAL_TRAIT_RANGE[key], rng);
  });
  return result;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const n = parseInt(clean, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  const c = (v: number) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  const l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  if (d !== 0) {
    switch (max) {
      case r:
        h = ((g - b) / d) % 6;
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
    if (h < 0) h += 1;
  }
  return [h, s, l];
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 1 / 6) [r, g, b] = [c, x, 0];
  else if (h < 2 / 6) [r, g, b] = [x, c, 0];
  else if (h < 3 / 6) [r, g, b] = [0, c, x];
  else if (h < 4 / 6) [r, g, b] = [0, x, c];
  else if (h < 5 / 6) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
}

/** Drifts an RGB color's hue/lightness slightly, drawing two rng samples (hue then lightness). */
function driftRgb(r: number, g: number, b: number, rng: Rng): [number, number, number] {
  const [hRaw, s, lRaw] = rgbToHsl(r, g, b);
  const h = (hRaw + (rng() - 0.5) * 0.05 + 1) % 1;
  const l = clamp(lRaw + (rng() - 0.5) * 0.06, 0, 1);
  return hslToRgb(h, s, l);
}

/** Blends two parent hex colors and drifts hue/lightness slightly, matching roosterGenome.ts's breed(). */
function inheritColorHex(fatherHex: string, motherHex: string, rng: Rng): string {
  const [fr, fg, fb] = hexToRgb(fatherHex);
  const [mr, mg, mb] = hexToRgb(motherHex);
  const w = rng();
  const r = fr * (1 - w) + mr * w;
  const g = fg * (1 - w) + mg * w;
  const b = fb * (1 - w) + mb * w;

  const [dr, dg, db] = driftRgb(r, g, b, rng);
  return rgbToHex(dr, dg, db);
}

/** Blends every one of the 7 material colors plus pattern/patternColor between both parents, with slight drift. */
export function inheritColorScheme(
  father: ChickenColorScheme,
  mother: ChickenColorScheme,
  rng: Rng = Math.random
): ChickenColorScheme {
  const result = {} as ChickenColorScheme;
  for (const key of COLOR_KEYS) {
    result[key] = inheritColorHex(father[key], mother[key], rng);
  }
  result.pattern = rng() < 0.5 ? father.pattern : mother.pattern;
  result.patternColor = inheritColorHex(father.patternColor, mother.patternColor, rng);
  return result;
}

/** Drifts a single hex color's hue/lightness slightly, same drift shape as inheritColorHex without a blend parent. */
function jitterColorHex(hex: string, rng: Rng): string {
  const [r, g, b] = hexToRgb(hex);
  const [dr, dg, db] = driftRgb(r, g, b, rng);
  return rgbToHex(dr, dg, db);
}

/**
 * Applies per-individual jitter to every one of the 7 material colors plus patternColor, for
 * gen-0 chickens drawn from a shared base palette — so two chickens rolling the same palette (or
 * the same breed preset) don't end up with byte-identical material colors.
 */
export function jitterColorScheme(scheme: ChickenColorScheme, rng: Rng = Math.random): ChickenColorScheme {
  const result = { ...scheme };
  for (const key of COLOR_KEYS) {
    result[key] = jitterColorHex(scheme[key], rng);
  }
  result.patternColor = jitterColorHex(scheme.patternColor, rng);
  return result;
}

function hasAllele(genome: MutationGenome, id: string): boolean {
  const state = genome[id];
  return Boolean(state?.carrier || state?.expressed);
}

/**
 * Draws father-pass-roll then mother-pass-roll for every catalog mutation (in
 * catalog order), then — only for a single-copy "random" inheritance gene —
 * an expression roll, then a spontaneous-mutation roll. Tests rely on this
 * exact per-mutation sequence to drive deterministic fake rngs. After all
 * mutations resolve, incompatible pairs that both express are resolved
 * deterministically: an inherited expression beats a spontaneous one; ties
 * fall back to catalog order.
 */
export function inheritMutations(
  fatherGenome: MutationGenome,
  motherGenome: MutationGenome,
  rng: Rng = Math.random
): MutationGenome {
  const result: MutationGenome = {};
  const spontaneousIds = new Set<string>();

  for (const def of MUTATION_POOL) {
    const fromFather = hasAllele(fatherGenome, def.id) && rng() < 0.5;
    const fromMother = hasAllele(motherGenome, def.id) && rng() < 0.5;
    const copies = (fromFather ? 1 : 0) + (fromMother ? 1 : 0);

    let carrier = false;
    let expressed = false;

    if (copies === 2) {
      carrier = true;
      expressed = true;
    } else if (copies === 1) {
      carrier = true;
      if (def.inheritance === "dominant" || def.inheritance === "codominant") {
        expressed = true;
      } else if (def.inheritance === "random") {
        expressed = rng() < 0.5;
      }
    }

    if (!expressed && rng() < def.spontaneousChance) {
      expressed = true;
      carrier = true;
      spontaneousIds.add(def.id);
    }

    if (carrier || expressed) {
      result[def.id] = { carrier, expressed };
    }
  }

  for (const def of MUTATION_POOL) {
    if (!result[def.id]?.expressed) continue;

    for (const otherId of def.incompatibleMutations) {
      if (!result[def.id]?.expressed) break;
      const other = result[otherId];
      if (!other?.expressed) continue;

      const thisIsSpontaneous = spontaneousIds.has(def.id);
      const otherIsSpontaneous = spontaneousIds.has(otherId);

      if (thisIsSpontaneous && !otherIsSpontaneous) {
        result[def.id] = { ...result[def.id], expressed: false };
      } else if (otherIsSpontaneous && !thisIsSpontaneous) {
        result[otherId] = { ...other, expressed: false };
      } else {
        const defIndex = MUTATION_POOL.findIndex((m) => m.id === def.id);
        const otherIndex = MUTATION_POOL.findIndex((m) => m.id === otherId);
        if (defIndex < otherIndex) {
          result[otherId] = { ...other, expressed: false };
        } else {
          result[def.id] = { ...result[def.id], expressed: false };
        }
      }
    }
  }

  return result;
}
