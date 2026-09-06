"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import type { Chicken, CombatResult } from "@/lib/types";
import BattleCanvas from "@/components/BattleCanvas";
import { MatchupScreen } from "@/components/battle/MatchupScreen";

type Phase =
  | "loading"
  | "ready"
  | "running"
  | "matchup"
  | "fighting"
  | "round-banner"
  | "result"
  | "error";

const ROUND_LABELS = ["Quarterfinal", "Semifinal", "Final"];
const AUDIO_STORAGE_KEY = "rooster-arena-audio-enabled";
const AUTO_FIGHT_DELAY_MS = 1200;
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
  const [matches, setMatches] = useState<CombatResult[]>([]);
  const [opponentsFought, setOpponentsFought] = useState<Chicken[]>([]);
  const [roundIndex, setRoundIndex] = useState(0);
  const [placement, setPlacement] = useState<number | null>(null);
  const [tokensAwarded, setTokensAwarded] = useState(0);
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

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chickens/${chickenId}`).then(async (res) => {
      if (cancelled) return;
      if (!res.ok) {
        setError("Chicken not found");
        setPhase("error");
        return;
      }
      setChicken(await res.json());
      setPhase("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [chickenId]);

  // Auto-advance from the matchup card into the fight after a short beat.
  useEffect(() => {
    if (phase !== "matchup") return;
    const timer = setTimeout(() => setPhase("fighting"), AUTO_FIGHT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, roundIndex]);

  // Auto-advance from the round-result banner into the next round (or final result).
  useEffect(() => {
    if (phase !== "round-banner") return;
    const timer = setTimeout(() => {
      if (roundIndex + 1 < matches.length) {
        setRoundIndex((i) => i + 1);
        setPhase("matchup");
      } else {
        setPhase("result");
      }
    }, ROUND_BANNER_DELAY_MS);
    return () => clearTimeout(timer);
  }, [phase, roundIndex, matches.length]);

  async function handleEnter() {
    setPhase("running");
    const res = await fetch(`/api/chickens/${chickenId}/tournament`, { method: "POST" });
    const body = await res.json();

    if (!res.ok) {
      setError(body.error ?? "The tournament could not be run");
      setPhase("error");
      return;
    }

    setMatches(body.matches);
    setOpponentsFought(body.opponentsFought);
    setPlacement(body.placement);
    setTokensAwarded(body.tokensAwarded);
    setChicken(body.chicken);
    setRoundIndex(0);
    setPhase(body.matches.length > 0 ? "matchup" : "result");
  }

  if (phase === "loading") {
    return <main className="p-6 text-sm opacity-70">Loading...</main>;
  }

  if (phase === "error") {
    return (
      <main className="p-6">
        <p className="text-sm text-red-400">{error}</p>
        <Link href="/coop" className="mt-2 inline-block text-sm underline">
          ← Back to Coop
        </Link>
      </main>
    );
  }

  const currentMatch = matches[roundIndex];
  const currentOpponent = opponentsFought[roundIndex];
  const roundWon = chicken && currentMatch && currentMatch.winnerId === chicken.id;

  if ((phase === "matchup" || phase === "fighting" || phase === "round-banner") && chicken && currentOpponent) {
    return (
      <main className="min-h-screen bg-(--color-ink)">
        <div className="mx-auto p-6 pb-0">
          <div className="panel-wood mb-4 flex items-center justify-between w-full rounded-lg p-4">
            <Link href="/coop" className="text-sm text-(--color-gold-bright) hover:underline">
              ← Coop
            </Link>
            <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-(--foreground)">
              🏆 {ROUND_LABELS[roundIndex] ?? `Round ${roundIndex + 1}`}
            </h1>
            <button
              type="button"
              onClick={toggleAudio}
              aria-label={audioEnabled ? "Mute audio" : "Unmute audio"}
              aria-pressed={audioEnabled}
              className="rounded-full border border-(--color-gold)/30 bg-black/30 px-3 py-1.5 text-lg leading-none hover:bg-black/50"
            >
              {audioEnabled ? "🔊" : "🔇"}
            </button>
          </div>

          {phase === "matchup" && (
            <MatchupScreen
              chicken={chicken}
              opponent={currentOpponent}
              fighting={false}
              onFight={() => setPhase("fighting")}
            />
          )}

          {phase === "round-banner" && (
            <div className="vs-arena flex h-screen flex-col items-center justify-center gap-2 rounded-lg p-6 text-center">
              <p className="font-display text-3xl font-bold text-(--color-gold-bright)">
                {roundWon ? "Victory!" : "Defeated"}
              </p>
              <p className="text-sm opacity-70">
                {ROUND_LABELS[roundIndex] ?? `Round ${roundIndex + 1}`} · {currentMatch.outcomeReason}
              </p>
            </div>
          )}
        </div>

        {phase === "fighting" && (
          <BattleCanvas
            chickenA={chicken}
            chickenB={currentOpponent}
            log={currentMatch.log}
            audioEnabled={audioEnabled}
            onReplayEnd={() => setPhase("round-banner")}
          />
        )}
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="signboard mb-6 p-4">
        <h1 className="font-display text-2xl font-semibold text-(--color-gold-bright)">
          🏆 Tournament — {chicken?.name}
        </h1>
        <p className="text-sm opacity-70">Single-elimination bracket of 8. Winner takes the crown.</p>
      </div>

      {(phase === "ready" || phase === "running") && (
        <div className="panel-wood flex flex-col items-center gap-4 rounded-lg p-8 text-center">
          <p className="text-sm opacity-80">
            Enter {chicken?.name} into a randomly matched 8-bird bracket. Fights play out live.
          </p>
          <button
            onClick={handleEnter}
            disabled={phase === "running"}
            className="rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-8 py-3 font-display font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === "running" ? "Building the bracket..." : "⚔️ Enter Tournament"}
          </button>
        </div>
      )}

      {phase === "result" && (
        <div className="panel-wood rounded-lg p-6">
          <div className="mb-4 text-center">
            <p className="font-display text-2xl font-bold text-(--color-gold-bright)">
              {PLACEMENT_LABEL[String(placement)]}
            </p>
            {tokensAwarded > 0 && (
              <p className="mt-1 text-sm opacity-80">🎟️ +{tokensAwarded} Tournament Tokens</p>
            )}
          </div>

          <ul className="flex flex-col gap-2">
            {matches.map((match, i) => {
              const won = chicken && match.winnerId === chicken.id;
              return (
                <li
                  key={i}
                  className={`flex items-center justify-between rounded px-3 py-2 text-sm ${
                    won ? "bg-emerald-900/20 text-emerald-300" : "bg-red-900/20 text-red-300"
                  }`}
                >
                  <span>{ROUND_LABELS[i] ?? `Round ${i + 1}`}</span>
                  <span className="font-semibold uppercase tracking-wide">
                    {won ? "Win" : "Loss"} · {match.outcomeReason}
                  </span>
                </li>
              );
            })}
          </ul>

          <Link
            href="/coop"
            className="mt-6 block text-center text-sm opacity-70 underline hover:opacity-100"
          >
            ← Back to Coop
          </Link>
        </div>
      )}
    </main>
  );
}
