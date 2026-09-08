import type { BehavioralProfile, Chicken, CombatExperience, FightingStyle } from "../types";
import { deriveBehaviorProfile } from "./behavior";
import { emptyExperience } from "./experience";
import { battleReadyNpcGenerator, generateMatchedOpponent } from "./matchmaking";

export type PveEncounterId =
  | "aggressive_specialist"
  | "counter_specialist"
  | "endurance_specialist"
  | "defensive_wall"
  | "speed_specialist"
  | "veteran_champion"
  | "genetic_freak"
  | "balanced_elite";

export type PveEncounterDefinition = {
  id: PveEncounterId;
  name: string;
  description: string;
  fightingStyle: FightingStyle;
  behaviorOverrides?: Partial<BehavioralProfile>;
  experienceBaseline?: Partial<CombatExperience>;
  condition?: number;
  weight: number;
};

/**
 * PvE opponents differ through stats/behavior/experience/condition (spec
 * §47-48), never arbitrary damage multipliers — every archetype here still
 * runs through the exact same lib/combat/simulator.ts as PvP (spec §46).
 */
export const PVE_ENCOUNTERS: Record<PveEncounterId, PveEncounterDefinition> = {
  aggressive_specialist: {
    id: "aggressive_specialist",
    name: "Aggressive Specialist",
    description: "Comes out swinging heavy attacks from turn one. Fades hard once fatigued.",
    fightingStyle: "aggressive",
    experienceBaseline: { offensive: 220, pressure: 120 },
    weight: 3,
  },
  counter_specialist: {
    id: "counter_specialist",
    name: "Counter Specialist",
    description: "Patient and reactive — punishes committed heavy attacks and repeated patterns.",
    fightingStyle: "counter",
    behaviorOverrides: { counterPreference: 0.95, patience: 0.9 },
    experienceBaseline: { counter: 240, defensive: 100 },
    weight: 3,
  },
  endurance_specialist: {
    id: "endurance_specialist",
    name: "Endurance Specialist",
    description: "Built to outlast you. Grows more dangerous the longer the fight runs.",
    fightingStyle: "endurance",
    behaviorOverrides: { persistence: 0.9, recoveryPreference: 0.85 },
    experienceBaseline: { recovery: 200, defensive: 120 },
    weight: 3,
  },
  defensive_wall: {
    id: "defensive_wall",
    name: "Defensive Wall",
    description: "Extremely cautious and hard to stagger. Rarely opens itself up.",
    fightingStyle: "endurance",
    behaviorOverrides: { caution: 0.9, aggression: 0.15, riskTolerance: 0.15 },
    experienceBaseline: { defensive: 250 },
    weight: 2,
  },
  speed_specialist: {
    id: "speed_specialist",
    name: "Speed Specialist",
    description: "Slippery and evasive, but lacks finishing power and fades once cornered.",
    fightingStyle: "balanced",
    behaviorOverrides: { caution: 0.7, riskTolerance: 0.35, patience: 0.65 },
    experienceBaseline: { evasion: 230, adaptation: 80 },
    weight: 2,
  },
  veteran_champion: {
    id: "veteran_champion",
    name: "Veteran Champion",
    description: "Battle-tested across every category — reads opponents well and rarely panics.",
    fightingStyle: "balanced",
    behaviorOverrides: { patience: 0.75, persistence: 0.7 },
    experienceBaseline: { offensive: 160, defensive: 160, evasion: 140, counter: 160, pressure: 140, recovery: 140, adaptation: 200 },
    condition: 90,
    weight: 1,
  },
  genetic_freak: {
    id: "genetic_freak",
    name: "Genetic Freak",
    description: "Raw natural ability with almost no battle history to draw on.",
    fightingStyle: "balanced",
    experienceBaseline: {},
    weight: 1,
  },
  balanced_elite: {
    id: "balanced_elite",
    name: "Balanced Elite",
    description: "No glaring weakness — solid fundamentals across the board.",
    fightingStyle: "balanced",
    experienceBaseline: { offensive: 100, defensive: 100, evasion: 100, counter: 100, pressure: 100, recovery: 100, adaptation: 100 },
    weight: 3,
  },
};

const PVE_ENCOUNTER_LIST = Object.values(PVE_ENCOUNTERS);

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}

function clampProfile(profile: BehavioralProfile): BehavioralProfile {
  return {
    aggression: clamp01(profile.aggression),
    caution: clamp01(profile.caution),
    patience: clamp01(profile.patience),
    riskTolerance: clamp01(profile.riskTolerance),
    pressurePreference: clamp01(profile.pressurePreference),
    counterPreference: clamp01(profile.counterPreference),
    recoveryPreference: clamp01(profile.recoveryPreference),
    persistence: clamp01(profile.persistence),
  };
}

export function pickPveEncounter(rng: () => number = Math.random): PveEncounterDefinition {
  const totalWeight = PVE_ENCOUNTER_LIST.reduce((sum, e) => sum + e.weight, 0);
  let roll = rng() * totalWeight;
  for (const encounter of PVE_ENCOUNTER_LIST) {
    roll -= encounter.weight;
    if (roll <= 0) return encounter;
  }
  return PVE_ENCOUNTER_LIST[PVE_ENCOUNTER_LIST.length - 1];
}

/**
 * Generates a stat-matched PvE opponent (spec §47), then layers on a named
 * encounter archetype's behavior/experience/condition profile — the same
 * genome-derived stats a matched opponent would already have, just fighting
 * and reading the match differently.
 */
export function generatePveOpponent(
  playerChicken: Chicken,
  encounterId?: PveEncounterId,
  rng: () => number = Math.random
): { opponent: Chicken; encounter: PveEncounterDefinition } {
  const encounter = encounterId ? PVE_ENCOUNTERS[encounterId] : pickPveEncounter(rng);
  const base = generateMatchedOpponent(playerChicken, battleReadyNpcGenerator);

  const behavior = clampProfile({
    ...deriveBehaviorProfile(encounter.fightingStyle, base.traits),
    ...encounter.behaviorOverrides,
  });
  const experience: CombatExperience = { ...emptyExperience(), ...encounter.experienceBaseline };

  return {
    opponent: {
      ...base,
      fightingStyle: encounter.fightingStyle,
      behavior,
      experience,
      condition: encounter.condition ?? base.condition ?? 100,
    },
    encounter,
  };
}
