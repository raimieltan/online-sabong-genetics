"use client";

import { use, useEffect, useRef, useState } from "react";
import Link from "next/link";

import type { BattleReport } from "@/lib/combat/battleReport";
import { roundLabel, tokensAwardedFor, TIER_LABELS, TOURNAMENT_SIZES, TOURNAMENT_TIERS } from "@/lib/tournament";
import type { BracketEntrant, TournamentSize, TournamentTier } from "@/lib/tournament";
import type { Chicken, CombatResult } from "@/lib/types";
import BattleCanvas from "@/components/BattleCanvas";
import { MatchupScreen } from "@/components/battle/MatchupScreen";
import { BattleReportPanel } from "@/components/BattleReportPanel";
import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";

type Phase =
  | "loading"
  | "picker"
  | "starting"
  | "roster"
  | "matchup"
  | "fighting"
  | "round-banner"
  | "report"
  | "final"
  | "error";

type TournamentView = {
  id: string;
  chickenId: string;
  size: TournamentSize;
  tier: TournamentTier;
  totalRounds: number;
  currentRound: number;
  status: "in_progress" | "complete";
  entrants: BracketEntrant[];
  history: { round: number; slotA: number; slotB: number; winnerSlot: number; isPlayerMatch: boolean; result: CombatResult }[][];
  placement: 1 | 2 | 3 | null;
  tokensAwarded: number;
};

const AUDIO_STORAGE_KEY = "rooster-arena-audio-enabled";
const ROUND_BANNER_DELAY_MS = 1500;

const PLACEMENT_LABEL: Record<string, string> = {
  "1": "🏆 Champion",
  "2": "🥈 Runner-up",
  "3": "🥉 3rd Place",
  null: "Eliminated",
};

