/**
 * One-off seed script: clears the player's coop and drops in 8 trained,
 * battle-tested roosters — 2 per fighting style (aggressive/counter/
 * endurance/balanced) — for hands-on testing of the Strategy Fighter Phase
 * A/B combat AI (docs/superpowers/plans/2026-09-09-strategy-fighter-phase-ab.md).
 *
 * Unlike scripts/seed-deep-red-black-roster.ts and scripts/seed-god-chickens.ts,
 * this script sets `behavior` explicitly to deriveBehaviorProfile(fightingStyle,
 * traits) on every row. Chicken.behavior has a Prisma column @default (the
 * generic balanced profile), so `chicken.behavior ?? deriveBehaviorProfile(...)`
 * in lib/combat/state.ts never falls through to the style-derived profile
 * unless a row explicitly sets `behavior` — both of those other scripts skip
 * this, so every one of their chickens actually fights with an identical
 * balanced profile regardless of the fightingStyle column. This script exists
 * specifically to make style differences visible in combat.
 *
 * Each rooster gets: realistic trained EVs (weighted toward its two highest
 * IV stats, same shape as buildTrainingState in seed-deep-red-black-roster.ts),
 * a persisted RoosterTraining row, a plausible veteran CombatRecord, style-
 * skewed CombatExperience counts, and confidence/morale/battleHardening/
 * condition values that read as "campaign-tested," not fresh stock.
 *
 * Run with: yarn seed:strategy
 */
import { randomUUID } from "node:crypto";

import { prisma } from "../lib/db";
import { deriveBehaviorProfile } from "../lib/combat/behavior";
import { BATTLE_SCARRED_TRAIT, VETERAN_TRAIT } from "../lib/combat/battleTraits";
import { getOrCreatePlayer } from "../lib/player";
import { TRAIT_POOL } from "../lib/traits";
import { EV_PER_TRAIN } from "../lib/training";
import { MAX_TRAINING_EFFORT_PER_STAT, MAX_TRAINING_EFFORT_TOTAL } from "../lib/training/effort";
import { rollTrainingPotential } from "../lib/training/potential";
import { XP_PER_SESSION, XP_POOLS_BY_CATEGORY } from "../lib/training/xp";
import {
  GENETIC_STAT_KEYS,
  PHYSICAL_TRAIT_KEYS,
  type ChickenColorScheme,
  type CombatExperience,
  type CombatRecord,
  type FightingStyle,
  type GeneticStatKey,
  type MutationGenome,
  type PhysicalBlock,
  type StatBlock,
  type Trait,
  type TrainingCategory,
} from "../lib/types";
import type { Rng } from "../lib/genetics";

const SEED = 9001;

/** mulberry32 — small, fast, deterministic PRNG matching genetics.ts's Rng shape. */
function mulberry32(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function statBlock(overrides: Partial<StatBlock>): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = overrides[key] ?? 60));
  return block;
}

function zeroStatBlock(): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = 0));
  return block;
}

function physicalBlock(overrides: Partial<PhysicalBlock>): PhysicalBlock {
  const block = {} as PhysicalBlock;
  PHYSICAL_TRAIT_KEYS.forEach((key) => (block[key] = overrides[key] ?? 1));
  return block;
}

/** TRAIT_POOL only covers genetics-rolled traits — the battle-earned ones (veteran, battle-scarred) live in lib/combat/battleTraits.ts, so the lookup spans both. */
const ALL_TRAITS: readonly Trait[] = [...TRAIT_POOL, VETERAN_TRAIT, BATTLE_SCARRED_TRAIT];

function traitsFor(ids: readonly string[]): Trait[] {
  return ids.map((id) => {
    const trait = ALL_TRAITS.find((t) => t.id === id);
    if (!trait) throw new Error(`Unknown trait id: ${id}`);
    return trait;
  });
}

/** GeneticStatKey -> TrainingCategory, mirroring the private map in lib/training.ts (not exported there). */
const STAT_TO_CATEGORY: Record<GeneticStatKey, TrainingCategory> = {
  power: "strength",
  speed: "speed",
  agility: "agility",
  defense: "defense",
  stamina: "stamina",
  accuracy: "technique",
};

/** A veteran's lifetime Training Effort budget — well past a rookie's first sessions, short of maxed-out. */
const VETERAN_EFFORT_BUDGET: readonly [number, number] = [300, 400];

