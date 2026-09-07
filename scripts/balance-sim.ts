import { deriveBehaviorProfile } from "../lib/combat/behavior";
import { simulateFight } from "../lib/combat.ts";
import { generateRandomChicken } from "../lib/chickenGenerator";
import { FIGHTING_STYLES, type Chicken, type CombatAction, type FightingStyle } from "../lib/types";

/**
 * Throwaway tuning/verification harness — not wired into the app or test
 * suite. Runs many battles per fightingStyle matchup with equal-stat
 * chickens (only `behavior` differs) and reports win rate + action-mix per
 * side, so scoreAction()/ARCHETYPE_PROFILES tuning is measured, not guessed.
 */

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const FIXED_IV = 70;
const FIXED_EV = 50;

/** Builds a chicken with fixed, equal stats and the given fightingStyle actually wired through to `behavior`. */
function buildFighter(style: FightingStyle, name: string): Chicken {
  const c = generateRandomChicken({ sex: "rooster", name });
  const iv = { ...c.iv };
  const ev = { ...c.ev };
  (Object.keys(iv) as (keyof typeof iv)[]).forEach((k) => {
    iv[k] = FIXED_IV;
    ev[k] = FIXED_EV;
  });
  return {
    ...c,
    iv,
    ev,
    fightingStyle: style,
    traits: [],
    behavior: deriveBehaviorProfile(style, []),
  };
}

type ActionTally = Partial<Record<CombatAction, number>>;

/** Each fighter always has exactly one action per logged turn — either as the resolved attacker or the reactive defender. */
function tallyActions(log: ReturnType<typeof simulateFight>["log"], id: string): ActionTally {
  const tally: ActionTally = {};
  for (const entry of log) {
    const action = entry.attackerId === id ? entry.attackerAction : entry.defenderId === id ? entry.defenderAction : null;
    if (action) tally[action] = (tally[action] ?? 0) + 1;
  }
  return tally;
}

function formatMix(tally: ActionTally): string {
  const total = Object.values(tally).reduce((s, v) => s + (v ?? 0), 0) || 1;
  return Object.entries(tally)
    .sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
    .map(([action, count]) => `${action}:${Math.round(((count ?? 0) / total) * 100)}%`)
    .join(" ");
}

function runMatchup(styleA: FightingStyle, styleB: FightingStyle, n: number) {
  let winsA = 0;
  let winsB = 0;
  let timeouts = 0;
  const mixA: ActionTally = {};
  const mixB: ActionTally = {};

  for (let i = 0; i < n; i++) {
    const a = buildFighter(styleA, "A");
    const b = buildFighter(styleB, "B");
    const result = simulateFight(a, b, seededRng(i * 7919 + 13));

    if (result.winnerId === a.id) winsA++;
    else if (result.winnerId === b.id) winsB++;
    if (result.outcomeReason === "timeout") timeouts++;

    const tA = tallyActions(result.log, a.id);
    const tB = tallyActions(result.log, b.id);
    for (const [k, v] of Object.entries(tA)) mixA[k as CombatAction] = (mixA[k as CombatAction] ?? 0) + (v ?? 0);
    for (const [k, v] of Object.entries(tB)) mixB[k as CombatAction] = (mixB[k as CombatAction] ?? 0) + (v ?? 0);
  }

  const winPctA = Math.round((winsA / n) * 100);
  const winPctB = Math.round((winsB / n) * 100);
  console.log(`\n${styleA} vs ${styleB}  (n=${n})`);
  console.log(`  win rate: ${styleA}=${winPctA}%  ${styleB}=${winPctB}%  timeouts=${timeouts}`);
  console.log(`  ${styleA} action mix: ${formatMix(mixA)}`);
  console.log(`  ${styleB} action mix: ${formatMix(mixB)}`);
}

const N = Number(process.argv[2] ?? 80);

console.log(`Running balance sim, ${N} fights per matchup...`);

for (let i = 0; i < FIGHTING_STYLES.length; i++) {
  for (let j = i; j < FIGHTING_STYLES.length; j++) {
    runMatchup(FIGHTING_STYLES[i], FIGHTING_STYLES[j], N);
  }
}
