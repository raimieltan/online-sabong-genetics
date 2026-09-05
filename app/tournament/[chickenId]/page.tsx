"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import type { Chicken, CombatResult } from "@/lib/types";

type Phase = "loading" | "ready" | "running" | "result" | "error";

const ROUND_LABELS = ["Quarterfinal", "Semifinal", "Final"];

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
  const [placement, setPlacement] = useState<number | null>(null);
  const [tokensAwarded, setTokensAwarded] = useState(0);

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
    setPlacement(body.placement);
    setTokensAwarded(body.tokensAwarded);
    setChicken(body.chicken);
    setPhase("result");
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
            Enter {chicken?.name} into a randomly matched 8-bird bracket. Fights resolve automatically.
          </p>
          <button
            onClick={handleEnter}
            disabled={phase === "running"}
            className="rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-8 py-3 font-display font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === "running" ? "Fighting the bracket..." : "⚔️ Enter Tournament"}
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