function xpAndDiscoveredFor(effortSpent: StatBlock): {
  discovered: Partial<Record<GeneticStatKey, boolean>>;
  xp: { physicalXP: number; combatXP: number; tacticalXP: number; disciplineXP: number; recoveryXP: number };
} {
  const discovered: Partial<Record<GeneticStatKey, boolean>> = {};
  const xp = { physicalXP: 0, combatXP: 0, tacticalXP: 0, disciplineXP: 0, recoveryXP: 0 };
  GENETIC_STAT_KEYS.forEach((key) => {
    if (effortSpent[key] >= MAX_TRAINING_EFFORT_PER_STAT) discovered[key] = true;
    const sessions = Math.ceil(effortSpent[key] / EV_PER_TRAIN);
    for (const pool of XP_POOLS_BY_CATEGORY[STAT_TO_CATEGORY[key]]) {
      xp[pool] += sessions * XP_PER_SESSION;
    }
  });
  return { discovered, xp };
}

/** Same shape as buildTrainingState in seed-deep-red-black-roster.ts, minus the generation-budget table (every rooster here is a veteran). */
function buildTrainingState(iv: StatBlock, rng: Rng) {
  const trainingPotential = rollTrainingPotential(iv, rng);
  const [min, max] = VETERAN_EFFORT_BUDGET;
  const budget = Math.round(min + rng() * (max - min));

  const focusStats = [...GENETIC_STAT_KEYS].sort((a, b) => iv[b] - iv[a]).slice(0, 2);
  const weight = (key: GeneticStatKey) => (focusStats.includes(key) ? 3 : 1);
  const totalWeight = GENETIC_STAT_KEYS.reduce((sum, key) => sum + weight(key), 0);

  const effortSpent = zeroStatBlock();
  let spent = 0;
  GENETIC_STAT_KEYS.forEach((key) => {
    const share = Math.round((budget * weight(key)) / totalWeight);
    const cap = Math.min(MAX_TRAINING_EFFORT_PER_STAT, trainingPotential[key]);
    const remainingTotal = MAX_TRAINING_EFFORT_TOTAL - spent;
    const allocated = Math.max(0, Math.min(share, cap, remainingTotal));
    effortSpent[key] = allocated;
    spent += allocated;
  });

  const ev: StatBlock = { ...effortSpent };
  const { discovered, xp } = xpAndDiscoveredFor(effortSpent);

  return {
    ev,
    roosterTraining: { ...xp, effortSpent, trainingPotential, discovered, traits: [] as string[], breakthroughs: [] as string[] },
  };
}

type Archetype = {
  name: string;
  style: FightingStyle;
  iv: StatBlock;
  physical: PhysicalBlock;
  mutations: MutationGenome;
  traitIds: readonly string[];
  colorScheme: ChickenColorScheme;
  /** Style-skewed lifetime experience counts, biggest categories first. */
  experience: CombatExperience;
  record: CombatRecord;
};

const AGGRESSIVE_SCHEME: ChickenColorScheme = {
  body: "#b5321a", hackle: "#8a1f0f", wings: "#1a1a1a", tail: "#171717",
  comb: "#d13c1f", beak: "#1c1c1c", shanks: "#1c1c1c", pattern: "SOLID", patternColor: "#0d0d0d",
};
const COUNTER_SCHEME: ChickenColorScheme = {
  body: "#1e3a5f", hackle: "#0f2338", wings: "#0a1622", tail: "#0a1622",
  comb: "#274b78", beak: "#141414", shanks: "#151515", pattern: "BARRED", patternColor: "#3a6ea5",
};
const ENDURANCE_SCHEME: ChickenColorScheme = {
  body: "#4a5a1e", hackle: "#2f3a12", wings: "#1a1f0d", tail: "#1a1f0d",
  comb: "#6b7f2a", beak: "#161616", shanks: "#171717", pattern: "MOTTLED", patternColor: "#7d9438",
};
const BALANCED_SCHEME: ChickenColorScheme = {
  body: "#8b6f47", hackle: "#6b5335", wings: "#3a2e1c", tail: "#4a3b25",
  comb: "#b8100f", beak: "#d9a83a", shanks: "#cc9e33", pattern: "SOLID", patternColor: "#4a3521",
};

