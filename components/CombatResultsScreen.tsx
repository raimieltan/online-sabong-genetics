"use client";

import type { Chicken, CombatResult } from "@/lib/types";

interface CombatResultsScreenProps {
  result: CombatResult;
  playerChicken: Chicken;
  opponent: Chicken;
  creditsEarned?: number;
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
  creditsEarned = 0,
  onFightAgain,
  onHeal,
}: CombatResultsScreenProps) {
  const didWin = result.winnerId === playerChicken.id;
  const playerInjured = result.injuredChickenId === playerChicken.id;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm">
      <div className="panel-wood max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl p-6 shadow-2xl sm:p-8">
        <div className="mb-6 text-center">
          <div
            className={`mb-4 inline-block rounded-2xl px-8 py-4 shadow-lg ${
              didWin
                ? "bg-gradient-to-r from-emerald-500 to-lime-400 shadow-emerald-950/40"
                : "bg-gradient-to-r from-red-700 to-red-900 shadow-red-950/40"
            }`}
          >
            <h2 className="font-display text-4xl font-bold uppercase tracking-[0.16em] text-black sm:text-5xl">
              {didWin ? "Win" : "Loss"}
            </h2>
          </div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-(--color-text-muted)">
            {OUTCOME_LABEL[result.outcomeReason]} · Turn {result.totalTurns}
          </p>
        </div>

        {didWin && creditsEarned > 0 && (
          <div className="mb-5 flex items-center justify-center gap-2 rounded-2xl border border-(--color-gold)/30 bg-(--color-gold)/10 p-3 text-center">
            <span className="text-lg leading-none">🪙</span>
            <p className="text-sm font-semibold text-(--color-gold-bright)">
              +{creditsEarned} Battle Credits
            </p>
          </div>
        )}

        {playerInjured && (
          <div className="mb-5 rounded-2xl border border-red-500/50 bg-red-500/10 p-4 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-red-400">
              {playerChicken.name} suffered a critical injury
            </p>
            <p className="mt-1 text-xs text-(--color-text-muted)">Heal before fighting again.</p>
          </div>
        )}

        <div className="mb-6 grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-(--color-gold)/20 bg-black/25 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--color-text-muted)">
              {playerChicken.id === result.winnerId ? "Victor" : "Defeated"}
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-(--foreground)">{playerChicken.name}</p>
          </div>
          <div className="rounded-2xl border border-(--color-gold)/20 bg-black/25 p-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-(--color-text-muted)">
              {opponent.id === result.winnerId ? "Victor" : "Defeated"}
            </p>
            <p className="mt-1 font-display text-lg font-semibold text-(--foreground)">{opponent.name}</p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          {playerInjured ? (
            <button
              onClick={onHeal}
              className="flex-1 rounded-xl bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-4 py-3 font-display font-semibold uppercase tracking-wide text-(--color-ink) hover:brightness-110"
            >
              Heal
            </button>
          ) : (
            <button
              onClick={onFightAgain}
              className="flex-1 rounded-xl bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-4 py-3 font-display font-semibold uppercase tracking-wide text-(--color-ink) hover:brightness-110"
            >
              Fight Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
