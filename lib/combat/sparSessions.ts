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
type OwnedSession = { session: BattleSession; ownerPlayerId: string };

const sessions = new Map<string, OwnedSession>();

let nextId = 1;

export function createSparSession(session: BattleSession, ownerPlayerId: string): string {
  const id = `spar-${nextId++}-${Date.now().toString(36)}`;
  sessions.set(id, { session, ownerPlayerId });
  return id;
}

export function getSparSession(id: string, ownerPlayerId: string): BattleSession | undefined {
  const entry = sessions.get(id);
  if (!entry || entry.ownerPlayerId !== ownerPlayerId) return undefined;
  return entry.session;
}

export function endSparSession(id: string, ownerPlayerId: string): void {
  const entry = sessions.get(id);
  if (!entry || entry.ownerPlayerId !== ownerPlayerId) return;
  sessions.delete(id);
}
