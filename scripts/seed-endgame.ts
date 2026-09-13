/**
 * Promotes the current local player's entire save to an endgame sandbox.
 * Names, bloodlines, appearance, and roster membership stay intact while
 * progression systems are maxed. Run with: yarn seed:endgame
 */
import { prisma } from "../lib/db";
import { EMPTY_COMBAT_TELEMETRY } from "../lib/combat/evolution";
import { getOrCreatePlayer } from "../lib/player";
import { PVE_BOSS_ORDER } from "../lib/pve/types";
import { GENETIC_STAT_KEYS, type CombatCareerState, type StatBlock } from "../lib/types";

const ENDGAME_XP = 10_000;
const FLOW_STATE_BEHAVIOR = {
  aggression: 0.28,
  caution: 0.82,
  patience: 0.96,
  riskTolerance: 0.32,
  pressurePreference: 0.24,
  counterPreference: 1,
  recoveryPreference: 0.58,
  persistence: 0.78,
};

function filledStats(value: number): StatBlock {
  const stats = {} as StatBlock;
  GENETIC_STAT_KEYS.forEach((key) => { stats[key] = value; });
  return stats;
}

function endgameCareer(): CombatCareerState {
  return {
    version: 1,
    fightsProcessed: 120,
    telemetry: {
      ...EMPTY_COMBAT_TELEMETRY,
      heavyHitsTaken: 180, lightHitsTaken: 420, clashesWon: 360, clashesLost: 80,
      knockdownsTaken: 35, knockdownsRecovered: 32, fightsWon: 105, fightsLost: 15,
      comebackWins: 28, dominantWins: 62, closeLosses: 8,
      damageTakenWhilePressing: 1_500, damageTakenWhileRetreating: 480,
      successfulCounters: 260, failedCounters: 40, successfulChases: 220,
      punishedChases: 30, lowStaminaClashesWon: 95, retaliationDamageAfterHit: 1_200,
      successfulDisengagements: 180, timesIntimidated: 5, strongerOpponentsFaced: 45,
      openingClashesWon: 230, openingClashesLost: 55, lateFightPerformance: 900,
      playerCommandCompliance: 420, playerCommandSuccess: 380, playerCommandsIssued: 450,
    },
    evolutionTraits: [
      { id: "battle-hardened", name: "Battle Hardened", level: 3, stage: "Unbreakable", progress: 100, active: true, advantages: ["Extreme retaliation", "Flinch resistance"], tradeoffs: [] },
      { id: "counter-instinct", name: "Counter Instinct", level: 3, stage: "Flow Reader", progress: 100, active: true, advantages: ["Reads committed attacks", "Counter timing"], tradeoffs: [] },
      { id: "deep-reserves", name: "Deep Reserves", level: 3, stage: "Second Wind", progress: 100, active: true, advantages: ["Fatigue resistance", "Late-fight pressure"], tradeoffs: [] },
      { id: "comeback-fighter", name: "Comeback Fighter", level: 3, stage: "Never Counted Out", progress: 100, active: true, advantages: ["Confidence while behind"], tradeoffs: [] },
      { id: "bully", name: "Bully", level: 3, stage: "Pressure King", progress: 100, active: true, advantages: ["Relentless pressure"], tradeoffs: [] },
      { id: "giant-killer", name: "Giant Killer", level: 3, stage: "Legend Slayer", progress: 100, active: true, advantages: ["Excels against stronger opponents"], tradeoffs: [] },
    ],
    signatures: [
      { id: "relentless-rush", name: "Relentless Rush", progress: 100, developed: true, attempts: 300, successes: 240 },
      { id: "sky-counter", name: "Sky Counter", progress: 100, developed: true, attempts: 250, successes: 210 },
      { id: "ghost-step", name: "Ghost Step", progress: 100, developed: true, attempts: 280, successes: 245 },
      { id: "second-wind", name: "Second Wind", progress: 100, developed: true, attempts: 180, successes: 165 },
    ],
    rivalries: [],
    awakenings: [
      { id: "unbreakable", name: "Unbreakable", unlocked: true, triggerCount: 25 },
      { id: "berserker", name: "Berserker", unlocked: true, triggerCount: 25 },
      { id: "flow-state", name: "Flow State", unlocked: true, triggerCount: 25 },
      { id: "second-wind", name: "Second Wind", unlocked: true, triggerCount: 25 },
      { id: "apex", name: "Apex", unlocked: true, triggerCount: 12 },
    ],
    recentDevelopment: [],
  };
}

