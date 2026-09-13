import type { StatBlock } from "../types";
import type { SideEncounterDefinition } from "./types";

function stats(power: number, speed: number, stamina: number, defense: number, accuracy: number, agility: number): StatBlock {
  return { power, speed, stamina, defense, accuracy, agility };
}

/** Evaluated once per read (campaignProgress-adjacent), never persisted — a
 * second competing progression store is exactly what parent spec §34 warns
 * against, so unlock state is always derived from existing rows. */
export type SideEncounterUnlockContext = {
  reputation: number;
  completedCircuitIds: string[];
  totalLossesAcrossHistory: number;
  rivalryDeciderBossIds: string[];
};

export function isSideEncounterUnlocked(def: SideEncounterDefinition, ctx: SideEncounterUnlockContext): boolean {
  switch (def.requirement.type) {
    case "reputation":
      return ctx.reputation >= def.requirement.min;
    case "circuitCompleted":
      return ctx.completedCircuitIds.includes(def.requirement.circuitId);
    case "cleanRecord":
      return ctx.totalLossesAcrossHistory <= def.requirement.maxLosses;
    case "rivalryDecider":
      return ctx.rivalryDeciderBossIds.includes(def.requirement.bossId);
  }
}

/**
 * Curated Phase 3 side content — optional challenges, invitationals, and
 * special encounters. Each reuses the exact PveBossDefinition shape so it
 * flows through the same fighter-build/session/finish pipeline as ladder
 * bosses (getBoss() checks this registry too); only the unlock condition and
 * ladder membership differ.
 */
