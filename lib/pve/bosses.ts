import type { StatBlock } from "../types";
import { PVE_BOSS_ORDER, type PveBossDefinition, type PveBossId } from "./types";

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
    behaviorOverrides: { aggression: 0.8, caution: 0.2, patience: 0.2, riskTolerance: 0.65 },
    experienceBaseline: { offensive: 40 },
    condition: 82,
    preview: { strength: 3, speed: 3, endurance: 2 },
    recommendation: "Any reasonably trained rooster.",
    rewards: { firstClearCredits: 150, repeatCredits: 40, experienceMultiplier: 1 },
  },

  brawler: {
    id: "brawler",
    order: 2,
    name: "The Brawler",
    difficulty: 2,
    styleLabel: "Power Fighter",
    behaviorLabel: "Aggressive",
    description:
      "A physically overwhelming opponent. Hits hard and soaks punishment, but slow hands and slow feet — speed and evasion beat him.",
    fightingStyle: "aggressive",
    iv: stats(90, 44, 72, 86, 54, 40),
    ev: stats(60, 0, 45, 50, 0, 0),
    behaviorOverrides: { aggression: 0.85, caution: 0.2, riskTolerance: 0.7, persistence: 0.75 },
    experienceBaseline: { offensive: 160, pressure: 110 },
    preview: { strength: 9, speed: 3, endurance: 7 },
    recommendation: "A developed fighter with real speed or evasion.",
    rewards: { firstClearCredits: 300, repeatCredits: 75, experienceMultiplier: 1.25 },
  },

  striker: {
    id: "striker",
    order: 3,
    name: "The Striker",
    difficulty: 3,
    styleLabel: "Speed Counter-Fighter",
    behaviorLabel: "Counter-Attacker",
    description:
      "Fast, precise and patient. Waits for you to commit, then punishes. Predictable aggression gets you countered all night.",
    fightingStyle: "counter",
    iv: stats(60, 92, 66, 60, 88, 85),
    ev: stats(0, 55, 0, 0, 50, 45),
    behaviorOverrides: { counterPreference: 0.95, patience: 0.9, caution: 0.6, aggression: 0.35 },
    experienceBaseline: { counter: 220, evasion: 140, defensive: 90 },
    preview: { strength: 5, speed: 9, endurance: 5 },
    recommendation: "A well-trained fighter with endurance and controlled aggression.",
    rewards: { firstClearCredits: 500, repeatCredits: 125, experienceMultiplier: 1.5 },
  },

  veteran: {
    id: "veteran",
    order: 4,
    name: "The Veteran",
    difficulty: 4,
    styleLabel: "Adaptive Fighter",
    behaviorLabel: "Adaptive",
    description:
      "A seasoned campaigner with no glaring weakness. Reads the fight and shifts tactics — pressures a passive opponent, defends against a reckless one. A rooster built for only one plan will lose.",
    fightingStyle: "balanced",
    iv: stats(80, 80, 82, 80, 80, 78),
    ev: stats(40, 40, 45, 40, 40, 40),
    behaviorOverrides: { patience: 0.75, persistence: 0.7, caution: 0.5, counterPreference: 0.55 },
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
    preview: { strength: 8, speed: 8, endurance: 8 },
    recommendation: "An advanced, well-rounded fighter.",
    rewards: { firstClearCredits: 800, repeatCredits: 200, experienceMultiplier: 1.9 },
  },

  champion: {
    id: "champion",
    order: 5,
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
    preview: { strength: 10, speed: 9, endurance: 10 },
    recommendation: "An elite fighter, fully developed across the board.",
    rewards: { firstClearCredits: 1500, repeatCredits: 350, experienceMultiplier: 2.5 },
  },
};

export const PVE_BOSS_LIST: readonly PveBossDefinition[] = PVE_BOSS_ORDER.map((id) => PVE_BOSSES[id]);

export function getBoss(bossId: string): PveBossDefinition | undefined {
  return (PVE_BOSSES as Record<string, PveBossDefinition>)[bossId];
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
  };
}
