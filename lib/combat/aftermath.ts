import type { CombatResult, InjuryRecord } from "../types";

/**
 * Post-fight morale/stress/confidence deltas (spec §44, §46-47) — separate
 * from `applyFightOutcome`'s record/health/experience math so the emotional
 * layer can be reasoned about (and tested) on its own.
 */
export type BattleAftermath = {
  confidence: number;
  morale: number;
  stress: number;
  battleHardening: number;
};

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

/**
 * `chicken`'s side of `result` — `wasInjured`/`newInjuries` come from the
 * caller (`applyFightOutcome` already derives them) so this never re-reads
 * the log itself.
 */
export function battleAftermath(
  chicken: { confidence?: number; morale?: number; stress?: number; battleHardening?: number },
  result: CombatResult,
  chickenId: string,
  wasInjured: boolean,
  newInjuries: InjuryRecord[]
): BattleAftermath {
  const won = result.winnerId === chickenId;
  const worstInjury = newInjuries.reduce<InjuryRecord["severity"] | undefined>((worst, inj) => {
    const rank = { minor: 1, serious: 2, career_altering: 3 } as const;
    if (!worst || rank[inj.severity] > rank[worst]) return inj.severity;
    return worst;
  }, undefined);

  const confidence = clamp(
    (chicken.confidence ?? 50) +
      (won ? 6 : -8) +
      (wasInjured ? (worstInjury === "career_altering" ? -20 : worstInjury === "serious" ? -12 : -5) : 0)
  );

  const morale = clamp(
    (chicken.morale ?? 75) +
      (won ? 5 : -7) +
      (wasInjured ? -6 : 0)
  );

  const stress = clamp(
    (chicken.stress ?? 0) +
      (won ? -3 : 8) +
      (wasInjured ? 12 : 0) +
      (result.outcomeReason === "critical_injury" ? 10 : 0)
  );

  const survivedCleanly = !newInjuries.some((i) => i.severity === "career_altering");
  const battleHardening = (chicken.battleHardening ?? 0) + (survivedCleanly ? 1 : 0);

  return { confidence, morale, stress, battleHardening };
}