export const PVE_SIDE_ENCOUNTERS: readonly SideEncounterDefinition[] = [
  {
    id: "backyard-brawl-challenge",
    kind: "challenge",
    circuitId: "backyard",
    order: 100,
    name: "The Night Brawl",
    difficulty: 2,
    styleLabel: "Street Brawler",
    behaviorLabel: "Reckless",
    description: "An unsanctioned side match with no time to recover between exchanges — pure output wins it.",
    fightingStyle: "aggressive",
    iv: stats(70, 60, 55, 50, 55, 48),
    ev: stats(15, 10, 5, 0, 0, 0),
    behaviorOverrides: { aggression: 0.95, caution: 0.1, patience: 0.05, riskTolerance: 0.9, recoveryPreference: 0.05, persistence: 0.9 },
    condition: 100,
    preview: { strength: 6, speed: 5, endurance: 4 },
    recommendation: "Any fighter who can close a fight quickly.",
    rewards: { firstClearCredits: 350, repeatCredits: 90, experienceMultiplier: 1.2 },
    requirement: { type: "circuitCompleted", circuitId: "backyard" },
    presentation: {
      title: "Optional Challenge",
      tagline: "No corner breaks. No recovery. Just output.",
      reputation: "Underground favorite",
      scoutReport: "A side-match specialist who forgoes recovery windows entirely, betting everything on relentless output.",
      knownFor: ["Never takes a recovery window", "Fades hard if the fight goes long"],
      tendencies: [
        { label: "Pressure", value: "very high" },
        { label: "Endurance", value: "low" },
      ],
      record: { wins: 6, losses: 3, kos: 4 },
      venue: { name: "The Night Brawl Pit", location: "Barangay San Isidro", environmentId: "rural" },
      circuitId: "backyard",
      nodeType: "challenge",
    },
  },
  {
    id: "provincial-underground-challenge",
    kind: "challenge",
    circuitId: "provincial",
    order: 101,
    name: "The Undercard King",
    difficulty: 3,
    styleLabel: "Trickster",
    behaviorLabel: "Unpredictable",
    description: "A crowd-favorite optional bout — not required for the circuit, but the purse is real.",
    fightingStyle: "counter",
    iv: stats(64, 74, 60, 58, 80, 76),
    ev: stats(10, 30, 10, 5, 35, 30),
    behaviorOverrides: { aggression: 0.3, caution: 0.7, patience: 0.85, counterPreference: 0.8 },
    condition: 96,
    preview: { strength: 5, speed: 7, endurance: 5 },
    recommendation: "A patient fighter comfortable being baited.",
    rewards: { firstClearCredits: 600, repeatCredits: 150, experienceMultiplier: 1.5 },
    requirement: { type: "circuitCompleted", circuitId: "provincial" },
    presentation: {
      title: "Optional Challenge",
      tagline: "The purse is real even if the record doesn't count toward the road.",
      reputation: "Crowd favorite",
      scoutReport: "A showman who baits aggression with feints before capitalizing on the counter.",
      knownFor: ["Baits predictable aggression", "Fights for the crowd, not the ranking"],
      tendencies: [
        { label: "Counter threat", value: "high" },
        { label: "Predictability", value: "low" },
      ],
      record: { wins: 14, losses: 6, kos: 5 },
      venue: { name: "Provincial Pits Undercard", location: "San Joaquin, Iloilo", environmentId: "provincial" },
      circuitId: "provincial",
      nodeType: "challenge",
    },
  },
  {
    id: "scouts-favorite-invitational",
    kind: "invitational",
    circuitId: "provincial",
    order: 102,
    name: "The Scout's Pick",
    difficulty: 3,
    styleLabel: "Prospect",
    behaviorLabel: "Composed",
    description: "Reputation opened this door — a promoter-arranged bout meant to test whether the hype is real.",
    fightingStyle: "balanced",
    iv: stats(70, 70, 70, 68, 70, 66),
    ev: stats(25, 25, 25, 20, 20, 15),
    behaviorOverrides: { patience: 0.6, persistence: 0.6, caution: 0.4 },
    condition: 95,
    preview: { strength: 6, speed: 6, endurance: 6 },
    recommendation: "A well-rounded fighter with something to prove.",
    rewards: { firstClearCredits: 700, repeatCredits: 175, experienceMultiplier: 1.6 },
    requirement: { type: "reputation", min: 150 },
    presentation: {
      title: "Invitational",
      tagline: "The circuit is starting to take notice.",
      reputation: "Promoter-arranged bout",
      scoutReport: "A balanced prospect brought in specifically to test whether a rising fighter's reputation is earned.",
      knownFor: ["No obvious weakness", "Fights to the promoter's script — composed, rarely reckless"],
      tendencies: [
        { label: "Adaptation", value: "moderate" },
        { label: "Pressure", value: "moderate" },
      ],
      record: { wins: 11, losses: 4, kos: 6 },
      venue: { name: "Provincial Pits Main Pit", location: "San Joaquin, Iloilo", environmentId: "provincial" },
      circuitId: "provincial",
      nodeType: "invitational",
    },
  },
  {
    id: "undefeated-invitational",
    kind: "invitational",
    circuitId: "regional",
    order: 103,
    name: "The Clean Slate Invitational",
    difficulty: 4,
    styleLabel: "Elite Specialist",
    behaviorLabel: "Precise",
    description: "Only offered to fighters who haven't lost a single sanctioned bout — a statement fight.",
    fightingStyle: "counter",
    iv: stats(82, 88, 78, 74, 90, 86),
    ev: stats(40, 50, 35, 30, 55, 45),
    behaviorOverrides: { caution: 0.6, patience: 0.85, counterPreference: 0.85, riskTolerance: 0.35 },
    condition: 98,
    preview: { strength: 7, speed: 8, endurance: 7 },
    recommendation: "An undefeated fighter ready to prove it against elite opposition.",
    rewards: { firstClearCredits: 1200, repeatCredits: 300, experienceMultiplier: 2.1 },
    requirement: { type: "cleanRecord", maxLosses: 0 },
    presentation: {
      title: "Invitational",
      tagline: "Undefeated fighters only. A statement, not a formality.",
      reputation: "Elite proving ground",
      scoutReport: "Only ever fights other undefeated names — precise, patient, and unwilling to let the fight get sloppy.",
      knownFor: ["Only accepts undefeated opponents", "Extremely low unforced-error rate"],
      tendencies: [
        { label: "Counter threat", value: "very high" },
        { label: "Predictability", value: "low" },
      ],
      record: { wins: 19, losses: 0, kos: 9 },
      venue: { name: "Regional Circuit Showcase", location: "Iloilo City", environmentId: "warehouse" },
      circuitId: "regional",
      nodeType: "invitational",
    },
  },
  {
    id: "veteran-decider",
    kind: "special",
    circuitId: "provincial",
    order: 104,
    name: "The Old Guard, Again",
    difficulty: 4,
    styleLabel: "Adaptive Fighter",
    behaviorLabel: "Adaptive",
    description: "The record is tied. Neither side is willing to call it settled — a decider, off the books.",
    fightingStyle: "balanced",
    iv: stats(83, 83, 84, 82, 82, 80),
    ev: stats(45, 45, 48, 45, 45, 45),
    behaviorOverrides: { patience: 0.8, persistence: 0.85, caution: 0.55, counterPreference: 0.6 },
    condition: 92,
    preview: { strength: 8, speed: 8, endurance: 8 },
    recommendation: "A fighter who has already learned everything The Veteran has to teach.",
    rewards: { firstClearCredits: 950, repeatCredits: 240, experienceMultiplier: 2.0 },
    requirement: { type: "rivalryDecider", bossId: "veteran" },
    presentation: {
      title: "Special Encounter — Decider",
      tagline: "Off the books. Nothing left to prove but everything to settle.",
      reputation: "Unofficial decider",
      scoutReport: "The same adaptive read-and-react gameplan, sharpened by a rivalry neither side has walked away from.",
      knownFor: ["Knows this matchup better than any other", "Will not repeat what already lost"],
      tendencies: [
        { label: "Adaptation", value: "very high" },
        { label: "Counter threat", value: "high" },
      ],
      record: { wins: 19, losses: 5, kos: 11 },
      venue: { name: "Provincial Pits Main Pit", location: "San Joaquin, Iloilo", environmentId: "provincial" },
      circuitId: "provincial",
      nodeType: "special",
    },
  },
];

export function getSideEncounter(id: string): SideEncounterDefinition | undefined {
  return PVE_SIDE_ENCOUNTERS.find((e) => e.id === id);
}

export function sideEncountersForCircuit(circuitId: string): readonly SideEncounterDefinition[] {
  return PVE_SIDE_ENCOUNTERS.filter((e) => e.circuitId === circuitId);
}