const ARCHETYPES: readonly Archetype[] = [
  // --- Aggressive: high power/speed/agility, weak defense — reads its own tells loud (spec Tests A). ---
  {
    name: "Vindicator", style: "aggressive",
    iv: statBlock({ power: 85, speed: 78, agility: 80, defense: 42, stamina: 55, accuracy: 65 }),
    physical: physicalBlock({ legLength: 1.2, chest: 1.1, bodyGirth: 0.9 }),
    mutations: { iron_spurs: { carrier: true, expressed: true } },
    traitIds: ["heavy-striker", "quick-starter"],
    colorScheme: AGGRESSIVE_SCHEME,
    experience: { offensive: 620, defensive: 40, evasion: 30, counter: 20, pressure: 260, recovery: 35, adaptation: 50 },
    record: { wins: 14, losses: 5, championships: 1, koTko: 8, decisions: 6 },
  },
  {
    name: "Firebrand", style: "aggressive",
    iv: statBlock({ power: 80, speed: 82, agility: 75, defense: 45, stamina: 58, accuracy: 60 }),
    physical: physicalBlock({ legLength: 1.15, chest: 1.05 }),
    mutations: {},
    traitIds: ["glass-cannon"],
    colorScheme: AGGRESSIVE_SCHEME,
    experience: { offensive: 580, defensive: 35, evasion: 25, counter: 15, pressure: 300, recovery: 30, adaptation: 40 },
    record: { wins: 11, losses: 7, championships: 0, koTko: 7, decisions: 4 },
  },
  // --- Counter: high accuracy/agility/defense — waits, reads, punishes overcommits (validation-gate's readerCoach target). ---
  {
    name: "Sentinel", style: "counter",
    iv: statBlock({ power: 60, speed: 65, agility: 78, defense: 75, stamina: 62, accuracy: 82 }),
    physical: physicalBlock({ legLength: 1.05, bodyGirth: 1.05 }),
    mutations: {},
    traitIds: ["counter-fighter", "calm"],
    colorScheme: COUNTER_SCHEME,
    experience: { offensive: 180, defensive: 220, evasion: 240, counter: 480, pressure: 60, recovery: 90, adaptation: 140 },
    record: { wins: 13, losses: 4, championships: 1, koTko: 4, decisions: 9 },
  },
  {
    name: "Reprisal", style: "counter",
    iv: statBlock({ power: 58, speed: 68, agility: 74, defense: 72, stamina: 60, accuracy: 78 }),
    physical: physicalBlock({ legLength: 1.0 }),
    mutations: { giant: { carrier: true, expressed: false } },
    traitIds: ["counter-fighter"],
    colorScheme: COUNTER_SCHEME,
    experience: { offensive: 160, defensive: 200, evasion: 220, counter: 440, pressure: 55, recovery: 80, adaptation: 120 },
    record: { wins: 10, losses: 6, championships: 0, koTko: 3, decisions: 7 },
  },
  // --- Endurance: high stamina/defense, low speed — grinds, recovers, outlasts (spec's "Survivor" archetype). ---
  {
    name: "Bastion", style: "endurance",
    iv: statBlock({ power: 62, speed: 42, agility: 45, defense: 85, stamina: 88, accuracy: 58 }),
    physical: physicalBlock({ bodyGirth: 1.45, chest: 1.4, legLength: 0.8 }),
    mutations: { giant: { carrier: true, expressed: true } },
    traitIds: ["iron-stamina", "survivor"],
    colorScheme: ENDURANCE_SCHEME,
    experience: { offensive: 140, defensive: 260, evasion: 150, counter: 90, pressure: 80, recovery: 380, adaptation: 100 },
    record: { wins: 12, losses: 5, championships: 0, koTko: 2, decisions: 10 },
  },
  {
    name: "Ironhide", style: "endurance",
    iv: statBlock({ power: 58, speed: 40, agility: 48, defense: 80, stamina: 85, accuracy: 55 }),
    physical: physicalBlock({ bodyGirth: 1.35, chest: 1.3, legLength: 0.85 }),
    mutations: {},
    traitIds: ["iron-stamina", "battle-scarred"],
    colorScheme: ENDURANCE_SCHEME,
    experience: { offensive: 130, defensive: 240, evasion: 140, counter: 85, pressure: 70, recovery: 340, adaptation: 95 },
    record: { wins: 9, losses: 6, championships: 0, koTko: 1, decisions: 8 },
  },
  // --- Balanced: even stats across the board — no exploitable gap, the "default" archetype styleWeight compares everyone else against. ---
  {
    name: "Ronin", style: "balanced",
    iv: statBlock({ power: 65, speed: 65, agility: 65, defense: 65, stamina: 65, accuracy: 65 }),
    physical: physicalBlock({}),
    mutations: {},
    traitIds: ["veteran"],
    colorScheme: BALANCED_SCHEME,
    experience: { offensive: 260, defensive: 220, evasion: 200, counter: 220, pressure: 240, recovery: 200, adaptation: 180 },
    record: { wins: 15, losses: 6, championships: 1, koTko: 4, decisions: 11 },
  },
  {
    name: "Journeyman", style: "balanced",
    iv: statBlock({ power: 63, speed: 63, agility: 63, defense: 63, stamina: 63, accuracy: 63 }),
    physical: physicalBlock({}),
    mutations: {},
    traitIds: [],
    colorScheme: BALANCED_SCHEME,
    experience: { offensive: 220, defensive: 190, evasion: 180, counter: 190, pressure: 210, recovery: 180, adaptation: 150 },
    record: { wins: 9, losses: 9, championships: 0, koTko: 3, decisions: 6 },
  },
];

