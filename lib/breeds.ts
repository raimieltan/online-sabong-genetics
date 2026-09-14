import type { ChickenColorScheme, PhysicalTraitKey } from "./types";

/**
 * Named breed archetypes, ported from rooster_viewer.html's BREEDS presets
 * and generalized onto the 18-key trait range. Cosmetic/generation flavor
 * only — combat never reads `breed`, only the underlying trait/color values
 * it biased.
 */
export type BreedId = "texas" | "sweater" | "asil" | "kelso" | "hatch";

export const BREED_IDS: readonly BreedId[] = ["texas", "sweater", "asil", "kelso", "hatch"];

export type BreedPreset = {
  label: string;
  traits: Partial<Record<PhysicalTraitKey, number>>;
  colors: Partial<ChickenColorScheme>;
};

export const BREED_PRESETS: Record<BreedId, BreedPreset> = {
  texas: {
    label: "Texas",
    traits: { bodyGirth: 1.25, chest: 1.3, legThick: 1.3, combSize: 0.55, tailLength: 0.85, scale: 1.15 },
    colors: { body: "#f2ead8", hackle: "#f7f2e4", wings: "#e6dcc4", tail: "#efe7d3" },
  },
  sweater: {
    label: "Sweater",
    traits: { neckLength: 1.25, wingSpan: 1.2, legLength: 1.25, tailLength: 1.25, bodyGirth: 0.9 },
    colors: { body: "#7d2a12", hackle: "#e0891d", tail: "#101c18", wings: "#5a1c0c" },
  },
  asil: {
    label: "Asil",
    traits: {
      bodyGirth: 1.3,
      neckThick: 1.5,
      combSize: 0.25,
      wattleSize: 0.3,
      tailLength: 0.6,
      legThick: 1.45,
      headSize: 1.2,
    },
    colors: { body: "#3d2016", hackle: "#8a4a20", tail: "#150f0c" },
  },
  kelso: {
    label: "Kelso",
    traits: { legLength: 1.2, wingSpan: 1.25, tailArc: 1.35, tailSpread: 1.25, bodyLength: 1.1 },
    colors: { body: "#5b2a3a", hackle: "#d4a02c", tail: "#0a1420" },
  },
  hatch: {
    label: "Hatch",
    traits: { chest: 1.35, bodyGirth: 1.15, beakLength: 1.25, combSize: 0.7, legThick: 1.25 },
    colors: { body: "#7a2f10", hackle: "#b8480e", shanks: "#c9b24f" },
  },
};

/** Weighted roll: ~60% one of the 5 purebreds (uniform among them), ~40% "mixed" (undefined, fully random). */
export function pickRandomBreed(rng: () => number = Math.random): BreedId | undefined {
  if (rng() >= 0.6) return undefined;
  return BREED_IDS[Math.floor(rng() * BREED_IDS.length)];
}
