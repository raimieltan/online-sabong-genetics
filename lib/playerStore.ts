"use client";

/**
 * Tiny client-side store for the player's wallet, so the TopBar's currency
 * pills update the instant any page (fight, bet, market purchase, ...) gets a
 * fresh `credits`/`tournamentTokens` number back from an API response —
 * without it, each page tracked its own local copy and TopBar only refetched
 * on mount, so a loss/win/purchase wouldn't show up until a manual refresh.
 */

type PlayerSnapshot = { credits: number; tournamentTokens: number };
type Listener = () => void;

let snapshot: PlayerSnapshot = { credits: 0, tournamentTokens: 0 };
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function getPlayerSnapshot(): PlayerSnapshot {
  return snapshot;
}

export function subscribePlayer(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Call after any API response that returns an updated `credits` total. */
export function setPlayerCredits(credits: number) {
  if (snapshot.credits === credits) return;
  snapshot = { ...snapshot, credits };
  emit();
}

export function setPlayerTournamentTokens(tournamentTokens: number) {
  if (snapshot.tournamentTokens === tournamentTokens) return;
  snapshot = { ...snapshot, tournamentTokens };
  emit();
}

/** Re-pulls the whole wallet from the server — used by TopBar on mount. */
export async function refreshPlayer() {
  const res = await fetch("/api/player");
  if (!res.ok) return;
  const player: PlayerSnapshot = await res.json();
  snapshot = player;
  emit();
}
