/**
 * One-off seed script: creates 5 god-tier bloodlines (rooster + hen pair each,
 * 10 chickens total) for breeding-stock testing. Maxed IVs/EVs, every trait
 * in the pool, and the widest mutation combo the incompatibility graph in
 * lib/mutations.ts allows expressed together (giant + extra_toed + albino —
 * two_headed conflicts with extra_toed, luminescent conflicts with albino,
 * so those two are left out of this particular combo).
 *
 * Run with: yarn god-seed
 */
import { randomUUID } from "node:crypto";

import { prisma } from "../lib/db";
import { getOrCreatePlayer } from "../lib/player";
import { COLOR_PALETTES } from "../lib/roosterGenerator";
import { TRAIT_POOL } from "../lib/traits";
import {
  FIGHTING_STYLES,
  GENETIC_STAT_KEYS,
  PHYSICAL_TRAIT_KEYS,
  PHYSICAL_TRAIT_RANGE,
  type FightingStyle,
  type MutationGenome,
  type PhysicalBlock,
  type StatBlock,
} from "../lib/types";

const GOD_IV = 99; // MAX_STAT clamp in lib/genetics.ts inheritStat
const GOD_EV = 100; // MAX_EV in lib/training.ts

function godStatBlock(): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = GOD_IV));
  return block;
}

function godEvBlock(): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = GOD_EV));
  return block;
}

/** Maxed body proportions — biggest, longest-reaching rig the sliders allow. */
function godPhysicalBlock(): PhysicalBlock {
  const block = {} as PhysicalBlock;
  PHYSICAL_TRAIT_KEYS.forEach((key) => (block[key] = PHYSICAL_TRAIT_RANGE[key].max));
  return block;
}

/** giant + extra_toed + albino: the largest fully-pairwise-compatible expressed set. */
function godMutationGenome(): MutationGenome {
  return {
    giant: { carrier: true, expressed: true },
    extra_toed: { carrier: true, expressed: true },
    albino: { carrier: true, expressed: true },
  };
}

const BLOODLINES: readonly { name: string; hen: string; style: FightingStyle }[] = [
  { name: "Zeus", hen: "Hera", style: "aggressive" },
  { name: "Odin", hen: "Frigg", style: "counter" },
  { name: "Ares", hen: "Athena", style: "balanced" },
  { name: "Thor", hen: "Freya", style: "endurance" },
  { name: "Apollo", hen: "Artemis", style: "aggressive" },
];

async function main() {
  const player = await getOrCreatePlayer();
  const created: string[] = [];

  for (let i = 0; i < BLOODLINES.length; i++) {
    const { name, hen, style } = BLOODLINES[i];
    const palette = COLOR_PALETTES[i % COLOR_PALETTES.length];
    const bloodlineId = randomUUID();

    for (const [chickenName, sex] of [
      [name, "rooster"],
      [hen, "hen"],
    ] as const) {
      const id = randomUUID();
      await prisma.chicken.create({
        data: {
          id,
          playerId: player.id,
          name: chickenName,
          sex,
          generation: 0,
          fatherId: null,
          motherId: null,
          bloodlineId,
          iv: godStatBlock(),
          ev: godEvBlock(),
          physical: godPhysicalBlock(),
          mutations: godMutationGenome(),
          traits: [...TRAIT_POOL],
          age: 4,
          health: 100,
          energy: 100,
          record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
          status: "active",
          growthStage: "prime",
          fightingStyle: style,
          colorScheme: palette,
          injured: false,
        },
      });
      created.push(`${chickenName} (${sex})`);
    }
  }

  console.log(`Seeded ${created.length} god chickens for player ${player.id}:`);
  created.forEach((c) => console.log(`  - ${c}`));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
