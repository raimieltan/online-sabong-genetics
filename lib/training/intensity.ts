import type { TrainingIntensity } from "../types";

export type IntensityMultiplier = {
  energy: number;
  fatigue: number;
  evGain: number;
  stress: number;
  injuryChance: number;
  breakthrough: number;
};

/** Per-intensity cost/reward curve (design spec: Intensity) — "moderate" is today's unmodified default. */
export const INTENSITY_MULTIPLIERS: Record<TrainingIntensity, IntensityMultiplier> = {
  light: { energy: .6, fatigue: .5, evGain: .7, stress: .5, injuryChance: .25, breakthrough: .75 },
  normal: { energy: 1, fatigue: 1, evGain: 1, stress: 1, injuryChance: 1, breakthrough: 1 },
  moderate: { energy: 1, fatigue: 1, evGain: 1, stress: 1, injuryChance: 1, breakthrough: 1 },
  hard: { energy: 1.3, fatigue: 1.45, evGain: 1.25, stress: 1.3, injuryChance: 1.5, breakthrough: 1.2 },
  extreme: { energy: 1.6, fatigue: 2, evGain: 1.45, stress: 1.8, injuryChance: 2.75, breakthrough: 1.4 },
};

/** Scales a session's base energy/fatigue/EV numbers by intensity and reports the intensity's flat stress/injury terms. */
export function applyIntensity(
  base: { energy: number; fatigue: number; evGain: number },
  intensity: TrainingIntensity
): { energy: number; fatigue: number; evGain: number; stress: number; injuryChance: number } {
  const m = INTENSITY_MULTIPLIERS[intensity];
  return {
    energy: base.energy * m.energy,
    fatigue: base.fatigue * m.fatigue,
    evGain: base.evGain * m.evGain,
    stress: intensity === "hard" ? 8 : intensity === "extreme" ? 16 : 0,
    injuryChance: intensity === "hard" ? .03 : intensity === "extreme" ? .08 : 0,
  };
}
