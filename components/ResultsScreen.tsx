"use client";

import type { BattleResult, Bet } from "@/lib/types";

interface ResultsScreenProps {
  result: BattleResult;
  bet: Bet;
  payout: number;
  onNewBattle: () => void;
}

export default function ResultsScreen({
  result,
  bet,
  payout,
  onNewBattle,
}: ResultsScreenProps) {
  const didWin = bet.roosterId === result.winner.id;
  const netChange = didWin ? payout - bet.amount : -bet.amount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border-2 border-slate-700 bg-gradient-to-br from-slate-950 via-gray-950 to-black p-6 shadow-2xl sm:p-8">
        <div className="mb-7 text-center">
          <div
            className={`mb-4 inline-block rounded-2xl px-8 py-4 shadow-lg ${
              didWin
                ? "bg-gradient-to-r from-emerald-500 to-lime-400 shadow-emerald-950/40"
                : "bg-gradient-to-r from-red-600 to-orange-500 shadow-red-950/40"
            }`}
          >
            <h2 className="text-4xl font-black uppercase tracking-[0.16em] text-black sm:text-5xl">
              {didWin ? "Win" : "Loss"}
            </h2>
          </div>
          <p className="text-sm font-black uppercase tracking-[0.24em] text-slate-500">
            {result.outcomeReason === "ko" ? "Knockout" : "Timeout decision"} · Turn {result.totalTurns}
          </p>
        </div>

        <div className="mb-5 rounded-2xl border border-yellow-500/50 bg-yellow-500/10 p-5">
          <p className="mb-1 text-xs font-black uppercase tracking-[0.24em] text-yellow-500">
            Victor
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-3xl font-black text-yellow-300">
                {result.winner.name}
              </h3>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-500">
                {result.winner.type}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-black text-emerald-400">
                {Math.max(0, Math.floor(result.winner.hp))} HP
              </div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Remaining
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
          <p className="mb-1 text-xs font-black uppercase tracking-[0.24em] text-slate-500">
            Defeated
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h3 className="text-2xl font-black text-slate-300">
                {result.loser.name}
              </h3>
              <p className="text-sm font-bold uppercase tracking-[0.16em] text-slate-600">
                {result.loser.type}
              </p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-black text-slate-500">
                {Math.max(0, Math.floor(result.loser.hp))} HP
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-3">
          <StatCard label="Turns" value={String(result.totalTurns)} />
          <StatCard label="Duration" value={`${(result.totalTurns * 0.5).toFixed(1)}s`} />
          <StatCard label="Red HP" value={String(Math.floor(result.r1FinalHp))} />
          <StatCard label="Blue HP" value={String(Math.floor(result.r2FinalHp))} />
        </div>

        <div className="mb-6 rounded-2xl border-2 border-cyan-500/40 bg-cyan-500/10 p-5">
          <div className="space-y-3">
            <Row label="Bet" value={bet.amount.toLocaleString()} />
            <Row label="Pick" value={bet.roosterName} />
            <Row label="Odds" value={`${bet.odds.toFixed(2)}x`} />
            <div className="border-t border-cyan-500/25 pt-4">
              <div className="flex items-center justify-between gap-4">
                <span className="text-sm font-black uppercase tracking-[0.22em] text-cyan-300">
                  {didWin ? "Net Gain" : "Net Loss"}
                </span>
                <span
                  className={`text-3xl font-black ${didWin ? "text-emerald-400" : "text-red-400"}`}
                >
                  {netChange > 0 ? "+" : ""}
                  {netChange.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={onNewBattle}
          className="w-full rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-4 text-lg font-black uppercase tracking-[0.2em] text-white shadow-lg shadow-blue-950/40 transition hover:scale-[1.02] hover:from-cyan-400 hover:to-blue-500"
        >
          New Battle
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
        {label}
      </span>
      <span className="text-lg font-black text-slate-200">{value}</span>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-black/30 p-4 text-center">
      <div className="text-2xl font-black text-white">{value}</div>
      <div className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
    </div>
  );
}
