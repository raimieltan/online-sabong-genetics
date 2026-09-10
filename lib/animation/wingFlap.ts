import { clamp01, smootherstep } from "./math";

export interface WingFlapSample {
  /** Shoulder elevation around the rig's primary (local X) flap axis. */
  flap: number;
  /** Shoulder fore/aft sweep. Peaks separately from flap. */
  sweep: number;
  /** Shoulder feather-fan twist. Leads/lags the stroke reversals. */
  twist: number;
  /** Elbow-like fold: 0 is extended, 1 is tightly recovered. */
  fold: number;
  /** Distal feather follow-through target; its spring supplies the whip. */
  tipFollow: number;
  /** Positive while the downstroke is pushing the body upward. */
  downstroke: number;
  /** Small negative settling signal during folded recovery. */
  settle: number;
}

function range(t: number, start: number, end: number): number {
  return clamp01((t - start) / (end - start));
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Samples one deliberately asymmetric rooster wing beat.
 *
 * The five phases contain short catches at both reversals. Shoulder flap,
 * fore/aft sweep and twist are separate curves, so plotting the resulting
 * world-space wing tip produces a loop instead of a straight hinge trace.
 */
export function sampleWingFlapCycle(rawCycle: number): WingFlapSample {
  const cycle = ((rawCycle % 1) + 1) % 1;
  let flap: number;
  let sweep: number;
  let twist: number;
  let fold: number;
  let tipFollow: number;
  let downstroke = 0;
  let settle = 0;

  if (cycle < 0.12) {
    // TOP CATCH: open, high and swept slightly back before committing.
    const u = smootherstep(range(cycle, 0, 0.12));
    flap = lerp(-0.72, -0.78, u);
    sweep = lerp(-0.2, -0.05, u);
    twist = lerp(0.14, 0.22, u);
    fold = lerp(0.2, 0.08, u);
    tipFollow = lerp(0.38, 0.16, u);
  } else if (cycle < 0.38) {
    // POWER DOWNSTROKE: the shoulder crosses a large arc while the fan opens.
    const u = smootherstep(range(cycle, 0.12, 0.38));
    flap = lerp(-0.78, 0.92, u);
    sweep = lerp(-0.05, 0.36, smootherstep(range(cycle, 0.12, 0.33)));
    twist = lerp(0.22, -0.2, smootherstep(range(cycle, 0.17, 0.38)));
    fold = lerp(0.08, 0, smootherstep(range(cycle, 0.12, 0.22)));
    tipFollow = lerp(0.16, -0.14, smootherstep(range(cycle, 0.18, 0.38)));
    downstroke = Math.sin(u * Math.PI);
  } else if (cycle < 0.48) {
    // BOTTOM FOLLOW-THROUGH: shoulder holds while distal feathers overshoot.
    const u = smootherstep(range(cycle, 0.38, 0.48));
    flap = lerp(0.92, 0.86, u);
    sweep = lerp(0.36, 0.23, u);
    twist = lerp(-0.2, -0.3, u);
    fold = lerp(0, 0.2, u);
    tipFollow = lerp(-0.14, -0.38, Math.sin(u * Math.PI));
    downstroke = 1 - u;
  } else if (cycle < 0.88) {
    // FOLDED RECOVERY: elbow closes first, then the shoulder sweeps up/back.
    const u = smootherstep(range(cycle, 0.48, 0.88));
    flap = lerp(0.86, -0.62, u);
    sweep = lerp(0.23, -0.34, smootherstep(range(cycle, 0.5, 0.82)));
    twist = lerp(-0.3, 0.1, smootherstep(range(cycle, 0.56, 0.88)));
    fold = lerp(0.2, 1, smootherstep(range(cycle, 0.48, 0.68)));
    tipFollow = lerp(0.12, 1.08, smootherstep(range(cycle, 0.5, 0.72)));
    settle = Math.sin(u * Math.PI);
  } else {
    // REOPEN / TOP CATCH: fan spreads late and the tip trails the shoulder.
    const u = smootherstep(range(cycle, 0.88, 1));
    flap = lerp(-0.62, -0.72, u);
    sweep = lerp(-0.34, -0.2, u);
    twist = lerp(0.1, 0.14, u);
    fold = lerp(1, 0.2, u);
    tipFollow = lerp(1.08, 0.38, u);
  }

  return { flap, sweep, twist, fold, tipFollow, downstroke, settle };
}
