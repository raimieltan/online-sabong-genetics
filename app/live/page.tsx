"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import BattleCanvas from "@/components/BattleCanvas";
import { BattleReportPanel } from "@/components/BattleReportPanel";
import { BettingPanel } from "@/components/live/BettingPanel";
import { ComicCommentary, type CommentaryBurst } from "@/components/live/ComicCommentary";
import { LiveMatchupPreview } from "@/components/live/LiveMatchupPreview";
import { PageHeader } from "@/components/PageHeader";
import {
  commentaryForBoutStart,
  commentaryForImpact,
  commentaryForResult,
} from "@/lib/liveCommentary";
import type { BattleReport } from "@/lib/combat/battleReport";
import type { BetSide } from "@/lib/live/bets";
import { setPlayerCredits } from "@/lib/playerStore";
import type { Chicken, CombatLogEntry, CombatResult } from "@/lib/types";

type Phase = "loading" | "betting" | "fighting" | "intermission" | "error";
type LiveMode = "pve" | "pvp" | "exhibition";

const AUDIO_STORAGE_KEY = "rooster-arena-audio-enabled";
const INTERMISSION_MS = 5000;

const MODE_LABEL: Record<LiveMode, string> = {
  pve: "Sanctioned Match",
  pvp: "House Derby",
  exhibition: "Exhibition Bout",
};

type LiveMatchupResponse = {
  matchId: string;
  mode: LiveMode;
  chickenA: Chicken;
  chickenB: Chicken;
  oddsA: number;
  oddsB: number;
  expiresAt: string;
  credits: number;
};

type LiveResolveResponse = {
  mode: LiveMode;
  chickenA: Chicken;
  chickenB: Chicken;
  updatedA: Chicken;
  updatedB: Chicken;
  result: CombatResult;
  log: CombatLogEntry[];
  creditsEarned: number;
  credits: number;
  battleReportA?: BattleReport;
  battleReportB?: BattleReport;
  betSide: BetSide | null;
  betAmount: number | null;
  betWon: boolean | null;
  betPayout: number;
};