async function main() {
  const player = await getOrCreatePlayer();
  const rng = mulberry32(SEED);

  const existingChickens = await prisma.chicken.findMany({ where: { playerId: player.id }, select: { id: true } });
  const deletedTraining = await prisma.roosterTraining.deleteMany({
    where: { chickenId: { in: existingChickens.map((c) => c.id) } },
  });
  const deletedChickens = await prisma.chicken.deleteMany({ where: { playerId: player.id } });
  const deletedEggs = await prisma.egg.deleteMany({ where: { playerId: player.id } });
  console.log(
    `Cleared ${deletedChickens.count} chickens, ${deletedTraining.count} training rows, and ${deletedEggs.count} eggs for player ${player.id}.`
  );

  const bloodlineId = randomUUID();

  for (const arch of ARCHETYPES) {
    const id = randomUUID();
    const traits: Trait[] = traitsFor(arch.traitIds);
    const { ev, roosterTraining } = buildTrainingState(arch.iv, rng);
    const behavior = deriveBehaviorProfile(arch.style, traits);

    await prisma.chicken.create({
      data: {
        id,
        playerId: player.id,
        name: arch.name,
        sex: "rooster",
        generation: 0,
        fatherId: null,
        motherId: null,
        bloodlineId,
        iv: arch.iv,
        ev,
        physical: arch.physical,
        mutations: arch.mutations,
        traits,
        age: 3,
        health: 100,
        energy: 100,
        record: arch.record,
        status: "active",
        growthStage: "prime",
        fightingStyle: arch.style,
        colorScheme: arch.colorScheme,
        injured: false,
        behavior,
        experience: arch.experience,
        condition: 92,
        stress: 15,
        morale: 72,
        confidence: 68,
        battleHardening: 18,
      },
    });

    await prisma.roosterTraining.create({
      data: {
        chickenId: id,
        physicalXP: roosterTraining.physicalXP,
        combatXP: roosterTraining.combatXP,
        tacticalXP: roosterTraining.tacticalXP,
        disciplineXP: roosterTraining.disciplineXP,
        recoveryXP: roosterTraining.recoveryXP,
        effortSpent: roosterTraining.effortSpent as object,
        trainingPotential: roosterTraining.trainingPotential as object,
        discovered: roosterTraining.discovered as object,
        traits: roosterTraining.traits as object,
        breakthroughs: roosterTraining.breakthroughs as object,
      },
    });
  }

  console.log(`\nSeeded ${ARCHETYPES.length} trained, battle-tested roosters for player ${player.id}:\n`);
  for (const arch of ARCHETYPES) {
    console.log(
      `  [${arch.style.padEnd(10)}] ${arch.name.padEnd(12)} record=${arch.record.wins}-${arch.record.losses} ` +
        `(${arch.record.koTko} KO/TKO)  traits=${arch.traitIds.length ? arch.traitIds.join(",") : "-"}`
    );
  }
  console.log(`\nGo to /battle/<chickenId> for any of them to fight a matched PVE opponent with the new AI.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
