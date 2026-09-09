import type { BattleSession } from "../combat/simulator";
import type { Chicken } from "../types";
import type { PveBossId } from "./types";

/**
 * In-memory registry of live boss-fight sessions — mirrors
 * `combat/sparSessions.ts` so a player can issue PRESS/WAIT/RECOVER commands
 * turn-by-turn against a boss the same way they can in a spar, except the
 * outcome here is real (persisted rewards/roster update on finish, see
 * `finishBossFight`). Single dev/prod server instance only, same scope note
 * as spar: a restart drops any fight in flight.
 */
type BossFightEntry = {
  session: BattleSession;
  playerId: string;
  chickenId: string;
  chicken: Chicken;
  bossId: PveBossId;
  bossFighter: Chicken;
};

const sessions = new Map<string, BossFightEntry>();

let nextId = 1;

export function createBossFightSession(entry: BossFightEntry): string {
  const id = `pve-${nextId++}-${Date.now().toString(36)}`;
  sessions.set(id, entry);
  return id;
}

export function getBossFightSession(id: string): BossFightEntry | undefined {
  return sessions.get(id);
}

export function endBossFightSession(id: string): void {
  sessions.delete(id);
}
