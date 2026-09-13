import type { StatBlock } from "../types";
import { PVE_BOSS_ORDER, type PveBossDefinition, type PveBossId } from "./types";
import { campaignPresentation } from "./campaign";
import { getSideEncounter } from "./sideEncounters";

/**
 * Fixed PvE boss ladder (Phase 1). Bosses are data-driven and never scale to
 * the player (§24) — each is a hand-authored fighter that tests a different
 * aspect of the player's rooster. Every boss still fights through the exact
 * same lib/combat/simulator.ts as PvP (§33-34); the differences here are only
 * stats, behavior, experience and condition.
 */

function stats(
  power: number,
  speed: number,
  stamina: number,
  defense: number,
  accuracy: number,
  agility: number,
): StatBlock {
  return { power, speed, stamina, defense, accuracy, agility };
}

export const PVE_BOSSES: Record<PveBossId, PveBossDefinition> = {
  rookie: {
    id: "rookie",
    order: 1,
    name: "The Rookie",
    difficulty: 1,
    styleLabel: "Brawler (untrained)",
    behaviorLabel: "Aggressive",
    description:
      "A green fighter with more spirit than skill. Comes forward constantly but tires fast and leaves openings everywhere.",
    fightingStyle: "aggressive",
    iv: stats(46, 44, 45, 43, 45, 42),
    ev: stats(0, 0, 0, 0, 0, 0),
    behaviorOverrides: {
      aggression: 0.8,
      caution: 0.2,
      patience: 0.2,
      riskTolerance: 0.65,
    },
    experienceBaseline: {
      offensive: 40,
    },
    condition: 82,
    preview: {
      strength: 3,
      speed: 3,
      endurance: 2,
    },
    recommendation: "Any reasonably trained rooster.",
    rewards: {
      firstClearCredits: 150,
      repeatCredits: 40,
      experienceMultiplier: 1,
    },
  },

  scrapper: {
    id: "scrapper",
    order: 2,
    name: "The Scrapper",
    difficulty: 1,
    styleLabel: "Dirty Brawler",
    behaviorLabel: "Relentless",
    description:
      "A rough fighter that attacks without much technique. It keeps coming forward and relies on constant pressure to overwhelm inexperienced opponents.",
    fightingStyle: "aggressive",
    iv: stats(52, 48, 50, 46, 43, 45),
    ev: stats(5, 5, 5, 0, 0, 0),
    behaviorOverrides: {
      aggression: 0.9,
      caution: 0.1,
      patience: 0.15,
      riskTolerance: 0.8,
      persistence: 0.9,
    },
    experienceBaseline: {
      offensive: 55,
      pressure: 40,
    },
    condition: 85,
    preview: {
      strength: 4,
      speed: 3,
      endurance: 3,
    },
    recommendation:
      "A developing fighter that can handle sustained pressure.",
    rewards: {
      firstClearCredits: 200,
      repeatCredits: 50,
      experienceMultiplier: 1.05,
    },
  },

  brawler: {
    id: "brawler",
    order: 3,
    name: "The Brawler",
    difficulty: 2,
    styleLabel: "Power Fighter",
    behaviorLabel: "Aggressive",
    description:
      "A physically overwhelming opponent. Hits hard and soaks punishment, but slow hands and slow feet — speed and evasion beat him.",
    fightingStyle: "aggressive",
    iv: stats(90, 44, 72, 86, 54, 40),
    ev: stats(60, 0, 45, 50, 0, 0),
    behaviorOverrides: {
      aggression: 0.85,
      caution: 0.2,
      riskTolerance: 0.7,
      persistence: 0.75,
    },
    experienceBaseline: {
      offensive: 160,
      pressure: 110,
    },
    preview: {
      strength: 9,
      speed: 3,
      endurance: 7,
    },
    recommendation:
      "A developed fighter with real speed or evasion.",
    rewards: {
      firstClearCredits: 300,
      repeatCredits: 75,
      experienceMultiplier: 1.25,
    },
  },

  charger: {
    id: "charger",
    order: 4,
    name: "The Charger",
    difficulty: 2,
    styleLabel: "Pressure Fighter",
    behaviorLabel: "Hyper-Aggressive",
    description:
      "A relentless attacker that tries to overwhelm opponents before they can establish their rhythm.",
    fightingStyle: "aggressive",
    iv: stats(68, 64, 58, 54, 58, 50),
    ev: stats(20, 15, 20, 10, 10, 5),
    behaviorOverrides: {
      aggression: 0.95,
      caution: 0.1,
      patience: 0.1,
      riskTolerance: 0.9,
      pressurePreference: 0.95,
      recoveryPreference: 0.1,
      persistence: 0.9,
    },
    experienceBaseline: {
      offensive: 90,
      pressure: 130,
    },
    condition: 90,
    preview: {
      strength: 6,
      speed: 6,
      endurance: 5,
    },
    recommendation:
      "A fighter capable of surviving and punishing an aggressive opening.",
    rewards: {
      firstClearCredits: 350,
      repeatCredits: 85,
      experienceMultiplier: 1.3,
    },
  },

  wall: {
    id: "wall",
    order: 5,
    name: "The Wall",
    difficulty: 2,
    styleLabel: "Defensive Tank",
    behaviorLabel: "Patient",
    description:
      "A defensive specialist that absorbs punishment, waits for mistakes and slowly drains opponents through attrition.",
    fightingStyle: "endurance",
    iv: stats(55, 42, 82, 92, 48, 40),
    ev: stats(10, 0, 50, 65, 0, 0),
    behaviorOverrides: {
      aggression: 0.2,
      caution: 0.85,
      patience: 0.9,
      riskTolerance: 0.2,
      counterPreference: 0.7,
      recoveryPreference: 0.8,
      persistence: 0.85,
    },
    experienceBaseline: {
      defensive: 150,
      recovery: 110,
      counter: 80,
    },
    condition: 95,
    preview: {
      strength: 5,
      speed: 3,
      endurance: 9,
    },
    recommendation:
      "A patient fighter with enough stamina to win a long battle.",
    rewards: {
      firstClearCredits: 400,
      repeatCredits: 100,
      experienceMultiplier: 1.4,
    },
  },

  striker: {
    id: "striker",
    order: 6,
    name: "The Striker",
    difficulty: 3,
    styleLabel: "Speed Counter-Fighter",
    behaviorLabel: "Counter-Attacker",
    description:
      "Fast, precise and patient. Waits for you to commit, then punishes. Predictable aggression gets you countered all night.",
    fightingStyle: "counter",
    iv: stats(60, 92, 66, 60, 88, 85),
    ev: stats(0, 55, 0, 0, 50, 45),
    behaviorOverrides: {
      counterPreference: 0.95,
      patience: 0.9,
      caution: 0.6,
      aggression: 0.35,
    },
    experienceBaseline: {
      counter: 220,
      evasion: 140,
      defensive: 90,
    },
    preview: {
      strength: 5,
      speed: 9,
      endurance: 5,
    },
    recommendation:
      "A well-trained fighter with endurance and controlled aggression.",
    rewards: {
      firstClearCredits: 500,
      repeatCredits: 125,
      experienceMultiplier: 1.5,
    },
  },

  grinder: {
    id: "grinder",
    order: 7,
    name: "The Grinder",
    difficulty: 3,
    styleLabel: "Endurance Fighter",
    behaviorLabel: "Relentless",
    description:
      "A marathon fighter that becomes increasingly dangerous as the battle drags on. It wins through stamina, recovery and constant pressure.",
    fightingStyle: "endurance",
    iv: stats(62, 54, 94, 68, 54, 48),
    ev: stats(10, 10, 70, 25, 5, 5),
    behaviorOverrides: {
      aggression: 0.5,
      caution: 0.45,
      patience: 0.8,
      persistence: 0.95,
      recoveryPreference: 0.8,
      riskTolerance: 0.3,
    },
    experienceBaseline: {
      recovery: 180,
      defensive: 130,
      pressure: 120,
    },
    condition: 100,
    preview: {
      strength: 6,
      speed: 4,
      endurance: 10,
    },
    recommendation:
      "A fighter with enough stamina to avoid being worn down.",
    rewards: {
      firstClearCredits: 500,
      repeatCredits: 125,
      experienceMultiplier: 1.55,
    },
  },

  "feint-master": {
    id: "feint-master",
    order: 8,
    name: "The Feint Master",
    difficulty: 3,
    styleLabel: "Tactical Fighter",
    behaviorLabel: "Unpredictable",
    description:
      "A deceptive fighter that uses hesitation, feints and changing rhythms to bait predictable reactions.",
    fightingStyle: "counter",
    iv: stats(58, 78, 60, 55, 94, 90),
    ev: stats(0, 40, 0, 0, 60, 55),
    behaviorOverrides: {
      aggression: 0.3,
      caution: 0.7,
      patience: 0.95,
      riskTolerance: 0.4,
      counterPreference: 0.85,
      pressurePreference: 0.25,
      persistence: 0.65,
    },
    experienceBaseline: {
      adaptation: 180,
      counter: 190,
      evasion: 180,
    },
    condition: 94,
    preview: {
      strength: 5,
      speed: 8,
      endurance: 5,
    },
    recommendation:
      "A fighter that does not rely on predictable attack patterns.",
    rewards: {
      firstClearCredits: 550,
      repeatCredits: 140,
      experienceMultiplier: 1.65,
    },
  },

  "pressure-king": {
    id: "pressure-king",
    order: 9,
    name: "The Pressure King",
    difficulty: 3,
    styleLabel: "Pressure Specialist",
    behaviorLabel: "Controlled Aggression",
    description:
      "A highly trained pressure fighter that constantly attempts to deny breathing room without recklessly exhausting itself.",
    fightingStyle: "aggressive",
    iv: stats(75, 72, 76, 70, 72, 65),
    ev: stats(35, 30, 35, 30, 25, 20),
    behaviorOverrides: {
      aggression: 0.75,
      caution: 0.45,
      patience: 0.65,
      riskTolerance: 0.65,
      pressurePreference: 0.95,
      recoveryPreference: 0.55,
      persistence: 0.9,
    },
    experienceBaseline: {
      pressure: 220,
      offensive: 150,
      adaptation: 120,
    },
    condition: 95,
    preview: {
      strength: 7,
      speed: 7,
      endurance: 7,
    },
    recommendation:
      "A balanced fighter capable of escaping pressure and controlling distance.",
    rewards: {
      firstClearCredits: 650,
      repeatCredits: 160,
      experienceMultiplier: 1.75,
    },
  },

  veteran: {
    id: "veteran",
    order: 10,
    name: "The Veteran",
    difficulty: 4,
    styleLabel: "Adaptive Fighter",
    behaviorLabel: "Adaptive",
    description:
      "A seasoned campaigner with no glaring weakness. Reads the fight and shifts tactics — pressures a passive opponent, defends against a reckless one. A rooster built for only one plan will lose.",
    fightingStyle: "balanced",
    iv: stats(80, 80, 82, 80, 80, 78),
    ev: stats(40, 40, 45, 40, 40, 40),
    behaviorOverrides: {
      patience: 0.75,
      persistence: 0.7,
      caution: 0.5,
      counterPreference: 0.55,
    },
    experienceBaseline: {
      offensive: 150,
      defensive: 150,
      evasion: 130,
      counter: 150,
      pressure: 130,
      recovery: 130,
      adaptation: 230,
    },
    condition: 90,
    preview: {
      strength: 8,
      speed: 8,
      endurance: 8,
    },
    recommendation:
      "An advanced, well-rounded fighter.",
    rewards: {
      firstClearCredits: 800,
      repeatCredits: 200,
      experienceMultiplier: 1.9,
    },
  },

  "iron-rooster": {
    id: "iron-rooster",
    order: 11,
    name: "The Iron Rooster",
    difficulty: 4,
    styleLabel: "Defensive Specialist",
    behaviorLabel: "Unbreakable",
    description:
      "A defensive monster built to survive punishment. It refuses to panic, recovers efficiently and turns failed attacks into opportunities.",
    fightingStyle: "endurance",
    iv: stats(72, 62, 88, 96, 65, 58),
    ev: stats(30, 20, 65, 80, 20, 15),
    behaviorOverrides: {
      aggression: 0.3,
      caution: 0.85,
      patience: 0.9,
      riskTolerance: 0.25,
      recoveryPreference: 0.9,
      persistence: 0.9,
      counterPreference: 0.65,
    },
    experienceBaseline: {
      defensive: 250,
      recovery: 220,
      counter: 150,
    },
    condition: 100,
    preview: {
      strength: 7,
      speed: 5,
      endurance: 10,
    },
    recommendation:
      "A fighter with strong damage output and enough stamina to break a defensive opponent.",
    rewards: {
      firstClearCredits: 850,
      repeatCredits: 210,
      experienceMultiplier: 2.0,
    },
  },

  phantom: {
    id: "phantom",
    order: 12,
    name: "The Phantom",
    difficulty: 4,
    styleLabel: "Evasion Specialist",
    behaviorLabel: "Elusive",
    description:
      "An elusive fighter that relies on movement, timing and evasive reactions. Chasing it recklessly creates opportunities for counters.",
    fightingStyle: "counter",
    iv: stats(65, 96, 62, 52, 90, 98),
    ev: stats(0, 75, 0, 0, 70, 80),
    behaviorOverrides: {
      aggression: 0.2,
      caution: 0.9,
      patience: 0.95,
      riskTolerance: 0.2,
      counterPreference: 0.9,
      recoveryPreference: 0.7,
      persistence: 0.65,
    },
    experienceBaseline: {
      evasion: 300,
      counter: 240,
      adaptation: 180,
    },
    condition: 92,
    preview: {
      strength: 5,
      speed: 10,
      endurance: 5,
    },
    recommendation:
      "A disciplined fighter that can punish reckless attacks.",
    rewards: {
      firstClearCredits: 950,
      repeatCredits: 240,
      experienceMultiplier: 2.15,
    },
  },

  executioner: {
    id: "executioner",
    order: 13,
    name: "The Executioner",
    difficulty: 4,
    styleLabel: "Finisher",
    behaviorLabel: "Predatory",
    description:
      "A dangerous finisher that becomes increasingly aggressive when an opponent is weakened. It specializes in converting small openings into decisive attacks.",
    fightingStyle: "aggressive",
    iv: stats(94, 82, 72, 68, 92, 75),
    ev: stats(65, 45, 30, 25, 60, 35),
    behaviorOverrides: {
      aggression: 0.75,
      caution: 0.25,
      patience: 0.5,
      riskTolerance: 0.8,
      pressurePreference: 0.85,
      counterPreference: 0.55,
      persistence: 0.95,
    },
    experienceBaseline: {
      offensive: 280,
      pressure: 240,
      counter: 130,
    },
    condition: 96,
    preview: {
      strength: 10,
      speed: 8,
      endurance: 6,
    },
    recommendation:
      "A fighter capable of maintaining composure while under finishing pressure.",
    rewards: {
      firstClearCredits: 1100,
      repeatCredits: 275,
      experienceMultiplier: 2.3,
    },
  },

  champion: {
    id: "champion",
    order: 14,
    name: "The Champion",
    difficulty: 5,
    styleLabel: "Complete Fighter",
    behaviorLabel: "Elite Adaptive",
    description:
      "The initial end of the road. Elite development, deep combat experience and ruthless adaptation — manages stamina, exploits openings, and gets more aggressive the moment you weaken.",
    fightingStyle: "balanced",
    iv: stats(95, 90, 92, 90, 95, 88),
    ev: stats(75, 70, 75, 70, 75, 70),
    behaviorOverrides: {
      patience: 0.7,
      persistence: 0.8,
      caution: 0.45,
      riskTolerance: 0.6,
      counterPreference: 0.6,
      pressurePreference: 0.7,
    },
    experienceBaseline: {
      offensive: 240,
      defensive: 220,
      evasion: 200,
      counter: 240,
      pressure: 220,
      recovery: 200,
      adaptation: 290,
    },
    condition: 95,
    preview: {
      strength: 10,
      speed: 9,
      endurance: 10,
    },
    recommendation:
      "An elite fighter, fully developed across the board.",
    rewards: {
      firstClearCredits: 1500,
      repeatCredits: 350,
      experienceMultiplier: 2.5,
    },
  },

  challenger: {
    id: "challenger",
    order: 15,
    name: "The Challenger",
    difficulty: 5,
    styleLabel: "Aggressive Elite",
    behaviorLabel: "Fearless",
    description:
      "A young elite fighter that fights like it has nothing to lose. Extremely aggressive and dangerous from the opening exchange.",
    fightingStyle: "aggressive",
    iv: stats(96, 94, 82, 78, 88, 82),
    ev: stats(70, 65, 50, 45, 60, 45),
    behaviorOverrides: {
      aggression: 0.95,
      caution: 0.15,
      patience: 0.35,
      riskTolerance: 0.9,
      pressurePreference: 0.9,
      counterPreference: 0.4,
      persistence: 0.95,
    },
    experienceBaseline: {
      offensive: 300,
      pressure: 280,
      counter: 120,
    },
    condition: 98,
    preview: {
      strength: 10,
      speed: 10,
      endurance: 8,
    },
    recommendation:
      "An elite fighter that can survive an intense opening assault.",
    rewards: {
      firstClearCredits: 1800,
      repeatCredits: 450,
      experienceMultiplier: 2.7,
    },
  },

  tactician: {
    id: "tactician",
    order: 16,
    name: "The Tactician",
    difficulty: 5,
    styleLabel: "Strategic Fighter",
    behaviorLabel: "Calculated",
    description:
      "A cerebral fighter that rarely commits without a reason. It watches patterns, manages distance and waits for predictable behavior.",
    fightingStyle: "balanced",
    iv: stats(78, 88, 80, 76, 98, 94),
    ev: stats(40, 60, 35, 35, 80, 70),
    behaviorOverrides: {
      aggression: 0.35,
      caution: 0.85,
      patience: 0.98,
      riskTolerance: 0.3,
      counterPreference: 0.9,
      pressurePreference: 0.4,
      recoveryPreference: 0.8,
      persistence: 0.8,
    },
    experienceBaseline: {
      adaptation: 380,
      counter: 320,
      evasion: 260,
      defensive: 220,
    },
    condition: 100,
    preview: {
      strength: 7,
      speed: 9,
      endurance: 8,
    },
    recommendation:
      "An unpredictable fighter with strong tactical decision-making.",
    rewards: {
      firstClearCredits: 2000,
      repeatCredits: 500,
      experienceMultiplier: 2.9,
    },
  },

  berserker: {
    id: "berserker",
    order: 17,
    name: "The Berserker",
    difficulty: 5,
    styleLabel: "Power Aggressor",
    behaviorLabel: "Uncontrolled",
    description:
      "A terrifying power fighter that willingly takes damage to deliver devastating attacks.",
    fightingStyle: "aggressive",
    iv: stats(100, 72, 76, 82, 72, 60),
    ev: stats(85, 30, 40, 55, 20, 10),
    behaviorOverrides: {
      aggression: 1.0,
      caution: 0.05,
      patience: 0.05,
      riskTolerance: 1.0,
      pressurePreference: 1.0,
      counterPreference: 0.25,
      recoveryPreference: 0.05,
      persistence: 1.0,
    },
    experienceBaseline: {
      offensive: 400,
      pressure: 350,
    },
    condition: 100,
    preview: {
      strength: 10,
      speed: 7,
      endurance: 7,
    },
    recommendation:
      "A highly durable fighter capable of surviving devastating exchanges.",
    rewards: {
      firstClearCredits: 2200,
      repeatCredits: 550,
      experienceMultiplier: 3.0,
    },
  },

  "counter-master": {
    id: "counter-master",
    order: 18,
    name: "The Counter Master",
    difficulty: 5,
    styleLabel: "Master Counter-Fighter",
    behaviorLabel: "Reactive",
    description:
      "A master of defensive timing. It rarely initiates and becomes more dangerous when opponents become predictable.",
    fightingStyle: "counter",
    iv: stats(82, 98, 78, 72, 100, 100),
    ev: stats(35, 80, 25, 20, 90, 90),
    behaviorOverrides: {
      aggression: 0.15,
      caution: 0.98,
      patience: 1.0,
      riskTolerance: 0.15,
      counterPreference: 1.0,
      pressurePreference: 0.1,
      recoveryPreference: 0.85,
      persistence: 0.7,
    },
    experienceBaseline: {
      counter: 500,
      evasion: 400,
      defensive: 300,
      adaptation: 350,
    },
    condition: 100,
    preview: {
      strength: 8,
      speed: 10,
      endurance: 8,
    },
    recommendation:
      "An extremely patient fighter that can punish predictable aggression.",
    rewards: {
      firstClearCredits: 2500,
      repeatCredits: 625,
      experienceMultiplier: 3.2,
    },
  },

  warlord: {
    id: "warlord",
    order: 19,
    name: "The Warlord",
    difficulty: 5,
    styleLabel: "Elite Complete Fighter",
    behaviorLabel: "Ruthless Adaptive",
    description:
      "A battle-hardened elite that combines power, pressure, defense and counters without committing to a single strategy.",
    fightingStyle: "balanced",
    iv: stats(98, 96, 96, 94, 96, 92),
    ev: stats(85, 80, 85, 80, 85, 75),
    behaviorOverrides: {
      aggression: 0.7,
      caution: 0.6,
      patience: 0.85,
      riskTolerance: 0.6,
      counterPreference: 0.75,
      pressurePreference: 0.8,
      recoveryPreference: 0.7,
      persistence: 0.95,
    },
    experienceBaseline: {
      offensive: 400,
      defensive: 380,
      evasion: 350,
      counter: 400,
      pressure: 380,
      recovery: 330,
      adaptation: 450,
    },
    condition: 100,
    preview: {
      strength: 10,
      speed: 10,
      endurance: 10,
    },
    recommendation:
      "A complete elite fighter with no obvious weakness.",
    rewards: {
      firstClearCredits: 3000,
      repeatCredits: 750,
      experienceMultiplier: 3.5,
    },
  },

  apex: {
    id: "apex",
    order: 20,
    name: "The Apex",
    difficulty: 5,
    styleLabel: "Perfected Fighter",
    behaviorLabel: "Master Adaptive",
    description:
      "The ultimate PvE opponent. A perfected fighter with elite genetics, immense experience and the ability to adapt to almost any strategy.",
    fightingStyle: "balanced",
    iv: stats(100, 100, 100, 100, 100, 100),
    ev: stats(100, 100, 100, 100, 100, 100),
    behaviorOverrides: {
      aggression: 0.65,
      caution: 0.7,
      patience: 0.95,
      riskTolerance: 0.55,
      counterPreference: 0.85,
      pressurePreference: 0.8,
      recoveryPreference: 0.8,
      persistence: 1.0,
    },
    experienceBaseline: {
      offensive: 500,
      defensive: 500,
      evasion: 500,
      counter: 500,
      pressure: 500,
      recovery: 450,
      adaptation: 600,
    },
    condition: 100,
    preview: {
      strength: 10,
      speed: 10,
      endurance: 10,
    },
    recommendation:
      "An endgame fighter capable of answering almost any strategy.",
    rewards: {
      firstClearCredits: 5000,
      repeatCredits: 1250,
      experienceMultiplier: 4.0,
    },
  },
};

