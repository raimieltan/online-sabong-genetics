import { GENETIC_STAT_KEYS, type BehavioralProfile, type StatBlock } from "../types";
import type { PveBossDefinition } from "./types";

/** The head-to-head slice of a PveOpponentHistory row the escalation engine
 * actually needs — keeps this module decoupled from the Prisma row shape. */
export type PveOpponentHistorySummary = {
  wins: number;
  losses: number;
  kosFor: number;
  kosAgainst: number;
};

export type EscalationDelta = { label: string; direction: "up" | "down" };

export type EscalationResult = {
  ev: StatBlock;
  behaviorOverrides: Partial<BehavioralProfile>;
  condition: number;
  deltas: EscalationDelta[];
};

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** 0 = first meeting, rising with fight count and how often the player has won. */
export function escalationTier(history: PveOpponentHistorySummary | null): 0 | 1 | 2 | 3 {
  if (!history) return 0;
  const fights = history.wins + history.losses;
  if (fights === 0) return 0;
  if (fights >= 5 || history.wins >= 3) return 3;
  if (fights >= 3 || history.wins >= 2) return 2;
  return 1;
}

/**
 * Nudges a boss's fighter build based on this specific player's history
 * against them (rematches/dynamic opponent progression, parent spec §6/§26).
 * Bounded and additive — a boss never scales past a small ceiling, it just
 * stops being byte-identical on a rematch. First-time fights are untouched.
 */
export function escalateBoss(boss: PveBossDefinition, history: PveOpponentHistorySummary | null): EscalationResult {
  const tier = escalationTier(history);
  const deltas: EscalationDelta[] = [];
  if (tier === 0) {
    return { ev: boss.ev, behaviorOverrides: boss.behaviorOverrides ?? {}, condition: boss.condition ?? 100, deltas };
  }

  // The boss has been beaten before more than it has won — it leans into
  // caution/counter-play rather than raw stats.
  const beatenMore = history !== null && history.losses > history.wins;

  const ev: StatBlock = { ...boss.ev };
  const bump = tier * 3;
  for (const key of GENETIC_STAT_KEYS) ev[key] = Math.min(100, ev[key] + bump);

  const base = boss.behaviorOverrides ?? {};
  const behaviorOverrides: Partial<BehavioralProfile> = { ...base };
  const adapt = tier * 0.06;
  if (beatenMore) {
    behaviorOverrides.caution = clamp01((base.caution ?? 0.4) + adapt);
    behaviorOverrides.counterPreference = clamp01((base.counterPreference ?? 0.4) + adapt);
    deltas.push({ label: "ADAPTATION", direction: "up" }, { label: "COUNTER THREAT", direction: "up" });
  } else {
    behaviorOverrides.persistence = clamp01((base.persistence ?? 0.5) + adapt);
    behaviorOverrides.pressurePreference = clamp01((base.pressurePreference ?? 0.5) + adapt);
    deltas.push({ label: "PRESSURE RESPONSE", direction: "up" }, { label: "PERSISTENCE", direction: "up" });
  }
  if (tier >= 3) deltas.push({ label: "ENDURANCE", direction: "up" });

  const condition = Math.min(100, (boss.condition ?? 100) + tier);

  return { ev, behaviorOverrides, condition, deltas };
}
