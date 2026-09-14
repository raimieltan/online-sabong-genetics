/**
 * One-off seed script: creates two breeding-ready bloodline pairs (rooster +
 * hen each, 4 chickens total) — one solid black, one solid white — with
 * balanced (equal-across-the-board) stats for testing color inheritance and
 * material rendering. Every one of the 7 color materials plus patternColor
 * is pinned to the same hex per chicken (no per-individual jitter), so the
 * black/white is exact rather than drifted.
 *
 * Run with: yarn seed:monochrome
 */
import { randomUUID } from "node:crypto";

import { prisma } from "../lib/db";
import { getOrCreatePlayer } from "../lib/player";
import {
  GENETIC_STAT_KEYS,
  PHYSICAL_TRAIT_KEYS,
  type ChickenColorScheme,
  type FightingStyle,
  type PhysicalBlock,
  type StatBlock,
} from "../lib/types";

const BALANCED_IV = 65; // mid-range and equal across every stat — no lopsided bias

function balancedStatBlock(): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = BALANCED_IV));
  return block;
}

function zeroStatBlock(): StatBlock {
  const block = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => (block[key] = 0));
  return block;
}

/** Baseline (all-1) physical block — same neutral proportions gen-0 stock defaults to. */
function baselinePhysicalBlock(): PhysicalBlock {
  const block = {} as PhysicalBlock;
  PHYSICAL_TRAIT_KEYS.forEach((key) => (block[key] = 1));
  return block;
}

function solidColorScheme(hex: string): ChickenColorScheme {
  return {
    body: hex,
    hackle: hex,
    wings: hex,
    tail: hex,
    comb: hex,
    beak: hex,
    shanks: hex,
    pattern: "SOLID",
    patternColor: hex,
  };
}

const PAIRS: readonly { rooster: string; hen: string; hex: string; style: FightingStyle }[] = [
  { rooster: "Onyx", hen: "Raven", hex: "#0d0d0d", style: "balanced" },
  { rooster: "Alabaster", hen: "Ivory", hex: "#f5f5f5", style: "balanced" },
];

async function main() {
  const player = await getOrCreatePlayer();
  const created: string[] = [];

  for (const { rooster, hen, hex, style } of PAIRS) {
    const bloodlineId = randomUUID();
    const colorScheme = solidColorScheme(hex);

    for (const [chickenName, sex] of [
      [rooster, "rooster"],
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
          iv: balancedStatBlock(),
          ev: zeroStatBlock(),
          physical: baselinePhysicalBlock(),
          mutations: {},
          traits: [],
          age: 2,
          health: 100,
          energy: 100,
          record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
          status: "active",
          growthStage: "adult",
          fightingStyle: style,
          colorScheme,
          injured: false,
        },
      });
      created.push(`${chickenName} (${sex}, ${hex})`);
    }
  }

  console.log(`Seeded ${created.length} monochrome chickens for player ${player.id}:`);
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
