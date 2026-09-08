"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import BattleCanvas from "@/components/BattleCanvas";
import { BattleReportPanel } from "@/components/BattleReportPanel";
import { ComicCommentary, type CommentaryBurst } from "@/components/live/ComicCommentary";
import {
  commentaryForBoutStart,
  commentaryForImpact,
  commentaryForResult,
} from "@/lib/liveCommentary";
import type { BattleReport } from "@/lib/combat/battleReport";
import type { Chicken, CombatLogEntry, CombatResult } from "@/lib/types";

type Phase = "loading" | "fighting" | "intermission" | "error";
type LiveMode = "pve" | "pvp" | "exhibition";

const AUDIO_STORAGE_KEY = "rooster-arena-audio-enabled";
const INTERMISSION_MS = 5000;

const MODE_LABEL: Record<LiveMode, string> = {
  pve: "Sanctioned Match",
  pvp: "House Derby",
  exhibition: "Exhibition Bout",
};

type LiveNextResponse = {
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
};

export default function LivePage() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [round, setRound] = useState<LiveNextResponse | null>(null);
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

  function toggleAudio() {
    setAudioEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(AUDIO_STORAGE_KEY, String(next));
      return next;
    });
  }

  const loadNext = useCallback(async () => {
    setPhase("loading");
    setBursts([]);
    setCaption(null);

    const res = await fetch("/api/live/next", { method: "POST" });
    if (!res.ok) {
      setError("The sabungan feed lost connection.");
      setPhase("error");
      return;
    }

    const body: LiveNextResponse = await res.json();
    setRound(body);
    setRoundId((n) => n + 1);
    setCaption(commentaryForBoutStart(body.chickenA.name, body.chickenB.name, body.mode));
    setPhase("fighting");
  }, []);

  useEffect(() => {
    const initial = setTimeout(loadNext, 0);
    return () => {
      clearTimeout(initial);
      if (intermissionTimer.current) clearTimeout(intermissionTimer.current);
    };
  }, [loadNext]);

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
    intermissionTimer.current = setTimeout(loadNext, INTERMISSION_MS);
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6">
        <div className="panel-wood rounded-lg border-t-2 border-red-800/60 p-6 text-center">
          <p className="text-red-400">{error}</p>
          <button
            onClick={loadNext}
            className="mt-4 inline-block text-(--color-gold-bright) hover:underline"
          >
            Reconnect
          </button>
        </div>
      </main>
    );
  }

  if (!round) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink)">
        <p className="text-(--color-text-muted)">🔴 Tuning in to the sabungan...</p>
      </main>
    );
  }

  const winner =
    round.result.winnerId === round.chickenA.id ? round.updatedA ?? round.chickenA : round.updatedB ?? round.chickenB;
  const loser =
    round.result.winnerId === round.chickenA.id ? round.updatedB ?? round.chickenB : round.updatedA ?? round.chickenA;

  return (
    <main className="min-h-screen bg-(--color-ink)">
      <div className="mx-auto p-6 pb-0">
        <div className="panel-wood mb-4 flex items-center justify-between w-full rounded-lg p-4">
          <span className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.2em] text-red-500">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-600" />
            </span>
            Live
          </span>
          <h1 className="flex items-center gap-2 font-display text-lg font-semibold text-(--foreground) sm:text-xl">
            🐓 {round.chickenA.name} <span className="text-(--color-text-muted)">vs</span> {round.chickenB.name}
          </h1>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-(--color-gold)/30 bg-black/30 px-3 py-1 text-xs uppercase tracking-wide text-(--color-text-muted) sm:inline">
              {MODE_LABEL[round.mode]}
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
          </div>
        </div>
      </div>

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

      {phase === "intermission" && (
        <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-4 sm:p-6">
          <div className="panel-wood flex w-full max-w-lg flex-col items-center gap-2 rounded-2xl border-t-2 border-(--color-gold)/40 p-5 text-center shadow-2xl">
            <p className="font-comic text-2xl tracking-wide text-(--color-gold-bright) sm:text-3xl">
              Panalo si {winner.name}!
            </p>
            <p className="text-xs uppercase tracking-[0.2em] text-(--color-text-muted)">
              {loser.name} sits this one out to recover
            </p>
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
