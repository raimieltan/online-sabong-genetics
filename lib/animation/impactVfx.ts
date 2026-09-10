/**
 * Impact VFX definitions (spec §19 / §20). Data only — the R3F component
 * `components/chicken3d/ImpactVFX.tsx` renders these with pooled Three.js
 * primitives (no particle framework).
 *
 * A burst = a spray of short-lived shards + an optional expanding flash ring,
 * spawned at the visual contact point (a presentation collider / bone world
 * position — never a source of combat truth).
 */

export type ImpactVfxKind =
  | "light_impact"
  | "heavy_impact"
  | "critical_impact"
  | "feathers"
  | "dust"
  | "landing_dust"
  | "knockback_dust";

export interface ImpactVfxDef {
  /** How many shard particles the burst spawns. */
  count: number;
  /** Base shard colour (hex). */
  color: number;
  /** Secondary colour mixed in per-particle for variation. */
  color2: number;
  /** Initial speed range (world units/sec). */
  speedMin: number;
  speedMax: number;
  /** Shard size range (world units). */
  sizeMin: number;
  sizeMax: number;
  /** Seconds each shard lives. */
  life: number;
  /** Downward accel (world units/sec²). Dust floats, impact shards fall. */
  gravity: number;
  /** Cone half-angle (rad) around the impact normal the spray is biased into. 0 = omnidirectional. */
  cone: number;
  /** Expanding flash ring: 0 disables. */
  flashRadius: number;
  flashColor: number;
  flashLife: number;
}

export const IMPACT_VFX: Record<ImpactVfxKind, ImpactVfxDef> = {
  light_impact: {
    count: 8,
    color: 0xffe9b0,
    color2: 0xffb347,
    speedMin: 1.5,
    speedMax: 4,
    sizeMin: 0.03,
    sizeMax: 0.07,
    life: 0.35,
    gravity: 6,
    cone: 1.2,
    flashRadius: 0.35,
    flashColor: 0xfff2cc,
    flashLife: 0.14,
  },
  heavy_impact: {
    count: 16,
    color: 0xffd27a,
    color2: 0xff7a3c,
    speedMin: 2.5,
    speedMax: 6.5,
    sizeMin: 0.04,
    sizeMax: 0.11,
    life: 0.5,
    gravity: 8,
    cone: 1.0,
    flashRadius: 0.6,
    flashColor: 0xffe0a8,
    flashLife: 0.2,
  },
  critical_impact: {
    count: 26,
    // Physical dust and pale plumage rather than a gamey red energy burst.
    color: 0xcdbb95,
    color2: 0x76513b,
    speedMin: 3,
    speedMax: 8.5,
    sizeMin: 0.05,
    sizeMax: 0.14,
    life: 0.62,
    gravity: 8,
    cone: 0.9,
    flashRadius: 0.9,
    flashColor: 0xffb0a0,
    flashLife: 0.28,
  },
  feathers: {
    // Intentionally restrained: heavy wing/body contact, never every hit.
    count: 5,
    color: 0xe0d1b0,
    color2: 0x6c4935,
    speedMin: 1.2,
    speedMax: 3.8,
    sizeMin: 0.04,
    sizeMax: 0.085,
    life: 0.72,
    gravity: 2.8,
    cone: 0.55,
    flashRadius: 0,
    flashColor: 0x000000,
    flashLife: 0,
  },
  dust: {
    count: 10,
    color: 0xbda882,
    color2: 0x8f7d5c,
    speedMin: 0.6,
    speedMax: 2,
    sizeMin: 0.05,
    sizeMax: 0.13,
    life: 0.7,
    gravity: -0.6,
    cone: 0,
    flashRadius: 0,
    flashColor: 0x000000,
    flashLife: 0,
  },
  landing_dust: {
    count: 18,
    color: 0xcdbb95,
    color2: 0x9a8867,
    speedMin: 1,
    speedMax: 3.2,
    sizeMin: 0.06,
    sizeMax: 0.16,
    life: 0.8,
    gravity: -0.4,
    cone: 0.4,
    flashRadius: 0,
    flashColor: 0x000000,
    flashLife: 0,
  },
  knockback_dust: {
    count: 14,
    color: 0xc6b48d,
    color2: 0x94825f,
    speedMin: 1.2,
    speedMax: 4,
    sizeMin: 0.05,
    sizeMax: 0.14,
    life: 0.75,
    gravity: -0.3,
    cone: 0.7,
    flashRadius: 0,
    flashColor: 0x000000,
    flashLife: 0,
  },
};

/** Backend hit severity → which impact burst to spawn. */
export function impactKindFor(opts: {
  isMiss: boolean;
  isCritical: boolean;
  stagger: string;
}): ImpactVfxKind | null {
  if (opts.isMiss) return null;
  if (opts.isCritical) return "critical_impact";
  if (opts.stagger === "heavy" || opts.stagger === "knockdown") return "heavy_impact";
  return "light_impact";
}
