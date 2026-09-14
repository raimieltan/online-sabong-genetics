import type { CombatLogEntry, CombatResult } from "../types";

const EARLY_LATE_SPLIT = 0.5;

/**
 * Post-battle "why you won/lost" breakdown (spec §49) — built purely from the
 * log the simulator already produced, so it can never disagree with what
 * actually happened.
 */
export function generateBattleAnalysis(result: CombatResult, chickenId: string): string {
  const mine = result.log.filter((e) => e.attackerId === chickenId || e.defenderId === chickenId);
  if (mine.length === 0) return "No exchanges recorded.";

  const won = result.winnerId === chickenId;
  const splitTurn = mine[Math.floor(mine.length * EARLY_LATE_SPLIT)]?.turn ?? mine[mine.length - 1].turn;

  const dealt = (entries: CombatLogEntry[]) =>
    entries.filter((e) => e.attackerId === chickenId && !e.isMiss).reduce((s, e) => s + e.damage, 0);
  const taken = (entries: CombatLogEntry[]) =>
    entries.filter((e) => e.defenderId === chickenId && !e.isMiss).reduce((s, e) => s + e.damage, 0);

  const early = mine.filter((e) => e.turn <= splitTurn);
  const late = mine.filter((e) => e.turn > splitTurn);

  const earlyDealt = dealt(early);
  const lateDealt = dealt(late);
  const earlyTaken = taken(early);
  const lateTaken = taken(late);

  const myStaggerHits = mine.filter((e) => e.defenderId === chickenId && e.stagger !== "none").length;
  const counterLosses = mine.filter((e) => e.defenderId === chickenId && e.isCounter).length;

  const lastFatigueEntry = [...mine].reverse().find((e) => e.fatigue);
  const myLastFatigue = lastFatigueEntry
    ? lastFatigueEntry.attackerId === chickenId
      ? lastFatigueEntry.fatigue!.attacker
      : lastFatigueEntry.fatigue!.defender
    : undefined;

  const lines: string[] = [];
  lines.push(won ? "WHY YOU WON" : "WHY YOU LOST");
  lines.push("");

  if (earlyDealt > earlyTaken * 1.3) {
    lines.push(`You dominated the early exchanges, dealing ${earlyDealt.toFixed(0)} damage against ${earlyTaken.toFixed(0)} taken.`);
  } else if (earlyTaken > earlyDealt * 1.3) {
    lines.push(`You were on the back foot early, taking ${earlyTaken.toFixed(0)} damage against ${earlyDealt.toFixed(0)} dealt.`);
  }

  if (myLastFatigue !== undefined && myLastFatigue >= 60) {
    lines.push(`Fatigue climbed to ${myLastFatigue.toFixed(0)} by the end — your output and accuracy were noticeably reduced late.`);
  }

  if (lateTaken > lateDealt && late.length > 0) {
    lines.push(`The fight shifted late: you took ${lateTaken.toFixed(0)} damage against ${lateDealt.toFixed(0)} dealt after turn ${splitTurn}.`);
  }

  if (counterLosses > 0) {
    lines.push(`You were countered ${counterLosses} time${counterLosses === 1 ? "" : "s"} — a committed attack got read and punished.`);
  }

  if (myStaggerHits > 0) {
    lines.push(`You were staggered ${myStaggerHits} time${myStaggerHits === 1 ? "" : "s"}, losing tempo each time.`);
  }

  if (result.outcomeReason === "critical_injury" && result.injuredChickenId === chickenId) {
    lines.push("A critical hit ended the fight outright.");
  }

  return lines.join("\n");
}
