import { deriveBehaviorProfile } from "../lib/combat/behavior";
import { simulateBattle, type CoachFn } from "../lib/combat/simulator";
import { autoCoachPolicy } from "../lib/combat/autoCoach";
import { generateRandomChicken } from "../lib/chickenGenerator";
import type { Chicken, FightingStyle } from "../lib/types";

/**
 * Validation-gate harness (spec: "the only thing that gets built before a
 * decision"). Throwaway CLI tool, not wired into the app or `yarn test` —
 * same status as scripts/balance-sim.ts. Run with:
 *   node --import ./scripts/test-ts-loader.mjs scripts/validation-gate-sim.ts
 */

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** A deliberately *weaker* fighter (lower fixed stats) than the opponent, so Test B/D measure coaching quality, not stat parity. */
function buildFighter(style: FightingStyle, name: string, iv: number, ev: number): Chicken {
  const c = generateRandomChicken({ sex: "rooster", name });
  const ivBlock = { ...c.iv };
  const evBlock = { ...c.ev };
  (Object.keys(ivBlock) as (keyof typeof ivBlock)[]).forEach((k) => {
    ivBlock[k] = iv;
    evBlock[k] = ev;
  });
  return { ...c, iv: ivBlock, ev: evBlock, fightingStyle: style, traits: [], behavior: deriveBehaviorProfile(style, []) };
}

/** A scripted "good coaching" heuristic — reads the opponent's context state and this fighter's own state, same observation surface a human coach would have. */
const readerCoach: CoachFn = (obs) => {
  if (obs.own.commandPoints < 1) return null;
  if (obs.own.mentalState === "desperate" || obs.own.mentalState === "exhausted") return "RECOVER";
  if (obs.opponentContextState === "PRESSURING" && obs.own.momentum < 0) return "WAIT";
  if (obs.opponentContextState === "EXHAUSTED" || obs.opponentContextState === "VULNERABLE") return "PRESS";
  return null;
};

function runTrial(coachForWeaker: CoachFn | undefined, trials: number, seedBase: number): number {
  let weakerWins = 0;
  for (let i = 0; i < trials; i++) {
    const weaker = buildFighter("counter", "Weaker", 55, 30);
    const stronger = buildFighter("aggressive", "Stronger", 80, 60);
    const result = simulateBattle(weaker, stronger, seededRng(seedBase + i), {
      coachA: coachForWeaker,
      coachB: autoCoachPolicy(),
    });
    if (result.winnerId === weaker.id) weakerWins += 1;
  }
  return weakerWins / trials;
}

const TRIALS = 500;
const manualWinRate = runTrial(readerCoach, TRIALS, 1000);
const autoWinRate = runTrial(autoCoachPolicy(), TRIALS, 1000);

console.log(`Test B — manual-coach win rate: ${(manualWinRate * 100).toFixed(1)}%`);
console.log(`Test B — auto-coach win rate:   ${(autoWinRate * 100).toFixed(1)}%`);
console.log(
  manualWinRate > autoWinRate
    ? "PASS — manual coaching beats Auto-Coach at equal-ish rooster strength"
    : "FAIL — manual coaching does not beat Auto-Coach; revisit scoring/compliance tuning before Phase C"
);

/**
 * Test D (spec): a legible chain — opponent overcommits, weaker fighter's
 * momentum swings, fight becomes genuinely competitive — not a coinflip and
 * not a guaranteed "press WAIT, magically win." This traces one manual-coach
 * trial's log and reports whether the weaker fighter was ever VULNERABLE/
 * DISADVANTAGE before ending the fight ADVANTAGE/DOMINANT or winning outright.
 */
function traceComeback(seed: number): void {
  const weaker = buildFighter("counter", "Weaker", 55, 30);
  const stronger = buildFighter("aggressive", "Stronger", 80, 60);
  const result = simulateBattle(weaker, stronger, seededRng(seed), { coachA: readerCoach, coachB: autoCoachPolicy() });
  const weakerWasBehind = result.log.some((e) => {
    const weakerIsAttacker = e.attackerId === weaker.id;
    const weakerState = weakerIsAttacker ? e.attackerState : e.defenderState;
    return weakerState === "VULNERABLE" || weakerState === "DISADVANTAGE";
  });
  const won = result.winnerId === weaker.id;
  console.log(`Test D trace (seed ${seed}): weaker fighter won = ${won}, was behind at some point = ${weakerWasBehind}, total turns = ${result.totalTurns}`);
  console.log(won ? "  -> supports a believable comeback path; inspect the log manually for the full chain" : "  -> no comeback this seed; try other seeds before concluding Test D fails");
}

traceComeback(2000);
traceComeback(2001);
traceComeback(2002);

console.log("\nTest A (Reading) and Test C (Physical identity) are not automated by this script:");
console.log("  Test A — run the app manually, watch a fight with tells enabled, and check whether you predict the AI's intent before it resolves.");
console.log("  Test C — already checkable via scripts/balance-sim.ts against resolvePhysicalProfile() outputs; run it with a massive vs a long-legged same-style pair and confirm the action-mix differs, not just the numbers.");
