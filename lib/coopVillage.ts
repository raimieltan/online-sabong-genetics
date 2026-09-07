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
  /** Facing the hut should be built to face (toward the central roost). */
  facingY: number;
}

const CENTER: [number, number] = [0, 0];
/** Huts per concentric ring, innermost first. Rings beyond the last repeat the last count at a wider radius. */
const RING_SIZES = [8, 12, 16];
const RING_BASE_RADIUS = 4.5;
const RING_SPACING = 3;

/**
 * Fixed, deterministic diorama layout — concentric rings of huts around a
 * central roost, positioned by slot index (not chicken id) so occupied slots
 * stay stable as the roster changes: hatching a new chicken fills the next
 * empty slot rather than reshuffling everyone else's home. Any index resolves
 * to a unique, non-overlapping slot — rings grow outward without bound.
 */
export function getVillageSlot(index: number): VillageSlot {
  let ring = 0;
  let ringIndex = Math.max(0, Math.floor(index));
  while (ring < RING_SIZES.length - 1 && ringIndex >= RING_SIZES[ring]) {
    ringIndex -= RING_SIZES[ring];
    ring++;
  }
  const perRing = RING_SIZES[ring];
  // Slots past the defined rings keep wrapping the outermost ring, each lap pushed
  // further out so they never land on an already-occupied position.
  const lap = ring === RING_SIZES.length - 1 ? Math.floor(ringIndex / perRing) : 0;
  ringIndex %= perRing;
  const angleOffset = (ring % 2 === 1 ? Math.PI / perRing : 0) + lap * (Math.PI / perRing);
  const angle = (ringIndex / perRing) * Math.PI * 2 + angleOffset;
  const radius = RING_BASE_RADIUS + (ring + lap) * RING_SPACING;
  const x = CENTER[0] + Math.cos(angle) * radius;
  const z = CENTER[1] + Math.sin(angle) * radius;
  const facingY = Math.atan2(CENTER[0] - x, CENTER[1] - z);
  // Personal wander area sits slightly toward the center from the hut.
  const personalX = x * 0.72;
  const personalZ = z * 0.72;
  return {
    home: [x, 0, z],
    personalArea: [personalX, 0, personalZ],
    facingY,
  };
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
