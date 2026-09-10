import type { Chicken } from "../types";
import type { BossListEntry } from "./types";

/** Intentionally broad guidance, never a hidden win probability. */
export function buildMatchupAssessment(chicken: Chicken, boss: BossListEntry["boss"]): "FAVORABLE" | "GOOD MATCHUP" | "EVEN" | "RISKY" | "BAD MATCHUP" | "LOW CONDITION" {
  if ((chicken.condition ?? 100) < 55) return "LOW CONDITION";
  const fighterExperience = chicken.record.wins + chicken.record.koTko;
  const bossPressure = boss.preview.strength + boss.preview.speed + boss.preview.endurance;
  const fighterProfile = (chicken.condition ?? 100) / 10 + fighterExperience / 3;
  if (fighterProfile > bossPressure + 9) return "FAVORABLE";
  if (fighterProfile > bossPressure + 3) return "GOOD MATCHUP";
  if (fighterProfile < bossPressure - 5) return "BAD MATCHUP";
  if (fighterProfile < bossPressure - 1) return "RISKY";
  return "EVEN";
}

export function campaignConsequence(won: boolean, boss: BossListEntry["boss"], firstClear: boolean) {
  if (!won) return { headline: `${boss.name.toUpperCase()} HOLDS THE PIT`, copy: "The report points to patterns worth changing before the next attempt.", reputation: 0 };
  const title = boss.presentation.nodeType === "championship" ? `${boss.name.toUpperCase()} FALLS` : firstClear ? "A NEW NAME ON THE ROAD" : "THE CROWD REMEMBERS";
  return { headline: title, copy: firstClear ? `${boss.name}'s run is over. The circuit is beginning to watch your fighter.` : `${boss.name} has been beaten again. Your reputation continues to grow.`, reputation: Math.round(boss.rewards.firstClearCredits / 10) };
}
