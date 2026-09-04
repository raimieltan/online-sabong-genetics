"use client";

import type { Chicken, CombatResult } from "@/lib/types";

interface CombatResultsScreenProps {
  result: CombatResult;
  playerChicken: Chicken;
  opponent: Chicken;
  onFightAgain: () => void;
  onHeal: () => void;
}

const OUTCOME_LABEL: Record<CombatResult["outcomeReason"], string> = {
  ko: "Knockout",
  timeout: "Decision",
  critical_injury: "Critical Injury",
};

export default function CombatResultsScreen({
  result,
  playerChicken,
  opponent,
  onFightAgain,
  onHeal,
}: CombatResultsScreenProps) {
  const didWin = result.winnerId === playerChicken.id;
  const playerInjured = result.injuredChickenId === playerChicken.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-slate-700 bg-gradient-to-br from-slate-950 via-gray-950 to-black p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
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
            {OUTCOME_LABEL[result.outcomeReason]} · Turn {result.totalTurns}
          </p>
        </div>

        {playerInjured && (
          <div className="mb-5 rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-center">
            <p className="text-sm font-black uppercase tracking-[0.2em] text-red-400">
              {playerChicken.name} suffered a critical injury
            </p>
            <p className="mt-1 text-xs text-slate-400">Heal before fighting again.</p>
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              {playerChicken.id === result.winnerId ? "Victor" : "Defeated"}
            </p>
            <p className="mt-1 text-lg font-black text-slate-100">{playerChicken.name}</p>
          </div>
          <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-4 text-center">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">
              {opponent.id === result.winnerId ? "Victor" : "Defeated"}
            </p>
            <p className="mt-1 text-lg font-black text-slate-100">{opponent.name}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {playerInjured ? (
            <button
              onClick={onHeal}
              className="flex-1 rounded-xl bg-amber-500 px-4 py-3 font-black uppercase tracking-wide text-neutral-900 hover:bg-amber-400"
            >
              Heal
            </button>
          ) : (
            <button
              onClick={onFightAgain}
              className="flex-1 rounded-xl bg-amber-500 px-4 py-3 font-black uppercase tracking-wide text-neutral-900 hover:bg-amber-400"
            >
              Fight Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