export default function LivePage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [matchup, setMatchup] = useState<LiveMatchupResponse | null>(null);
  const [round, setRound] = useState<LiveResolveResponse | null>(null);
  const [credits, setCredits] = useState(0);
  const [placedBet, setPlacedBet] = useState<{ side: BetSide; amount: number } | null>(null);
  const [msRemaining, setMsRemaining] = useState(0);
  // BattleCanvas is never unmounted between rounds on this page (unlike /battle,
  // which toggles it in/out of the tree), so its own HUD state won't reset on
  // new props alone — force a remount each round via key so it re-inits fresh,
  // the same reset /battle gets from mounting a new instance.
  const [roundId, setRoundId] = useState(0);
  const [bursts, setBursts] = useState<CommentaryBurst[]>([]);
  const [caption, setCaption] = useState<string | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  const burstIdRef = useRef(0);
  const intermissionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bettingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bettingTick = useRef<ReturnType<typeof setInterval> | null>(null);

  function toggleAudio() {
    setAudioEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(AUDIO_STORAGE_KEY, String(next));
      return next;
    });
  }

  function clearBettingTimers() {
    if (bettingTimeout.current) clearTimeout(bettingTimeout.current);
    if (bettingTick.current) clearInterval(bettingTick.current);
  }

  const resolveMatch = useCallback(async (matchId: string) => {
    clearBettingTimers();

    const res = await fetch("/api/live/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId }),
    });
    if (!res.ok) {
      setError("The sabungan feed lost connection.");
      setPhase("error");
      return;
    }

    const body: LiveResolveResponse = await res.json();
    setRound(body);
    setCredits(body.credits);
    setPlayerCredits(body.credits);
    setRoundId((n) => n + 1);
    setCaption(commentaryForBoutStart(body.chickenA.name, body.chickenB.name, body.mode));
    setPhase("fighting");
  }, []);

  const openBetting = useCallback(async () => {
    setPhase("loading");
    setBursts([]);
    setCaption(null);
    setRound(null);
    setPlacedBet(null);

    const res = await fetch("/api/live/matchup", { method: "POST" });
    if (!res.ok) {
      setError("The sabungan feed lost connection.");
      setPhase("error");
      return;
    }

    const body: LiveMatchupResponse = await res.json();
    setMatchup(body);
    setCredits(body.credits);
    setPlayerCredits(body.credits);
    setPhase("betting");

    const expiresAt = new Date(body.expiresAt).getTime();
    setMsRemaining(expiresAt - Date.now());
    bettingTick.current = setInterval(() => {
      setMsRemaining(Math.max(0, expiresAt - Date.now()));
    }, 250);
    bettingTimeout.current = setTimeout(() => resolveMatch(body.matchId), expiresAt - Date.now());
  }, [resolveMatch]);

  async function placeBet(side: BetSide, amount: number) {
    if (!matchup) return;
    const res = await fetch("/api/live/bet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ matchId: matchup.matchId, side, amount }),
    });
    if (!res.ok) return;
    const body: { credits: number } = await res.json();
    setCredits(body.credits);
    setPlayerCredits(body.credits);
    setPlacedBet({ side, amount });
  }

  useEffect(() => {
    const initial = setTimeout(openBetting, 0);
    return () => {
      clearTimeout(initial);
      clearBettingTimers();
      if (intermissionTimer.current) clearTimeout(intermissionTimer.current);
    };
  }, [openBetting]);

  function handleImpact(entry: CombatLogEntry) {
    if (!round) return;
    const { burst, caption: line } = commentaryForImpact(entry);

    if (burst) {
      const id = burstIdRef.current++;
      const side: CommentaryBurst["side"] = entry.defenderId === round.chickenA.id ? "left" : "right";
      const kind: CommentaryBurst["kind"] =
        entry.stagger === "knockdown" ? "ko" : entry.isCritical ? "crit" : entry.isMiss ? "miss" : "hit";
      setBursts((prev) => [...prev.slice(-4), { id, text: burst, side, kind }]);
      setTimeout(() => setBursts((prev) => prev.filter((b) => b.id !== id)), 1100);
    }
    if (line) setCaption(line);
  }

  function handleReplayEnd() {
    if (round) {
      const winner =
        round.result.winnerId === round.chickenA.id ? round.updatedA ?? round.chickenA : round.updatedB ?? round.chickenB;
      setCaption(commentaryForResult(round.result, winner.name));
    }
    setPhase("intermission");
    intermissionTimer.current = setTimeout(openBetting, INTERMISSION_MS);
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6">
        <div className="panel-wood rounded-lg border-t-2 border-red-800/60 p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={openBetting}
            className="mt-4 inline-block text-(--color-gold-bright) hover:underline"
          >
            Reconnect
          </button>
        </div>
      </main>
    );
  }

  if (!matchup) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink)">
        <p className="text-(--color-text-muted)">🔴 Tuning in to the sabungan...</p>
      </main>
    );
  }

  const winner =
    round && round.result.winnerId === round.chickenA.id
      ? round.updatedA ?? round.chickenA
      : round?.updatedB ?? round?.chickenB;
  const loser =
    round && round.result.winnerId === round.chickenA.id
      ? round.updatedB ?? round.chickenB
      : round?.updatedA ?? round?.chickenA;

  return (
    <main className="min-h-screen bg-(--color-ink)">
      <div className="mx-auto p-6 pb-0">
        <PageHeader
          eyebrow={<span className="flex items-center gap-2 text-red-500">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
            </span>
            Live
          </span>}
          title={<>🐓 {matchup.chickenA.name} <span className="text-(--color-text-muted)">vs</span> {matchup.chickenB.name}</>}
          right={<div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-(--color-gold)/30 bg-black/30 px-3 py-1 text-xs uppercase tracking-wide text-(--color-text-muted) sm:inline">
              {MODE_LABEL[matchup.mode]}
            </span>
            <button
              type="button"
              onClick={toggleAudio}
              aria-label={audioEnabled ? "Mute audio" : "Unmute audio"}
              aria-pressed={audioEnabled}
              className="rounded-full border border-(--color-gold)/30 bg-black/30 px-3 py-1.5 text-lg leading-none hover:bg-black/50"
            >
              {audioEnabled ? "🔊" : "🔇"}
            </button>
          </div>}
        />
      </div>

      {round ? (
        <div className="relative mx-auto aspect-[16/9] w-full max-w-[142.2vh] overflow-hidden">
          <BattleCanvas
            key={roundId}
            chickenA={round.chickenA}
            chickenB={round.chickenB}
            log={round.log}
            audioEnabled={audioEnabled}
            onReplayEnd={handleReplayEnd}
            onImpact={handleImpact}
          />
          <ComicCommentary bursts={bursts} caption={caption} />
        </div>
      ) : (
        // No fixed aspect box here (unlike the BattleCanvas replay above) — the
        // betting panel below is `fixed` to the viewport bottom, so this needs
        // its own scroll room (pb-*) rather than a cropped fixed-height stage.
        <div className="mx-auto w-full max-w-[142.2vh] pb-72 sm:pb-64">
          <LiveMatchupPreview chickenA={matchup.chickenA} chickenB={matchup.chickenB} />
        </div>
      )}

      {phase === "betting" && (
        <BettingPanel
          key={matchup.matchId}
          chickenA={matchup.chickenA}
          chickenB={matchup.chickenB}
          oddsA={matchup.oddsA}
          oddsB={matchup.oddsB}
          credits={credits}
          msRemaining={msRemaining}
          placedBet={placedBet}
          onPlaceBet={placeBet}
        />
      )}

      {phase === "intermission" && round && winner && loser && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-4 sm:p-6 md:left-56">
          <div className="panel-wood flex w-full max-w-lg flex-col items-center gap-2 rounded-2xl border-t-2 border-(--color-gold)/40 p-5 text-center shadow-2xl">
            <p className="font-comic text-2xl tracking-wide text-(--color-gold-bright) sm:text-3xl">
              Panalo si {winner.name}!
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-(--color-text-muted)">
              {loser.name} sits this one out to recover
            </p>
            {round.betSide && (
              <p
                className={`text-sm font-semibold ${
                  round.betWon ? "text-(--color-gold-bright)" : "text-red-400"
                }`}
              >
                {round.betWon
                  ? `🪙 Won ${round.betPayout} credits on ${
                      round.betSide === "A" ? round.chickenA.name : round.chickenB.name
                    }!`
                  : `Lost your ${round.betAmount}-credit bet on ${
                      round.betSide === "A" ? round.chickenA.name : round.chickenB.name
                    }`}
              </p>
            )}
            {round.creditsEarned > 0 && (
              <p className="text-sm font-semibold text-(--color-gold-bright)">
                🪙 +{round.creditsEarned} Battle Credits
              </p>
            )}
            {(round.battleReportA || round.battleReportB) && (
              <div className="mt-3 grid w-full gap-3 text-left sm:grid-cols-2">
                {round.battleReportA && (
                  <BattleReportPanel report={round.battleReportA} title={round.chickenA.name} />
                )}
                {round.battleReportB && (
                  <BattleReportPanel report={round.battleReportB} title={round.chickenB.name} />
                )}
              </div>
            )}
            <p className="mt-1 text-xs text-(--color-text-muted)">Susunod na laban sa ilang saglit...</p>
          </div>
        </div>
      )}
    </main>
  );
}
