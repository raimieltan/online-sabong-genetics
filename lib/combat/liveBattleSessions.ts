import { BattleSession } from "./simulator";

/**
 * In-memory registry of live main-battle sessions — same shape as
 * `sparSessions.ts` but kept separate since these sessions end in a real,
 * persisted `FightOutcomeUpdate` (roster HP/condition/XP, credits) rather
 * than being thrown away. Single dev/prod server instance only; a restart
 * drops any battle in flight (acceptable for now — no PvP/stakes riding on
 * server continuity yet).
 */
const sessions = new Map<string, BattleSession>();

let nextId = 1;

export function createBattleSession(session: BattleSession): string {
  const id = `battle-${nextId++}-${Date.now().toString(36)}`;
  sessions.set(id, session);
  return id;
}

export function getBattleSession(id: string): BattleSession | undefined {
  return sessions.get(id);
}

export function endBattleSession(id: string): void {
  sessions.delete(id);
}
