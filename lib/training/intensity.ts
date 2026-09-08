import type { TrainingIntensity } from "../types";

export type IntensityMultiplier = {
  energy: number;
  fatigue: number;
  evGain: number;
  stress: number;
  injuryChance: number;
};

/** Per-intensity cost/reward curve (design spec: Intensity) — "moderate" is today's unmodified default. */
export const INTENSITY_MULTIPLIERS: Record<TrainingIntensity, IntensityMultiplier> = {
  light: { energy: 0.6, fatigue: 0.6, evGain: 0.6, stress: 0, injuryChance: 0 },
  moderate: { energy: 1.0, fatigue: 1.0, evGain: 1.0, stress: 0, injuryChance: 0 },
  hard: { energy: 1.4, fatigue: 1.6, evGain: 1.4, stress: 8, injuryChance: 0.03 },
  extreme: { energy: 1.8, fatigue: 2.2, evGain: 1.8, stress: 16, injuryChance: 0.08 },
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
    stress: m.stress,
    injuryChance: m.injuryChance,
  };
}
