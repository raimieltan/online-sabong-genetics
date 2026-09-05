/**
 * Placeholder player/economy data for the top bar. The game has no player-level
 * profile, energy, or currency system yet (see the gamefowl-dynasty roadmap's
 * economy item) — everything here is mock data so the UI reads as complete.
 * Swap this for a real `/api/player` fetch once that subsystem exists.
 */
export const mockPlayer = {
  name: "ROOSTER#1234",
  avatar: "🐓",
  level: 25,
  xp: 1350,
  xpToNext: 2500,
  energy: 120,
  maxEnergy: 120,
  coins: 25670,
  gems: 1250,
};
