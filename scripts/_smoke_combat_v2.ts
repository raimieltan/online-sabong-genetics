import { generateRandomChicken } from "../lib/chickenGenerator";
import { simulateFight } from "../lib/combat";

function seededRng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const a = generateRandomChicken({ sex: "rooster", name: "A" });
const b = generateRandomChicken({ sex: "rooster", name: "B" });

const r1 = simulateFight(a, b, seededRng(42));
const r2 = simulateFight(a, b, seededRng(42));

console.log("turns:", r1.totalTurns, "winner:", r1.winnerId === a.id ? "A" : "B", "reason:", r1.outcomeReason);
console.log("deterministic replay matches:", JSON.stringify(r1.log) === JSON.stringify(r2.log));
console.log("sample turn 1:", JSON.stringify(r1.log[0]));
console.log("experienceGained A:", JSON.stringify(r1.experienceGained?.[a.id]));
console.log("analysis A:\n", r1.analysis?.[a.id]);
console.log("newInjuries:", JSON.stringify(r1.newInjuries));
console.log("conditionDelta:", JSON.stringify(r1.conditionDelta));

// Quick balance sanity: run N fights for a few archetype pairings, print win rates.
function runN(n: number, styleA: string, styleB: string) {
  let winsA = 0;
  for (let i = 0; i < n; i++) {
    const ca = generateRandomChicken({ sex: "rooster" });
    const cb = generateRandomChicken({ sex: "rooster" });
    (ca as any).fightingStyle = styleA;
    (cb as any).fightingStyle = styleB;
    const res = simulateFight(ca, cb, seededRng(1000 + i));
    if (res.winnerId === ca.id) winsA++;
  }
  console.log(`${styleA} vs ${styleB}: ${winsA}/${n} wins for ${styleA}`);
}

runN(50, "aggressive", "endurance");
runN(50, "counter", "aggressive");
runN(50, "endurance", "counter");
runN(50, "balanced", "balanced");
