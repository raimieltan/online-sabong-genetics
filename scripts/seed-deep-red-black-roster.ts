/**
 * One-off seed script: clears the player's coop and reseeds a 24-chicken,
 * 4-generation roster (gen0 founders through gen3) built entirely through the
 * real breeding pipeline — inheritStatBlock/inheritPhysicalBlock/
 * inheritMutations/inheritTraits/inheritColorScheme from lib/genetics.ts and
 * lib/traits.ts, no hand-authored stat blocks past gen0.
 *
 * Three founder bloodlines, each with a distinct stat specialty and a deep
 * red/black color scheme:
 *   - Cinderfall (attacker: power/agility)  — Vulcan x Scarlet
 *   - Ember Ward (tank: stamina/defense)    — Titan x Garnetta
 *   - Garnet Vale (balanced control line)   — Ronin x Sable
 *
 * Every generation round-robin-crosses the three lines (A's rooster x B's
 * hen, B's rooster x C's hen, C's rooster x A's hen) instead of breeding
 * full siblings back together, so genetics actually mix across the roster
 * the way outcrossing would in a real breeding program.
 *
 * Mutation carriers are only seeded on two gen0 founders (Vulcan: iron_spurs
 * carrier, Garnetta: giant expressed + iron_spurs carrier) — everything
 * downstream is real recessive/codominant resolution via inheritMutations,
 * so expression is real chance, not scripted. Same for traits: founders get
 * a handful (including one glass-cannon), and lib/traits.ts's 40%-per-trait
 * pass-through does the diluting — by gen3 only a fraction of the roster
 * still carries any given trait.
 *
 * A seeded PRNG (mulberry32) makes the whole run reproducible — same seed,
 * same roster, every time.
 *
 * Run with: yarn seed:redblack
 */
import { randomUUID } from "node:crypto";

import { prisma } from "../lib/db";
import {
  inheritColorScheme,
  inheritMutations,
  inheritPhysicalBlock,
  inheritStatBlock,
  type Rng,
} from "../lib/genetics";
import { getOrCreatePlayer } from "../lib/player";
import { inheritTraits, TRAIT_POOL } from "../lib/traits";
import {
  GENETIC_STAT_KEYS,
  PHYSICAL_TRAIT_KEYS,
  type ChickenColorScheme,
  type FightingStyle,
  type GrowthStage,
  type MutationGenome,
  type PhysicalBlock,
  type StatBlock,
  type Trait,
} from "../lib/types";

const SEED = 1337;

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
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = overrides[key] ?? 50));
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

function traitsFor(ids: readonly string[]): Trait[] {
  return ids.map((id) => {
    const trait = TRAIT_POOL.find((t) => t.id === id);
    if (!trait) throw new Error(`Unknown trait id: ${id}`);
    return trait;
  });
}

/** Deep-red-on-black material sets — one per founding bloodline, tuned so bred
 * descendants (inheritColorScheme blends + drifts hue/lightness) stay in family. */
const CINDERFALL_SCHEME: ChickenColorScheme = {
  body: "#8b0000",
  hackle: "#6b0000",
  wings: "#111111",
  tail: "#141414",
  comb: "#a30000",
  beak: "#1a1a1a",
  shanks: "#1a1a1a",
  pattern: "SOLID",
  patternColor: "#0d0d0d",
};

const EMBER_WARD_SCHEME: ChickenColorScheme = {
  body: "#7a1010",
  hackle: "#0d0d0d",
  wings: "#5c0d0d",
  tail: "#0d0d0d",
  comb: "#4a0808",
  beak: "#141414",
  shanks: "#161616",
  pattern: "BARRED",
  patternColor: "#8b0000",
};

const GARNET_VALE_SCHEME: ChickenColorScheme = {
  body: "#900f0f",
  hackle: "#151515",
  wings: "#131313",
  tail: "#7a0d0d",
  comb: "#a30000",
  beak: "#171717",
  shanks: "#151515",
  pattern: "MOTTLED",
  patternColor: "#0d0d0d",
};

type Founder = {
  name: string;
  sex: "rooster" | "hen";
  iv: StatBlock;
  physical: PhysicalBlock;
  mutations: MutationGenome;
  traits: Trait[];
  colorScheme: ChickenColorScheme;
  bloodlineName: string;
};

