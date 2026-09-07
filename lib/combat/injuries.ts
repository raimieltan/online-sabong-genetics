import type { HitZone, InjuryRecord, InjurySeverity } from "../types";

export type Rng = () => number;

const CRITICAL_INJURY_BASE_CHANCE = 0.5;
const CRITICAL_HIT_ZONES: readonly HitZone[] = ["head", "neck"];

/**
 * Whether a landed crit on a critical zone escalates into a fight-ending
 * critical injury (spec §27, §39) — rare relative to raw KOs, softened by
 * the "survivor" trait and by the defender being fresh rather than fatigued.
 */
export function rollCriticalInjury(params: {
  rng: Rng;
  isCrit: boolean;
  hitZone: HitZone | null;
  hasSurvivorTrait: boolean;
  defenderFatigue: number;
}): boolean {
  const { rng, isCrit, hitZone, hasSurvivorTrait, defenderFatigue } = params;
  if (!isCrit || !hitZone || !CRITICAL_HIT_ZONES.includes(hitZone)) return false;

  let chance = CRITICAL_INJURY_BASE_CHANCE;
  if (hasSurvivorTrait) chance *= 0.5;
  chance *= 1 + (defenderFatigue / 100) * 0.3;

  return rng() < chance;
}

/**
 * Post-battle severity roll for the loser of a decisive fight (spec §27) —
 * most battles produce nothing; a KO or critical-injury ending has a real but
 * still minority chance of leaving a lasting mark, and career-altering
 * injuries stay rare by design.
 */
export function rollInjurySeverity(params: {
  rng: Rng;
  wasCriticalInjury: boolean;
  wasKo: boolean;
  hasSurvivorTrait: boolean;
}): InjurySeverity | null {
  const { rng, wasCriticalInjury, wasKo, hasSurvivorTrait } = params;
  if (!wasCriticalInjury && !wasKo) return null;

  const survivorGuard = hasSurvivorTrait ? 0.5 : 1;
  if (wasCriticalInjury) {
    const roll = rng();
    if (roll < 0.05 * survivorGuard) return "career_altering";
    if (roll < 0.45 * survivorGuard) return "serious";
    return "minor";
  }

  const roll = rng();
  if (roll < 0.25 * survivorGuard) return "minor";
  return null;
}

let injuryCounter = 0;
function nextInjuryId(): string {
  injuryCounter += 1;
  return `injury-${Date.now()}-${injuryCounter}`;
}

const SEVERITY_LABELS: Record<InjurySeverity, string[]> = {
  minor: ["Bruising", "Minor strain", "Minor impact bruising"],
  serious: ["Deep tissue strain", "Wing sprain", "Leg strain"],
  career_altering: ["Shattered spur", "Chronic joint damage", "Severe head trauma"],
};

const RECOVERY_TURNS: Record<InjurySeverity, number> = { minor: 1, serious: 3, career_altering: 0 };

export function createInjuryRecord(rng: Rng, severity: InjurySeverity): InjuryRecord {
  const labels = SEVERITY_LABELS[severity];
  const label = labels[Math.floor(rng() * labels.length)];
  return {
    id: nextInjuryId(),
    severity,
    label,
    incurredAt: Date.now(),
    recoveryRemaining: RECOVERY_TURNS[severity],
    permanent: severity === "career_altering",
    statPenalty: severity === "career_altering" ? { power: -5, speed: -5 } : undefined,
  };
}

/** One rest/heal cycle's worth of recovery — permanent injuries never tick down (spec §27, §28). */
export function tickInjuryRecovery(injuries: readonly InjuryRecord[]): InjuryRecord[] {
  return injuries
    .map((injury) => (injury.permanent ? injury : { ...injury, recoveryRemaining: Math.max(0, injury.recoveryRemaining - 1) }))
    .filter((injury) => injury.permanent || injury.recoveryRemaining > 0);
}
