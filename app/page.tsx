"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import BattleArena from "@/components/BattleArena";
import BattleLog from "@/components/BattleLog";
import BettingPanel from "@/components/BettingPanel";
import ResultsScreen from "@/components/ResultsScreen";
import RoosterSelector from "@/components/RoosterSelector";
import type { BattleLogEntry, BattleResult, Bet, Rooster } from "@/lib/types";
import {
  loadAudioEnabled,
  loadCredits,
  saveAudioEnabled,
  saveCredits,
} from "@/lib/storage";

type GamePhase = "selection" | "battle" | "results";

export default function Home() {
  const [redRooster, setRedRooster] = useState<Rooster | null>(null);
  const [blueRooster, setBlueRooster] = useState<Rooster | null>(null);
  const [credits, setCredits] = useState(5000);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [phase, setPhase] = useState<GamePhase>("selection");
  const [bet, setBet] = useState<Bet | null>(null);
  const [logs, setLogs] = useState<BattleLogEntry[]>([]);
  const [result, setResult] = useState<BattleResult | null>(null);

  useEffect(() => {
    setCredits(loadCredits());
    setAudioEnabled(loadAudioEnabled());
  }, []);

  const handleCreditsChange = useCallback((nextCredits: number) => {
    setCredits(nextCredits);
    saveCredits(nextCredits);
  }, []);

  const handleAudioToggle = () => {
    const next = !audioEnabled;
    setAudioEnabled(next);
    saveAudioEnabled(next);
  };

  const handleSelectRed = (rooster: Rooster) => {
    setRedRooster({ ...rooster, id: `red-${rooster.id}` });
  };

  const handleSelectBlue = (rooster: Rooster) => {
    setBlueRooster({ ...rooster, id: `blue-${rooster.id}` });
  };

  const handleBetPlaced = (nextBet: Bet) => {
    setBet(nextBet);
    setLogs([]);
    setResult(null);
    handleCreditsChange(credits - nextBet.amount);
    setPhase("battle");
  };

  const handleLogEntry = useCallback((entry: BattleLogEntry) => {
    setLogs((current) => [...current, entry]);
  }, []);

  const handleBattleEnd = useCallback(
    (battleResult: BattleResult) => {
      setResult(battleResult);
      setPhase("results");

      setBet((currentBet) => {
        if (currentBet && battleResult.winner.id === currentBet.roosterId) {
          const payout = Math.floor(currentBet.amount * currentBet.odds);
          setCredits((currentCredits) => {
            const nextCredits = currentCredits + payout;
            saveCredits(nextCredits);
            return nextCredits;
          });
        }
        return currentBet;
      });
    },
    []
  );

  const handleNewBattle = () => {
    setPhase("selection");
    setBet(null);
    setLogs([]);
    setResult(null);
  };

  const payout = useMemo(() => {
    if (!bet || !result || result.winner.id !== bet.roosterId) return 0;
    return Math.floor(bet.amount * bet.odds);
  }, [bet, result]);

  const canShowBattle = phase === "battle" && redRooster && blueRooster;
  const canShowResults = phase === "results" && result && bet;

  return (
    <main className="min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top,#172554_0%,#020617_42%,#000_100%)] text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8">
        <header className="rounded-3xl border border-cyan-500/25 bg-black/35 p-6 shadow-2xl shadow-cyan-950/30 backdrop-blur">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="mb-2 text-xs font-black uppercase tracking-[0.32em] text-cyan-300">
                Fictional credits · Cartoon combat · No real gambling
              </p>
              <h1 className="text-4xl font-black uppercase tracking-tight text-white sm:text-6xl">
                Rooster Arena
              </h1>
              <p className="mt-3 max-w-2xl text-sm font-medium text-slate-400 sm:text-base">
                Pick fighters, read stats, set wager, watch 500ms-turn Canvas battle unfold.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/10 px-5 py-3">
                <p className="text-xs font-black uppercase tracking-[0.22em] text-emerald-400">
                  Credits
                </p>
                <p className="text-3xl font-black text-emerald-300">
                  {credits.toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={handleAudioToggle}
                className={`rounded-2xl border px-5 py-3 text-left transition hover:scale-[1.02] ${
                  audioEnabled
                    ? "border-cyan-400 bg-cyan-400/15 text-cyan-200"
                    : "border-slate-700 bg-slate-900/80 text-slate-400"
                }`}
              >
                <p className="text-xs font-black uppercase tracking-[0.22em]">
                  Audio
                </p>
                <p className="text-xl font-black">{audioEnabled ? "On" : "Off"}</p>
              </button>
            </div>
          </div>
        </header>

        {phase === "selection" ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
            <RoosterSelector
              corner="red"
              selectedRooster={redRooster}
              onSelect={handleSelectRed}
            />
            <RoosterSelector
              corner="blue"
              selectedRooster={blueRooster}
              onSelect={handleSelectBlue}
            />
            <div className="lg:col-span-2">
              <BettingPanel
                redRooster={redRooster}
                blueRooster={blueRooster}
                credits={credits}
                onBetPlaced={handleBetPlaced}
              />
            </div>
          </div>
        ) : null}

        {canShowBattle ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <section className="rounded-3xl border border-slate-800 bg-black/35 p-4 shadow-2xl">
              <BattleArena
                r1={redRooster}
                r2={blueRooster}
                audioEnabled={audioEnabled}
                onLogEntry={handleLogEntry}
                onBattleEnd={handleBattleEnd}
              />
            </section>
            <BattleLog entries={logs} />
          </div>
        ) : null}

        {phase === "results" ? (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
            <section className="rounded-3xl border border-slate-800 bg-black/35 p-4 shadow-2xl">
              {redRooster && blueRooster ? (
                <BattleArenaPreview redRooster={redRooster} blueRooster={blueRooster} />
              ) : null}
            </section>
            <BattleLog entries={logs} />
          </div>
        ) : null}
      </div>

      {canShowResults ? (
        <ResultsScreen
          result={result}
          bet={bet}
          payout={payout}
          onNewBattle={handleNewBattle}
        />
      ) : null}
    </main>
  );
}

function BattleArenaPreview({
  redRooster,
  blueRooster,
}: {
  redRooster: Rooster;
  blueRooster: Rooster;
}) {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-slate-800 bg-slate-950/70 p-8 text-center">
      <p className="mb-3 text-xs font-black uppercase tracking-[0.3em] text-slate-500">
        Match Complete
      </p>
      <div className="flex flex-wrap items-center justify-center gap-4 text-2xl font-black uppercase text-white sm:text-4xl">
        <span className="text-red-400">{redRooster.name}</span>
        <span className="text-slate-600">vs</span>
        <span className="text-blue-400">{blueRooster.name}</span>
      </div>
    </div>
  );
}
