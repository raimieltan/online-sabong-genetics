/**
 * Pure math helpers for the procedural animation system — easing curves,
 * interpolation, oscillators and a critically-tunable spring integrator.
 * No three.js, no DOM: cheap to call every frame and trivial to reason about.
 */

export const TAU = Math.PI * 2;

export function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

export function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate between two angles the short way around the circle. */
export function lerpAngle(a: number, b: number, t: number): number {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

export function easeIn(t: number): number {
  return t * t;
}

export function easeOut(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Overshoot-then-settle ease — good for recoil snaps. */
export function easeOutBack(t: number, overshoot = 1.70158): number {
  const c1 = overshoot;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

/** Hermite smoothstep — 0 at 0, 1 at 1, zero slope at both ends. */
export function smoothstep(t: number): number {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
}

/** Ken Perlin's smootherstep — zero 1st and 2nd derivative at the ends. */
export function smootherstep(t: number): number {
  const x = clamp01(t);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

/** Symmetric 0 → 1 → 0 bump over t in [0,1] (half-sine). */
export function bell(t: number): number {
  return Math.sin(clamp01(t) * Math.PI);
}

/** Sine oscillator in [-1,1]. `freq` in cycles per unit t, `phase` in radians. */
export function oscillate(t: number, freq: number, phase = 0): number {
  return Math.sin(t * TAU * freq + phase);
}

/**
 * Frame-rate-independent exponential approach of `current` toward `target`.
 * `lambda` is the decay rate (larger = snappier). Stable for any dt.
 */
export function damp(current: number, target: number, lambda: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

/** Remap `v` from [inMin,inMax] to [outMin,outMax] without clamping. */
export function remap(v: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return outMin + ((v - inMin) * (outMax - outMin)) / (inMax - inMin);
}

/**
 * Semi-implicit Euler spring. Drives `value` toward a target with organic
 * overshoot/settle. `addImpulse` kicks the velocity directly (impact recoil).
 * Callers MUST clamp dt (<= 1/30) so a frame hitch can't blow up the integrator.
 */
export class Spring {
  value: number;
  velocity = 0;

  private stiffness: number;
  private damping: number;
  private mass: number;

  constructor(stiffness: number, damping: number, mass = 1, initial = 0) {
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
    this.value = initial;
  }

  addImpulse(v: number): void {
    this.velocity += v;
  }

  reset(value = 0): void {
    this.value = value;
    this.velocity = 0;
  }

  step(target: number, dt: number): number {
    const force = -this.stiffness * (this.value - target) - this.damping * this.velocity;
    this.velocity += (force / this.mass) * dt;
    this.value += this.velocity * dt;
    return this.value;
  }
}
