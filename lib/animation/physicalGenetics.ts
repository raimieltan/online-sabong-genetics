/**
 * Raw physical genetics → visual animation gains.
 *
 * These multipliers ONLY shape animation presentation (amplitudes, easing
 * weight, follow-through) — they never touch combat. `lib/physicalProfile.ts`
 * remains the sole combat-facing derivation and is untouched. Gains are
 * centered on 1.0 for an all-1 baseline bird and softly clamped so an extreme
 * genome exaggerates the silhouette without breaking timing (durations and
 * phase fractions are never scaled here, so IMPACT_AT stays aligned).
 */

import { clamp } from "./math";
import type { AnimationGains, PhysicalBlock } from "./types";

const GAIN_MIN = 0.7;
const GAIN_MAX = 1.6;

export function deriveAnimationGains(physical: PhysicalBlock | undefined): AnimationGains {
  const body = physical?.body ?? 1;
  const neck = physical?.neck ?? 1;
  const legs = physical?.legs ?? 1;
  const tail = physical?.tail ?? 1;
  const wings = physical?.wings ?? 1;

  return {
    // Heavier body → more visual inertia: slower ease in/out, bigger follow-through.
    inertia: clamp(0.8 + body * 0.35, GAIN_MIN, GAIN_MAX),
    // Longer neck → more pronounced head/neck travel in pecks, hits, idle.
    headThrow: clamp(0.7 + neck * 0.5, GAIN_MIN, GAIN_MAX),
    // Longer legs → larger kick extension silhouette.
    kickReach: clamp(0.75 + legs * 0.45, GAIN_MIN, GAIN_MAX),
    // Bigger wings → stronger wing strikes and balance flares.
    wingForce: clamp(0.7 + wings * 0.5, GAIN_MIN, GAIN_MAX),
    // Bigger tail → more visible counter-rotation and lag.
    tailCounter: clamp(0.7 + tail * 0.5, GAIN_MIN, GAIN_MAX),
    // Body mass also scales the resting vertical bob.
    bob: clamp(0.85 + body * 0.2, GAIN_MIN, GAIN_MAX),
  };
}
