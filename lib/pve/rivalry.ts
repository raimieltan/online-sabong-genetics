import type { PveOpponentHistorySummary } from "./escalation";

export type RivalryStatus = {
  isRival: boolean;
  record: { wins: number; losses: number };
  deciderDue: boolean;
};

/**
 * Rivalries are derived from actual play, not authored (parent spec §25) —
 * additive to the static `nodeType === "rival"` boss ("The Challenger"),
 * which keeps its own authored framing untouched.
 */
export function rivalryStatus(history: PveOpponentHistorySummary | null): RivalryStatus {
  if (!history) return { isRival: false, record: { wins: 0, losses: 0 }, deciderDue: false };
  const { wins, losses } = history;
  const fights = wins + losses;
  const closeRecord = fights >= 3 && Math.abs(wins - losses) <= 1;
  const everLost = losses > 0;
  const isRival = closeRecord || everLost;
  const deciderDue = wins === losses && fights >= 2;
  return { isRival, record: { wins, losses }, deciderDue };
}