export const PVE_BOSS_LIST: readonly PveBossDefinition[] = PVE_BOSS_ORDER.map((id) => PVE_BOSSES[id]);

/** Checks the fixed ladder first, then Phase 3 side encounters (§35 Phase
 * 3) — both flow through the identical fighter-build/session/finish
 * pipeline, so callers never need to know which registry a fight came from. */
export function getBoss(bossId: string): PveBossDefinition | undefined {
  return (
    (PVE_BOSSES as Record<string, PveBossDefinition>)[bossId] ??
    (getSideEncounter(bossId) as unknown as PveBossDefinition | undefined)
  );
}

export function previousBossId(bossId: PveBossId): PveBossId | null {
  const idx = PVE_BOSS_ORDER.indexOf(bossId);
  return idx <= 0 ? null : PVE_BOSS_ORDER[idx - 1];
}

/** Public-facing boss shape — hides exact combat values (§14). */
export function bossPreview(boss: PveBossDefinition) {
  return {
    id: boss.id,
    order: boss.order,
    name: boss.name,
    difficulty: boss.difficulty,
    styleLabel: boss.styleLabel,
    behaviorLabel: boss.behaviorLabel,
    description: boss.description,
    fightingStyle: boss.fightingStyle,
    preview: boss.preview,
    recommendation: boss.recommendation,
    rewards: boss.rewards,
    presentation: boss.presentation ?? campaignPresentation(boss),
  };
}
