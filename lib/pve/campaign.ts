import type { FightingStyle } from "../types";
import type { PveBossId, PveCircuit, PveNodeType, PveOpponentPresentation } from "./types";

export const PVE_CIRCUITS: readonly PveCircuit[] = [
  { id: "backyard", order: 1, chapter: "Chapter I", name: "Backyard Circuit", subtitle: "Where a name is first made.", description: "Improvised pits, hungry fighters, and the first test of a young rooster's nerve.", environmentId: "rural", bossIds: ["rookie", "scrapper", "brawler", "charger", "wall"], championshipBossId: "wall" },
  { id: "provincial", order: 2, chapter: "Chapter II", name: "Provincial Pits", subtitle: "The real competition starts here.", description: "Recognizable names, organized venues, and fighters who know how to make a mistake hurt.", environmentId: "provincial", bossIds: ["striker", "grinder", "feint-master", "pressure-king", "veteran"], championshipBossId: "veteran" },
  { id: "regional", order: 3, chapter: "Chapter III", name: "Regional Circuit", subtitle: "The circuit is watching.", description: "Established professionals and dangerous specialists compete for a route to the national stage.", environmentId: "warehouse", bossIds: ["iron-rooster", "phantom", "executioner", "champion", "challenger"], championshipBossId: "challenger" },
  { id: "national", order: 4, chapter: "Chapter IV", name: "National Circuit", subtitle: "Only complete fighters remain.", description: "Prestige, pressure, and elite opposition define the last organized circuit.", environmentId: "city-arena", bossIds: ["tactician", "berserker", "counter-master"], championshipBossId: "counter-master" },
  { id: "grand", order: 5, chapter: "Chapter V", name: "Grand Championship", subtitle: "A career-defining finish.", description: "The final spotlight belongs to the fighters brave enough to take it.", environmentId: "coliseum", bossIds: ["warlord", "apex"], championshipBossId: "apex" },
] as const;

const titles: Partial<Record<PveBossId, string>> = {
  rookie: "First Blood", charger: "There Is No Feeling-Out Process", wall: "Backyard Gatekeeper",
  striker: "One Mistake", grinder: "The Long Night", "feint-master": "Fight What You See", "pressure-king": "No Breathing Room", veteran: "The Old Guard",
  phantom: "The Unseen", executioner: "Regional Threat", challenger: "Regional Champion", tactician: "National Qualifier", "counter-master": "National Champion", warlord: "The Last Gate", apex: "Grand Champion",
};

const quotes: Partial<Record<PveBossId, string>> = {
  charger: "There is no feeling-out process.", wall: "You can hit him. The problem is making it matter.", striker: "One mistake. That's all he needs.",
  grinder: "He doesn't need to win quickly. He just needs you to break first.", "feint-master": "Fight what you see and you've already lost.",
  "pressure-king": "Everybody has a plan until they can't breathe.", veteran: "Everyone walks in thinking they're the next champion.", apex: "The road ends here.",
};

function circuitFor(id: PveBossId) { return PVE_CIRCUITS.find((c) => c.bossIds.includes(id))!; }

export function campaignCircuit(id: string) { return PVE_CIRCUITS.find((c) => c.id === id); }

export function campaignPresentation(input: {
  id: PveBossId; name: string; order: number; styleLabel: string; behaviorLabel: string; description: string; difficulty: number; fightingStyle: FightingStyle;
}): PveOpponentPresentation {
  const circuit = circuitFor(input.id);
  const nodeType: PveNodeType = input.id === circuit.championshipBossId
    ? (circuit.id === "grand" ? "championship" : "gatekeeper")
    : input.id === "challenger" ? "rival" : "standard";
  const high = input.behaviorLabel.toLowerCase().includes("adaptive") || input.fightingStyle === "counter";
  return {
    title: titles[input.id] ?? input.styleLabel,
    tagline: input.description,
    quote: quotes[input.id],
    reputation: input.difficulty >= 5 ? "Elite circuit threat" : input.difficulty >= 3 ? "Established circuit name" : "Rising local fighter",
    scoutReport: `${input.name} is a ${input.behaviorLabel.toLowerCase()} ${input.styleLabel.toLowerCase()}. ${input.description}`,
    knownFor: [
      `${input.behaviorLabel} exchanges`,
      input.fightingStyle === "aggressive" ? "Relentless forward pressure" : input.fightingStyle === "counter" ? "Punishing commitments" : "Winning the long fight",
      input.difficulty >= 4 ? "Veteran composure under pressure" : "A distinct, readable rhythm",
    ],
    tendencies: [
      { label: "Adaptation", value: high ? "very high" : input.difficulty >= 3 ? "high" : "moderate" },
      { label: "Pressure", value: input.fightingStyle === "aggressive" ? "high" : "moderate" },
      { label: "Counter threat", value: input.fightingStyle === "counter" ? "very high" : "moderate" },
      { label: "Endurance", value: input.fightingStyle === "endurance" ? "very high" : input.difficulty >= 3 ? "high" : "moderate" },
    ],
    record: { wins: 4 + input.order * 3, losses: Math.max(1, 7 - Math.floor(input.order / 3)), kos: 2 + input.order * 2 },
    venue: { name: circuit.id === "grand" ? "Grand Coliseum" : `${circuit.name} Main Pit`, location: circuit.id === "backyard" ? "Barangay San Isidro" : "San Joaquin, Iloilo", environmentId: circuit.environmentId },
    circuitId: circuit.id,
    nodeType,
  };
}

export function circuitForBoss(id: PveBossId) { return circuitFor(id); }
