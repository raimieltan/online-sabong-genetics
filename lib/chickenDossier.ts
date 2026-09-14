import { effectiveStat } from "./combat";
import { deriveBehaviorProfile } from "./combat/behavior";
import { growthFactor } from "./growth";
import { resolvePhysicalProfile } from "./physicalProfile";
import type { BehavioralProfile, Chicken, GeneticStatKey } from "./types";

export const DOSSIER_STATS: readonly GeneticStatKey[] = [
  "power",
  "speed",
  "stamina",
  "defense",
  "accuracy",
  "agility",
];

export type DossierArchetype = {
  name: string;
  role: string;
  description: string;
  traits: string[];
  strengths: GeneticStatKey[];
  weaknesses: GeneticStatKey[];
};

export function potentialGrade(value: number): string {
  if (value >= 90) return "Elite";
  if (value >= 80) return "Exceptional";
  if (value >= 70) return "Excellent";
  if (value >= 60) return "Good";
  if (value >= 50) return "Average";
  if (value >= 40) return "Below average";
  if (value >= 30) return "Limited";
  return "Raw";
}

export function valueBand(value: number, inverse = false): string {
  const score = inverse ? 100 - value : value;
  if (score >= 80) return inverse ? "Calm" : "High";
  if (score >= 60) return inverse ? "Composed" : "Strong";
  if (score >= 40) return "Stable";
  if (score >= 20) return inverse ? "Elevated" : "Developing";
  return inverse ? "Severe" : "Low";
}

export function physicalBand(value: number): string {
  if (value >= 1.1) return "Pronounced";
  if (value >= 1.035) return "Above average";
  if (value <= 0.9) return "Compact";
  if (value <= 0.965) return "Below average";
  return "Balanced";
}

export function dossierBehavior(chicken: Chicken): BehavioralProfile {
  return chicken.behavior ?? deriveBehaviorProfile(chicken.fightingStyle, chicken.traits);
}

export function deriveDossierArchetype(chicken: Chicken): DossierArchetype {
  const behavior = dossierBehavior(chicken);
  const stats = Object.fromEntries(
    DOSSIER_STATS.map((key) => [key, effectiveStat(chicken, key)]),
  ) as Record<GeneticStatKey, number>;
  const ranked = [...DOSSIER_STATS].sort((a, b) => stats[b] - stats[a]);

  const counterScore = stats.defense + stats.accuracy + behavior.counterPreference * 100 + behavior.patience * 55;
  const pressureScore = stats.power + stats.speed + behavior.aggression * 90 + behavior.pressurePreference * 85;
  const enduranceScore = stats.stamina + stats.defense + behavior.persistence * 90 + behavior.recoveryPreference * 70;
  const evasiveScore = stats.speed + stats.agility + behavior.caution * 70 + (1 - behavior.riskTolerance) * 45;
  const powerScore = stats.power * 1.55 + behavior.riskTolerance * 80 + behavior.aggression * 55;
  const scores = [
    { key: "counter", score: counterScore },
    { key: "pressure", score: pressureScore },
    { key: "endurance", score: enduranceScore },
    { key: "evasive", score: evasiveScore },
    { key: "power", score: powerScore },
  ].sort((a, b) => b.score - a.score);

  const spread = scores[0].score - scores[1].score;
  const balanced = spread < 12 || chicken.fightingStyle === "balanced";
  const archetypes: Record<string, Omit<DossierArchetype, "strengths" | "weaknesses">> = {
    counter: {
      name: behavior.caution > 0.58 ? "Defensive Counter" : "Adaptive Counter",
      role: "Counter fighter",
      description: "Reads committed attacks and turns exposed openings into precise punishment.",
      traits: ["Patient", "Accurate", "Defensive"],
    },
    pressure: {
      name: behavior.persistence > 0.66 ? "Relentless Pressure" : "Pressure Brawler",
      role: "Pressure fighter",
      description: "Closes distance quickly and builds advantage by keeping opponents under strain.",
      traits: ["Aggressive", "Persistent", "Forward moving"],
    },
    endurance: {
      name: "Endurance Grinder",
      role: "Attrition fighter",
      description: "Extends exchanges, absorbs adversity and wins as an opponent's options fade.",
      traits: ["Resilient", "Composed", "Conditioned"],
    },
    evasive: {
      name: "Evasive Striker",
      role: "Mobility fighter",
      description: "Uses movement and timing to deny clean contact before answering from angles.",
      traits: ["Mobile", "Elusive", "Measured"],
    },
    power: {
      name: "Heavy Power Fighter",
      role: "Power fighter",
      description: "Commits to damaging attacks and looks to decide exchanges with force.",
      traits: ["Powerful", "Direct", "Dangerous"],
    },
    balanced: {
      name: "Balanced Technician",
      role: "Complete fighter",
      description: "Carries a flexible toolkit and adapts without relying on a single advantage.",
      traits: ["Adaptable", "Technical", "Balanced"],
    },
  };

  return {
    ...(balanced ? archetypes.balanced : archetypes[scores[0].key]),
    strengths: ranked.slice(0, 2),
    weaknesses: ranked.slice(-2).reverse(),
  };
}

export function temperamentSummary(chicken: Chicken): string {
  const b = dossierBehavior(chicken);
  const opening = b.aggression >= 0.65
    ? `${chicken.name} is eager to establish pressure.`
    : b.caution >= 0.62
      ? `${chicken.name} studies danger before committing.`
      : `${chicken.name} balances initiative with restraint.`;
  const follow = b.counterPreference >= 0.62
    ? "Openings are met with a strong counter instinct."
    : b.pressurePreference >= 0.62
      ? "Once momentum appears, the pressure tends to continue."
      : b.recoveryPreference >= 0.62
        ? "Composure and recovery remain central to the game plan."
        : "The approach shifts with the rhythm of each exchange.";
  return `${opening} ${follow}`;
}

export function recommendedDevelopment(chicken: Chicken): {
  primary: string;
  secondary: string[];
  reason: string;
} {
  const archetype = deriveDossierArchetype(chicken);
  const labels: Record<GeneticStatKey, string> = {
    power: "Power mechanics",
    speed: "Entry speed",
    stamina: "Fight conditioning",
    defense: "Defensive structure",
    accuracy: "Strike precision",
    agility: "Footwork",
  };
  const primary = archetype.weaknesses[0];
  const secondary = archetype.weaknesses.slice(1).concat(archetype.strengths.slice(0, 1));
  return {
    primary: labels[primary],
    secondary: secondary.map((stat) => labels[stat]),
    reason: `${chicken.name}'s ${archetype.strengths.map((s) => s).join(" and ")} create the foundation; improving ${primary} will make the profile more complete.`,
  };
}

export function physicalDossier(chicken: Chicken) {
  const profile = resolvePhysicalProfile(chicken);
  const values = Object.entries(profile) as [keyof typeof profile, number][];
  const strongest = [...values].sort((a, b) => b[1] - a[1])[0];
  const name = strongest[0] === "mass"
    ? "Power frame"
    : strongest[0] === "mobility"
      ? "Mobile striker"
      : strongest[0] === "reach"
        ? "Long-range frame"
        : strongest[0] === "stability"
          ? "Stable guard"
          : strongest[0] === "kickPower"
            ? "Kicking build"
            : "Wing-balanced frame";
  return { name, profile };
}

export function developmentPercent(chicken: Chicken): number {
  return Math.round(growthFactor(chicken.growthStage) * 100);
}
