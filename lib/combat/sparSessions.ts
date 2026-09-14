import { BattleSession } from "./simulator";

/**
 * In-memory registry of live sparring sessions — the /spar feature's whole
 * point is a human stepping a `BattleSession` one turn at a time between
 * button clicks, so unlike every other fight route there's no finished
 * `CombatResult` to persist until the session actually ends. Single dev/prod
 * server instance only (matches this feature's scope: trying out a rooster's
 * strategy-fighter behavior, not a scored/rated match) — a restart drops any
 * sessions in flight.
 */
const sessions = new Map<string, BattleSession>();

let nextId = 1;

export function createSparSession(session: BattleSession): string {
  const id = `spar-${nextId++}-${Date.now().toString(36)}`;
  sessions.set(id, session);
  return id;
}

export function getSparSession(id: string): BattleSession | undefined {
  return sessions.get(id);
}

export function endSparSession(id: string): void {
  sessions.delete(id);
}