const FOUNDERS: readonly Founder[] = [
  // Cinderfall — glass-cannon attacker line: power/agility up, defense down.
  {
    name: "Vulcan",
    sex: "rooster",
    iv: statBlock({ power: 82, speed: 60, stamina: 45, defense: 40, accuracy: 55, agility: 78 }),
    physical: physicalBlock({ legLength: 1.3, chest: 1.1, bodyGirth: 0.85 }),
    mutations: { iron_spurs: { carrier: true, expressed: false } },
    traits: traitsFor(["glass-cannon", "heavy-striker"]),
    colorScheme: CINDERFALL_SCHEME,
    bloodlineName: "Cinderfall",
  },
  {
    name: "Scarlet",
    sex: "hen",
    iv: statBlock({ power: 70, speed: 65, stamina: 50, defense: 48, accuracy: 60, agility: 72 }),
    physical: physicalBlock({ legLength: 1.2, chest: 1.05 }),
    mutations: {},
    traits: traitsFor(["quick-starter"]),
    colorScheme: CINDERFALL_SCHEME,
    bloodlineName: "Cinderfall",
  },
  // Ember Ward — tank line: stamina/defense up, speed down. Founding hen carries the roster's only expressed mutation.
  {
    name: "Titan",
    sex: "rooster",
    iv: statBlock({ power: 55, speed: 40, stamina: 85, defense: 80, accuracy: 50, agility: 42 }),
    physical: physicalBlock({ bodyGirth: 1.45, chest: 1.4, legLength: 0.8 }),
    mutations: {},
    traits: traitsFor(["iron-stamina", "survivor"]),
    colorScheme: EMBER_WARD_SCHEME,
    bloodlineName: "Ember Ward",
  },
  {
    name: "Garnetta",
    sex: "hen",
    iv: statBlock({ power: 50, speed: 45, stamina: 78, defense: 75, accuracy: 55, agility: 48 }),
    physical: physicalBlock({ bodyGirth: 1.35, chest: 1.3, legLength: 0.85 }),
    mutations: {
      giant: { carrier: true, expressed: true },
      iron_spurs: { carrier: true, expressed: false },
    },
    traits: traitsFor(["calm"]),
    colorScheme: EMBER_WARD_SCHEME,
    bloodlineName: "Ember Ward",
  },
  // Garnet Vale — balanced control line: no seeded mutation, mid stats across the board.
  {
    name: "Ronin",
    sex: "rooster",
    iv: statBlock({ power: 60, speed: 62, stamina: 58, defense: 55, accuracy: 65, agility: 60 }),
    physical: physicalBlock({}),
    mutations: {},
    traits: traitsFor(["counter-fighter"]),
    colorScheme: GARNET_VALE_SCHEME,
    bloodlineName: "Garnet Vale",
  },
  {
    name: "Sable",
    sex: "hen",
    iv: statBlock({ power: 58, speed: 60, stamina: 60, defense: 58, accuracy: 62, agility: 58 }),
    physical: physicalBlock({}),
    mutations: {},
    traits: [],
    colorScheme: GARNET_VALE_SCHEME,
    bloodlineName: "Garnet Vale",
  },
];

/** Everything a chicken record needs from its parents, ahead of id/name/generation/age assignment. */
type Genetics = {
  iv: StatBlock;
  physical: PhysicalBlock;
  mutations: MutationGenome;
  traits: Trait[];
  colorScheme: ChickenColorScheme;
};

type Bred = Genetics & {
  id: string;
  name: string;
  sex: "rooster" | "hen";
  generation: number;
  fatherId: string;
  motherId: string;
  bloodlineId: string;
  bloodlineName: string;
};

function breed(father: Genetics, mother: Genetics, rng: Rng): Genetics {
  return {
    iv: inheritStatBlock(father.iv, mother.iv, rng),
    physical: inheritPhysicalBlock(father.physical, mother.physical, rng),
    mutations: inheritMutations(father.mutations, mother.mutations, rng),
    traits: inheritTraits(father.traits, mother.traits, rng),
    colorScheme: inheritColorScheme(father.colorScheme, mother.colorScheme, rng),
  };
}

const FIGHTING_STYLE_CYCLE: readonly FightingStyle[] = ["aggressive", "counter", "endurance", "balanced"];

const GEN_META: readonly { age: number; growthStage: GrowthStage }[] = [
  { age: 6, growthStage: "senior" }, // gen0 founders
  { age: 4, growthStage: "prime" }, // gen1
  { age: 2, growthStage: "adult" }, // gen2
  { age: 1, growthStage: "young_adult" }, // gen3
];

