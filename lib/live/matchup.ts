import { generateRandomChicken } from "@/lib/chickenGenerator";
import { canFight, generateMatchedOpponent } from "@/lib/combat";
import type { Chicken } from "@/lib/types";

export type LiveMode = "pve" | "pvp" | "exhibition";

export type LiveMatchup = {
  mode: LiveMode;
  chickenA: Chicken;
  chickenB: Chicken;
};

/**
 * Picks the next /live matchup from the player's coop, following the same
 * rules as the original /api/live/next: two owned fighters spar (pvp), one
 * owned fighter takes a generated opponent (pve), or — if nothing in the
 * coop can fight — two fully generated NPCs headline (exhibition) so the
 * feed never goes dark. Shared by /api/live/matchup so betting can be
 * quoted before the fight is simulated.
 */
export function pickLiveMatchup(owned: Chicken[]): LiveMatchup {
  const eligible = owned.filter(canFight);

  if (eligible.length >= 2 && Math.random() < 0.5) {
    const shuffled = [...eligible].sort(() => Math.random() - 0.5);
    return { mode: "pvp", chickenA: shuffled[0], chickenB: shuffled[1] };
  }
  if (eligible.length >= 1) {
    const chickenA = eligible[Math.floor(Math.random() * eligible.length)];
    return { mode: "pve", chickenA, chickenB: generateMatchedOpponent(chickenA) };
  }
  const chickenA = generateRandomChicken({ sex: "rooster" });
  return { mode: "exhibition", chickenA, chickenB: generateMatchedOpponent(chickenA) };
}
