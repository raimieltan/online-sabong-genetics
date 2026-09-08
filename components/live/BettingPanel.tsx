"use client";

import { useState } from "react";

import { BET_PRESETS, type BetSide } from "@/lib/live/bets";
import type { Chicken } from "@/lib/types";

type Props = {
  chickenA: Chicken;
  chickenB: Chicken;
  oddsA: number;
  oddsB: number;
  credits: number;
  /** Milliseconds remaining before the window locks and the fight starts. */
  msRemaining: number;
  /** Null once a bet has been placed for this match — Support buttons then show a "Bet placed" state instead of taking new input. */
  placedBet: { side: BetSide; amount: number } | null;
  onPlaceBet: (side: BetSide, amount: number) => void;
};

/** Pre-fight odds board + bet slip for /live, shown during the "betting" phase before each fight. */
export function BettingPanel({
  chickenA,
  chickenB,
  oddsA,
  oddsB,
  credits,
  msRemaining,
  placedBet,
  onPlaceBet,
}: Props) {
  const [amount, setAmount] = useState<number>(BET_PRESETS[0]);
  const secondsLeft = Math.max(0, Math.ceil(msRemaining / 1000));

  const canAffordAmount = amount <= credits;
  const locked = placedBet !== null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 flex justify-center p-4 sm:p-6">
      <div className="panel-wood flex w-full max-w-2xl flex-col gap-4 rounded-2xl border-t-2 border-(--color-gold)/40 p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Betting Open</p>
          <div className="flex items-center gap-2">
            <span className="font-comic text-2xl text-(--color-gold-bright)">{secondsLeft}s</span>
            <span className="text-xs uppercase tracking-[0.2em] text-(--color-text-muted)">to lock</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-red-800/40 bg-red-950/20 p-3 text-center">
            <p className="truncate text-sm font-semibold text-(--foreground)">{chickenA.name}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-(--color-text-muted)">Meron</p>
            <p className="mt-1 font-comic text-3xl text-red-400">{oddsA.toFixed(2)}x</p>
          </div>
          <div className="rounded-xl border border-blue-800/40 bg-blue-950/20 p-3 text-center">
            <p className="truncate text-sm font-semibold text-(--foreground)">{chickenB.name}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-(--color-text-muted)">Wala</p>
            <p className="mt-1 font-comic text-3xl text-blue-400">{oddsB.toFixed(2)}x</p>
          </div>
        </div>

        {locked ? (
          <p className="text-center text-sm text-(--color-gold-bright)">
            🪙 Bet placed: {placedBet.amount} credits on {placedBet.side === "A" ? chickenA.name : chickenB.name}
          </p>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2">
              {BET_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(preset)}
                  className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                    amount === preset
                      ? "border-(--color-gold-bright) bg-(--color-gold)/20 text-(--color-gold-bright)"
                      : "border-(--color-gold)/30 bg-black/30 text-(--color-text-muted) hover:bg-black/50"
                  } ${preset > credits ? "cursor-not-allowed opacity-40" : ""}`}
                  disabled={preset > credits}
                >
                  {preset}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setAmount(credits)}
                disabled={credits <= 0}
                className={`rounded-full border px-4 py-1.5 text-sm font-semibold transition ${
                  amount === credits && credits > 0
                    ? "border-(--color-gold-bright) bg-(--color-gold)/20 text-(--color-gold-bright)"
                    : "border-(--color-gold)/30 bg-black/30 text-(--color-text-muted) hover:bg-black/50"
                } ${credits <= 0 ? "cursor-not-allowed opacity-40" : ""}`}
              >
                Max
              </button>
              <span className="ml-1 text-xs text-(--color-text-muted)">🪙 {credits}</span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onPlaceBet("A", amount)}
                disabled={!canAffordAmount}
                className="rounded-xl bg-red-700 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-red-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Support Meron
              </button>
              <button
                type="button"
                onClick={() => onPlaceBet("B", amount)}
                disabled={!canAffordAmount}
                className="rounded-xl bg-blue-700 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Support Wala
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