async function main() {
  const player = await getOrCreatePlayer();
  const rng = mulberry32(SEED);

  const deletedChickens = await prisma.chicken.deleteMany({ where: { playerId: player.id } });
  const deletedEggs = await prisma.egg.deleteMany({ where: { playerId: player.id } });
  console.log(`Cleared ${deletedChickens.count} chickens and ${deletedEggs.count} eggs for player ${player.id}.`);

  const bloodlineIds: Record<string, string> = {
    Cinderfall: randomUUID(),
    "Ember Ward": randomUUID(),
    "Garnet Vale": randomUUID(),
  };

  const all: Bred[] = [];
  let styleIdx = 0;
  const nextStyle = () => FIGHTING_STYLE_CYCLE[styleIdx++ % FIGHTING_STYLE_CYCLE.length];

  // --- Gen0: the six founders, exactly as authored above. ---
  const gen0: Record<string, Bred> = {};
  for (const f of FOUNDERS) {
    const rec: Bred = {
      id: randomUUID(),
      name: f.name,
      sex: f.sex,
      generation: 0,
      fatherId: "",
      motherId: "",
      bloodlineId: bloodlineIds[f.bloodlineName],
      bloodlineName: f.bloodlineName,
      iv: f.iv,
      physical: f.physical,
      mutations: f.mutations,
      traits: f.traits,
      colorScheme: f.colorScheme,
    };
    gen0[f.name] = rec;
    all.push(rec);
  }

  // --- Round-robin cross plan for gen1–gen3: A-rooster x B-hen, B-rooster x
  // C-hen, C-rooster x A-hen. Avoids ever breeding two siblings together
  // while still keeping each line's bloodlineId (father's) moving forward. ---
  const CROSS_PLAN: readonly { fatherLine: string; motherLine: string; sonName: string; daughterName: string }[][] = [
    [
      { fatherLine: "Cinderfall", motherLine: "Ember Ward", sonName: "Ember", daughterName: "Crimsonia" },
      { fatherLine: "Ember Ward", motherLine: "Garnet Vale", sonName: "Bastion", daughterName: "Ironrose" },
      { fatherLine: "Garnet Vale", motherLine: "Cinderfall", sonName: "Katana", daughterName: "Onyxia" },
    ],
    [
      { fatherLine: "Cinderfall", motherLine: "Ember Ward", sonName: "Blaze", daughterName: "Rubellite" },
      { fatherLine: "Ember Ward", motherLine: "Garnet Vale", sonName: "Redoubt", daughterName: "Vermilia" },
      { fatherLine: "Garnet Vale", motherLine: "Cinderfall", sonName: "Shogun", daughterName: "Noira" },
    ],
    [
      { fatherLine: "Cinderfall", motherLine: "Ember Ward", sonName: "Wildfire", daughterName: "Carmine" },
      { fatherLine: "Ember Ward", motherLine: "Garnet Vale", sonName: "Stalwart", daughterName: "Rosewood" },
      { fatherLine: "Garnet Vale", motherLine: "Cinderfall", sonName: "Daimyo", daughterName: "Umbra" },
    ],
  ];

  // Latest rooster/hen produced so far per bloodline — seeds each generation's crosses.
  const latestRooster: Record<string, Bred> = {
    Cinderfall: gen0.Vulcan,
    "Ember Ward": gen0.Titan,
    "Garnet Vale": gen0.Ronin,
  };
  const latestHen: Record<string, Bred> = {
    Cinderfall: gen0.Scarlet,
    "Ember Ward": gen0.Garnetta,
    "Garnet Vale": gen0.Sable,
  };

  for (let genIndex = 0; genIndex < CROSS_PLAN.length; genIndex++) {
    const generation = genIndex + 1;
    const nextRooster: Record<string, Bred> = {};
    const nextHen: Record<string, Bred> = {};

    for (const { fatherLine, motherLine, sonName, daughterName } of CROSS_PLAN[genIndex]) {
      const father = latestRooster[fatherLine];
      const mother = latestHen[motherLine];

      const son = breed(father, mother, rng);
      const sonRec: Bred = {
        ...son,
        id: randomUUID(),
        name: sonName,
        sex: "rooster",
        generation,
        fatherId: father.id,
        motherId: mother.id,
        bloodlineId: father.bloodlineId,
        bloodlineName: fatherLine,
      };

      const daughter = breed(father, mother, rng);
      const daughterRec: Bred = {
        ...daughter,
        id: randomUUID(),
        name: daughterName,
        sex: "hen",
        generation,
        fatherId: father.id,
        motherId: mother.id,
        bloodlineId: father.bloodlineId,
        bloodlineName: fatherLine,
      };

      all.push(sonRec, daughterRec);
      nextRooster[fatherLine] = sonRec;
      nextHen[fatherLine] = daughterRec;
    }

    Object.assign(latestRooster, nextRooster);
    Object.assign(latestHen, nextHen);
  }

  // --- Persist, then print a summary so mutation/trait spread is visible without a DB round-trip. ---
  for (const rec of all) {
    const { age, growthStage } = GEN_META[rec.generation];
    await prisma.chicken.create({
      data: {
        id: rec.id,
        playerId: player.id,
        name: rec.name,
        sex: rec.sex,
        generation: rec.generation,
        fatherId: rec.fatherId || null,
        motherId: rec.motherId || null,
        bloodlineId: rec.bloodlineId,
        iv: rec.iv,
        ev: zeroStatBlock(), // fresh stock, EVs earned through training — zero on creation like every other seed script
        physical: rec.physical,
        mutations: rec.mutations,
        traits: rec.traits,
        age,
        health: 100,
        energy: 100,
        record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
        status: "active",
        growthStage,
        fightingStyle: nextStyle(),
        colorScheme: rec.colorScheme,
        injured: false,
      },
    });
  }

  console.log(`\nSeeded ${all.length} chickens across 4 generations for player ${player.id}:\n`);
  for (const rec of all) {
    const expressed = Object.entries(rec.mutations)
      .filter(([, state]) => state.expressed)
      .map(([id]) => id);
    const traitNames = rec.traits.map((t) => t.name);
    console.log(
      `  gen${rec.generation} ${rec.sex.padEnd(7)} ${rec.name.padEnd(10)} [${rec.bloodlineName}]` +
        `  mutations=${expressed.length ? expressed.join(",") : "-"}` +
        `  traits=${traitNames.length ? traitNames.join(",") : "-"}`
    );
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
