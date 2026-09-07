import { tickInjuryRecovery } from "../combat/injuries";
import type { InjuryRecord, StatBlock } from "../types";

export { tickInjuryRecovery };

/** True while any non-permanent injury hasn't finished healing (drives Chicken.injured). */
export function hasActiveInjury(injuries: readonly InjuryRecord[]): boolean {
  return injuries.some((i) => !i.permanent && i.recoveryRemaining > 0);
}

/** Permanent (career-altering) injuries stack into a lasting stat penalty (spec §27) — rare, and never fully reversible. */
export function permanentStatPenalty(injuries: readonly InjuryRecord[]): Partial<StatBlock> {
  const penalty: Partial<StatBlock> = {};
  for (const injury of injuries) {
    if (!injury.permanent || !injury.statPenalty) continue;
    for (const [key, value] of Object.entries(injury.statPenalty)) {
      const k = key as keyof StatBlock;
      penalty[k] = (penalty[k] ?? 0) + (value ?? 0);
    }
  }
  return penalty;
}