export default function TournamentPage({ params }: { params: Promise<{ chickenId: string }> }) {
  const { chickenId } = use(params);

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [chicken, setChicken] = useState<Chicken | null>(null);
  const [tournament, setTournament] = useState<TournamentView | null>(null);
  const [selectedSize, setSelectedSize] = useState<TournamentSize>(8);
  const [selectedTier, setSelectedTier] = useState<TournamentTier>("beginner");
  const [lastMatch, setLastMatch] = useState<{ result: CombatResult; opponent: Chicken } | null>(null);
  const [battleReport, setBattleReport] = useState<BattleReport | null>(null);
  const [tokensThisRound, setTokensThisRound] = useState(0);
  // Holds the already-resolved round result until the fight animation finishes —
  // the roster/chicken state shouldn't update until the player has watched it play out.
  const pendingTournament = useRef<TournamentView | null>(null);
  const pendingChicken = useRef<Chicken | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  function toggleAudio() {
    setAudioEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(AUDIO_STORAGE_KEY, String(next));
      return next;
    });
  }

  // On load: fetch the chicken, and check for an already-running tournament to resume.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [chickenRes, activeRes] = await Promise.all([
        fetch(`/api/chickens/${chickenId}`),
        fetch(`/api/chickens/${chickenId}/tournament`),
      ]);
      if (cancelled) return;
      if (!chickenRes.ok) {
        setError("Chicken not found");
        setPhase("error");
        return;
      }
      setChicken(await chickenRes.json());
      const activeBody = await activeRes.json();
      if (activeBody.tournament) {
        setTournament(activeBody.tournament);
        setPhase(activeBody.tournament.status === "complete" ? "final" : "roster");
      } else {
        setPhase("picker");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [chickenId]);

  // Auto-advance from the round-result banner into the battle report.
  useEffect(() => {
    if (phase !== "round-banner") return;
    const timer = setTimeout(() => setPhase("report"), ROUND_BANNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  async function handleStart() {
    setPhase("starting");
    const res = await fetch(`/api/chickens/${chickenId}/tournament`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ size: selectedSize, tier: selectedTier }),
    });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "Could not start the tournament");
      setPhase("error");
      return;
    }
    setTournament(body.tournament);
    setPhase("roster");
  }

  function currentOpponentEntrant(t: TournamentView): BracketEntrant | null {
    const alive = t.entrants.filter((e) => e.eliminatedRound === null).sort((a, b) => a.slot - b.slot);
    const playerIndex = alive.findIndex((e) => e.isPlayer);
    if (playerIndex === -1) return null;
    const pairIndex = playerIndex % 2 === 0 ? playerIndex + 1 : playerIndex - 1;
    return alive[pairIndex] ?? null;
  }

  async function handleFight() {
    if (!tournament) return;
    const opponentEntrant = currentOpponentEntrant(tournament);
    const res = await fetch(`/api/tournaments/${tournament.id}/advance`, { method: "POST" });
    const body = await res.json();
    if (!res.ok) {
      setError(body.error ?? "The round could not be resolved");
      setPhase("error");
      return;
    }

    setLastMatch({ result: body.playerMatch.result, opponent: opponentEntrant!.chicken });
    setBattleReport(body.battleReport);
    setTokensThisRound(body.tournament.tokensAwarded - tournament.tokensAwarded);
    pendingTournament.current = body.tournament;
    pendingChicken.current = body.chicken;
    setPhase("fighting");
  }

  function handleReplayEnd() {
    if (pendingTournament.current) setTournament(pendingTournament.current);
    if (pendingChicken.current) setChicken(pendingChicken.current);
    setPhase("round-banner");
  }

  function handleContinue() {
    if (tournament?.status === "complete") {
      setPhase("final");
    } else {
      setPhase("roster");
    }
  }

  if (phase === "loading" || phase === "error") {
    return (
      <main className="p-6">
        {phase === "error" ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : (
          <p className="text-sm opacity-70">Loading...</p>
        )}
        <Link href="/coop" className="mt-2 inline-block text-sm underline">
          ← Back to Coop
        </Link>
      </main>
    );
  }

  if (phase === "picker" && chicken) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="signboard mb-6 p-4">
          <h1 className="font-display text-2xl font-semibold text-(--color-gold-bright)">
            🏆 Tournament — {chicken.name}
          </h1>
          <p className="text-sm opacity-70">Pick a bracket size and difficulty tier.</p>
        </div>

        <div className="panel-wood mb-4 rounded-lg p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Bracket Size</p>
          <div className="flex gap-2">
            {TOURNAMENT_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setSelectedSize(size)}
                className={`flex-1 rounded-md px-4 py-2 text-sm font-semibold ${
                  selectedSize === size
                    ? "bg-(--color-gold-bright) text-(--color-ink)"
                    : "bg-black/30 text-(--foreground) hover:bg-black/50"
                }`}
              >
                {size}-Bird
              </button>
            ))}
          </div>
        </div>

        <div className="panel-wood mb-6 rounded-lg p-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Difficulty Tier</p>
          <div className="flex flex-col gap-2">
            {TOURNAMENT_TIERS.map((tier) => {
              const champTokens = tokensAwardedFor(selectedSize, tier, 1, 0);
              return (
                <button
                  key={tier}
                  onClick={() => setSelectedTier(tier)}
                  className={`flex items-center justify-between rounded-md px-4 py-3 text-sm ${
                    selectedTier === tier
                      ? "bg-(--color-gold-bright) text-(--color-ink) font-semibold"
                      : "bg-black/30 text-(--foreground) hover:bg-black/50"
                  }`}
                >
                  <span>{TIER_LABELS[tier]}</span>
                  <span className="text-xs opacity-80">🎟️ up to {champTokens}</span>
                </button>
              );
            })}
          </div>
        </div>

        <button
          onClick={handleStart}
          className="w-full rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-8 py-3 font-display font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110"
        >
          ⚔️ Enter Tournament
        </button>

        <Link href="/coop" className="mt-6 block text-center text-sm opacity-70 underline hover:opacity-100">
          ← Back to Coop
        </Link>
      </main>
    );
  }

  if (phase === "starting") {
    return <main className="p-6 text-sm opacity-70">Building the bracket...</main>;
  }

  if (phase === "roster" && tournament && chicken) {
    const alive = tournament.entrants.filter((e) => e.eliminatedRound === null).sort((a, b) => a.slot - b.slot);
    const eliminated = tournament.entrants
      .filter((e) => e.eliminatedRound !== null)
      .sort((a, b) => (b.eliminatedRound ?? 0) - (a.eliminatedRound ?? 0));

    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="panel-wood mb-4 flex items-center justify-between rounded-lg p-4">
          <Link href="/coop" className="text-sm text-(--color-gold-bright) hover:underline">
            ← Coop
          </Link>
          <h1 className="font-display text-xl font-semibold">
            {TIER_LABELS[tournament.tier]} · {tournament.size}-Bird ·{" "}
            {roundLabel(tournament.totalRounds, tournament.currentRound)}
          </h1>
          <span className="text-xs opacity-60">{alive.length} remain</span>
        </div>

        <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">
          Roster — Before Round
        </p>
        <div className="mb-6 grid grid-cols-4 gap-3 sm:grid-cols-6">
          {alive.map((entrant) => (
            <div
              key={entrant.slot}
              className={`rounded-lg border p-2 text-center ${
                entrant.isPlayer
                  ? "border-(--color-gold-bright) bg-(--color-gold-bright)/10"
                  : "border-(--color-gold)/20 bg-black/25"
              }`}
            >
              <ChickenThumbnail chicken={entrant.chicken} className="mx-auto h-14 w-14" />
              <p className="mt-1 truncate text-[11px]">{entrant.isPlayer ? chicken.name : entrant.chicken.name}</p>
            </div>
          ))}
        </div>

        {eliminated.length > 0 && (
          <>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Eliminated</p>
            <div className="mb-6 grid grid-cols-4 gap-3 opacity-40 sm:grid-cols-6">
              {eliminated.map((entrant) => (
                <div key={entrant.slot} className="rounded-lg border border-red-900/30 bg-black/20 p-2 text-center">
                  <ChickenThumbnail chicken={entrant.chicken} className="mx-auto h-14 w-14 grayscale" />
                  <p className="mt-1 truncate text-[11px]">{entrant.chicken.name}</p>
                </div>
              ))}
            </div>
          </>
        )}

        <button
          onClick={() => setPhase("matchup")}
          className="w-full rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-8 py-3 font-display font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110"
        >
          ⚔️ Fight {roundLabel(tournament.totalRounds, tournament.currentRound)}
        </button>
      </main>
    );
  }

  if (phase === "matchup" && tournament && chicken) {
    const opponentEntrant = currentOpponentEntrant(tournament);
    if (!opponentEntrant) return null;
    return (
      <main className="min-h-screen bg-(--color-ink)">
        <div className="mx-auto p-6 pb-0">
          <div className="panel-wood mb-4 flex items-center justify-between w-full rounded-lg p-4">
            <h1 className="font-display text-xl font-semibold">
              {roundLabel(tournament.totalRounds, tournament.currentRound)}
            </h1>
            <button
              type="button"
              onClick={toggleAudio}
              aria-label={audioEnabled ? "Mute audio" : "Unmute audio"}
              className="rounded-full border border-(--color-gold)/30 bg-black/30 px-3 py-1.5 text-lg leading-none hover:bg-black/50"
            >
              {audioEnabled ? "🔊" : "🔇"}
            </button>
          </div>
          <MatchupScreen chicken={chicken} opponent={opponentEntrant.chicken} fighting={false} onFight={handleFight} />
        </div>
      </main>
    );
  }

  if ((phase === "fighting" || phase === "round-banner") && lastMatch && chicken) {
    const won = lastMatch.result.winnerId === chicken.id;
    return (
      <main className="min-h-screen bg-(--color-ink)">
        {phase === "fighting" && (
          <BattleCanvas
            chickenA={chicken}
            chickenB={lastMatch.opponent}
            log={lastMatch.result.log}
            audioEnabled={audioEnabled}
            onReplayEnd={handleReplayEnd}
          />
        )}
        {phase === "round-banner" && (
          <div className="vs-arena flex h-screen flex-col items-center justify-center gap-2 rounded-lg p-6 text-center">
            <p className="font-display text-3xl font-bold text-(--color-gold-bright)">
              {won ? "Victory!" : "Defeated"}
            </p>
            <p className="text-sm opacity-70">{lastMatch.result.outcomeReason}</p>
          </div>
        )}
      </main>
    );
  }

  if (phase === "report" && battleReport && tournament && chicken) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="mb-4">
          <BattleReportPanel report={battleReport} />
        </div>
        {tokensThisRound > 0 && (
          <p className="mb-4 text-center text-sm text-(--color-gold-bright)">🎟️ +{tokensThisRound} Tournament Tokens</p>
        )}
        <button
          onClick={handleContinue}
          className="w-full rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-8 py-3 font-display font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110"
        >
          {tournament.status === "complete" ? "See Final Result" : "Continue to Roster"}
        </button>
      </main>
    );
  }

  if (phase === "final" && tournament && chicken) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="panel-wood rounded-lg p-6">
          <div className="mb-4 text-center">
            <p className="font-display text-2xl font-bold text-(--color-gold-bright)">
              {PLACEMENT_LABEL[String(tournament.placement)]}
            </p>
            {tournament.tokensAwarded > 0 && (
              <p className="mt-1 text-sm opacity-80">🎟️ +{tournament.tokensAwarded} Tournament Tokens total</p>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {tournament.history.map((roundMatches, i) => {
              const match = roundMatches.find((m) => m.isPlayerMatch);
              if (!match) return null;
              const won = match.result.winnerId === chicken.id;
              return (
                <li
                  key={i}
                  className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                    won ? "bg-emerald-900/20 text-emerald-300" : "bg-red-900/20 text-red-300"
                  }`}
                >
                  <span>{roundLabel(tournament.totalRounds, i)}</span>
                  <span className="font-semibold uppercase tracking-wide">
                    {won ? "Win" : "Loss"} · {match.result.outcomeReason}
                  </span>
                </li>
              );
            })}
          </ul>

          <Link href="/coop" className="mt-6 block text-center text-sm opacity-70 underline hover:opacity-100">
            ← Back to Coop
          </Link>
        </div>
      </main>
    );
  }

  return null;
}