async function main() {
  const player = await getOrCreatePlayer();
  const chickens = await prisma.chicken.findMany({
    where: { playerId: player.id },
    select: { id: true, sex: true },
  });
  if (!chickens.length) {
    throw new Error("No chickens found. Run yarn seed:god first, then yarn seed:endgame.");
  }

  const now = new Date();
  const maxIv = filledStats(99);
  const maxEv = filledStats(100);
  const maxEffort = filledStats(83);
  const maxPotential = filledStats(100);
  const discovered = Object.fromEntries(GENETIC_STAT_KEYS.map((key) => [key, true]));

  await prisma.$transaction(async (tx) => {
    await tx.player.update({
      where: { id: player.id },
      data: { credits: 1_000_000, tournamentTokens: 10_000 },
    });
    await tx.facility.upsert({
      where: { playerId_type: { playerId: player.id, type: "TRAINING_GYM" } },
      create: { playerId: player.id, type: "TRAINING_GYM", level: 5 },
      update: { level: 5 },
    });
    await tx.facility.upsert({
      where: { playerId_type: { playerId: player.id, type: "CLINIC" } },
      create: { playerId: player.id, type: "CLINIC", level: 4 },
      update: { level: 4 },
    });

    await tx.chicken.updateMany({
      where: { playerId: player.id },
      data: {
        iv: maxIv as object,
        ev: maxEv as object,
        age: 4,
        health: 100,
        energy: 100,
        record: { wins: 105, losses: 15, championships: 12, koTko: 72, decisions: 33 },
        status: "active",
        growthStage: "prime",
        fightingStyle: "counter",
        behavior: FLOW_STATE_BEHAVIOR,
        injured: false,
        experience: { offensive: 800, defensive: 2_500, evasion: 5_000, counter: 5_000, pressure: 500, recovery: 1_500, adaptation: 3_000 },
        condition: 100,
        injuries: [],
        illnesses: [],
        stress: 0,
        morale: 100,
        confidence: 100,
        battleHardening: 100,
        combatCareer: endgameCareer() as object,
        trainingState: { trainingPoints: 100, trainingFatigue: 0, history: [] },
      },
    });

    for (const chicken of chickens.filter((entry) => entry.sex === "rooster")) {
      const training = {
        physicalXP: ENDGAME_XP,
        combatXP: ENDGAME_XP,
        tacticalXP: ENDGAME_XP,
        disciplineXP: ENDGAME_XP,
        recoveryXP: ENDGAME_XP,
        effortSpent: maxEffort as object,
        trainingPotential: maxPotential as object,
        discovered,
        traits: [{ id: "iron_body", grantedAt: now.getTime() }, { id: "fast_learner", grantedAt: now.getTime() }],
        breakthroughs: [],
        traitProgress: { iron_body: 100, fast_learner: 100 },
        specializationProgress: { offense: 100, defense: 100, movement: 100, conditioning: 100 },
      };
      await tx.roosterTraining.upsert({
        where: { chickenId: chicken.id },
        create: { chickenId: chicken.id, ...training },
        update: training,
      });
    }

    for (const bossId of PVE_BOSS_ORDER) {
      await tx.pveProgress.upsert({
        where: { playerId_bossId: { playerId: player.id, bossId } },
        create: { playerId: player.id, bossId, clearCount: 5, firstClearedAt: now, lastClearedAt: now, firstClearChickenId: chickens[0].id },
        update: { clearCount: 5, firstClearedAt: now, lastClearedAt: now, firstClearChickenId: chickens[0].id },
      });
      await tx.pveOpponentHistory.upsert({
        where: { playerId_bossId: { playerId: player.id, bossId } },
        create: { playerId: player.id, bossId, wins: 5, losses: 1, kosFor: 4, kosAgainst: 1, lastFightAt: now },
        update: { wins: 5, losses: 1, kosFor: 4, kosAgainst: 1, lastFightAt: now },
      });
    }
    await tx.pveCampaignState.upsert({
      where: { playerId: player.id },
      create: { playerId: player.id, reputation: 10_000 },
      update: { reputation: 10_000 },
    });
  });

  console.log(`Endgame sandbox ready for player ${player.id}.`);
  console.log(`Maxed ${chickens.length} chickens, ${PVE_BOSS_ORDER.length} bosses, facilities, currencies, training, signatures, and every awakening.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
