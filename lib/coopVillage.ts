import type { Chicken, FightingStyle } from "./types";
import { resolvePhysicalProfile } from "./physicalProfile";

/** Matches BattleStage3D's STAGE_SCALE so village chickens read at the same visual size as in battle. */
export const VILLAGE_SCALE = 1.75;

/**
 * How many chickens are rendered in the 3D village at once. The rest of the
 * roster is reached by paging the scene (prev/next). Keeps draw calls and GLB
 * instances bounded no matter how large the roster grows.
 */
export const VILLAGE_CAPACITY = 12;

export type HabitatStyle = "common" | "champion" | "veteran";

/** No dedicated champion flag exists on Chicken — championship-ness is derived from combat record, same as lib/pedigree.ts. */
export function isChampion(chicken: Chicken): boolean {
  return chicken.record.championships > 0;
}

export function habitatStyle(chicken: Chicken): HabitatStyle {
  if (isChampion(chicken)) return "champion";
  if (chicken.growthStage === "senior") return "veteran";
  return "common";
}

/** Deterministic 32-bit string hash — same chicken id always yields the same layout slot and idle-timing offsets. */
export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** A seeded PRNG (mulberry32) so per-chicken randomness (idle timing offsets) is stable across renders. */
export function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface VillageSlot {
  /** Home position (hut location) in world units, ground level. */
  home: [number, number, number];
  /** Center of this chicken's small personal wander area. */
  personalArea: [number, number, number];
  /** Orientation of the resident's pen toward the shared yard. */
  facingY: number;
}

export type VillageZone = "fighter" | "young" | "recovery";

/** Hand-composed, deliberately irregular compound slots. The center stays open as the shared yard. */
const COMPOUND_SLOTS: Record<VillageZone, Array<Omit<VillageSlot, "facingY">>> = {
  fighter: [
    { home: [-5.3, 0, -1.9], personalArea: [-3.8, 0, -1.2] },
    { home: [-5.7, 0, 1.2], personalArea: [-3.8, 0, .8] },
    { home: [-3.6, 0, 3.8], personalArea: [-2.5, 0, 2.3] },
    { home: [.4, 0, 4.4], personalArea: [.25, 0, 2.6] },
    { home: [3.6, 0, 3.7], personalArea: [2.5, 0, 2.2] },
    { home: [5.7, 0, 1.1], personalArea: [3.8, 0, .7] },
    { home: [5.2, 0, -1.7], personalArea: [3.6, 0, -1] },
    { home: [-3.5, 0, -.1], personalArea: [-2.5, 0, .1] },
    { home: [3.3, 0, .1], personalArea: [2.4, 0, .1] },
    { home: [-2.1, 0, 2.2], personalArea: [-1.3, 0, 1.35] },
    { home: [2, 0, 2.35], personalArea: [1.3, 0, 1.45] },
    { home: [.1, 0, 3.9], personalArea: [.1, 0, 2.45] },
  ],
  young: [
    { home: [-2.9, 0, 5], personalArea: [-1.9, 0, 3.4] },
    { home: [-.9, 0, 5.2], personalArea: [-.7, 0, 3.5] },
    { home: [1.25, 0, 5], personalArea: [.9, 0, 3.4] },
  ],
  recovery: [
    { home: [6, 0, -2.8], personalArea: [4.7, 0, -2.4] },
    { home: [6.1, 0, -.7], personalArea: [4.7, 0, -1] },
  ],
};

/**
 * Returns a fixed compound location within a semantic village zone. Slots are
 * deliberately uneven so the coop reads as a working rural stable rather than
 * a radial game board.
 */
export function getVillageSlot(index: number, zone: VillageZone = "fighter"): VillageSlot {
  const slots = COMPOUND_SLOTS[zone];
  const slot = slots[Math.max(0, Math.floor(index)) % slots.length];
  const facingY = Math.atan2(-slot.home[0], -slot.home[2]);
  return { ...slot, facingY };
}

export interface VillagePage<T> {
  /** Clamped page index actually shown (0-based). */
  page: number;
  /** Total number of pages (always >= 1). */
  pageCount: number;
  /** The slice of chickens on this page — at most VILLAGE_CAPACITY. */
  items: T[];
}

/** Slices a roster into a village page, clamping the requested page into range. */
export function paginateVillage<T>(all: T[], requestedPage: number, pageSize = VILLAGE_CAPACITY): VillagePage<T> {
  const pageCount = Math.max(1, Math.ceil(all.length / pageSize));
  const page = Math.min(Math.max(0, Math.floor(requestedPage)), pageCount - 1);
  return { page, pageCount, items: all.slice(page * pageSize, page * pageSize + pageSize) };
}

export interface PersonalityModifiers {
  /** Multiplier on base walk speed. */
  walkSpeed: number;
  /** Fraction of the idle loop spent resting vs. moving/pecking. */
  restBias: number;
  /** Multiplier on how often the chicken decides to head out and wander. */
  wanderFrequency: number;
}

const STYLE_MODIFIERS: Record<FightingStyle, { walk: number; rest: number; wander: number }> = {
  aggressive: { walk: 1.25, rest: 0.6, wander: 1.3 },
  counter: { walk: 0.95, rest: 1.0, wander: 0.9 },
  endurance: { walk: 1.0, rest: 0.8, wander: 1.0 },
  balanced: { walk: 1.0, rest: 1.0, wander: 1.0 },
};

/** Lightweight stat-driven personality — no simulation, just a few multipliers derived from existing chicken data. */
export function personalityModifiers(chicken: Chicken): PersonalityModifiers {
  const style = STYLE_MODIFIERS[chicken.fightingStyle] ?? STYLE_MODIFIERS.balanced;
  const profile = resolvePhysicalProfile({ physical: chicken.physical });
  const energyFrac = chicken.energy / 100;
  const champion = isChampion(chicken);

  return {
    walkSpeed: style.walk * profile.mobility * (0.7 + energyFrac * 0.5),
    restBias: style.rest * (1.3 - energyFrac * 0.6) * (champion ? 0.85 : 1),
    wanderFrequency: style.wander * (0.6 + energyFrac * 0.6),
  };
}
