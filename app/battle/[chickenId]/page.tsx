"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import type { Chicken, CombatResult } from "@/lib/types";
import BattleCanvas from "@/components/BattleCanvas";
import CombatResultsScreen from "@/components/CombatResultsScreen";
import { ChickenViewer } from "@/components/chicken3d/ChickenViewer";

type Phase = "loading" | "ready" | "fighting" | "replaying" | "result" | "error";

export default function BattlePage({
  params,
}: {
  params: Promise<{ chickenId: string }>;
}) {
  const { chickenId } = use(params);

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [chicken, setChicken] = useState<Chicken | null>(null);
  const [opponent, setOpponent] = useState<Chicken | null>(null);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [log, setLog] = useState<CombatResult["log"]>([]);
  const [updatedChicken, setUpdatedChicken] = useState<Chicken | null>(null);
  const [creditsEarned, setCreditsEarned] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const chickenRes = await fetch(`/api/chickens/${chickenId}`);
      if (!chickenRes.ok) {
        if (!cancelled) {
          setError("Chicken not found");
          setPhase("error");
        }
        return;
      }
      const loadedChicken: Chicken = await chickenRes.json();

      const opponentRes = await fetch(`/api/chickens/${chickenId}/opponent`, { method: "POST" });
      if (!opponentRes.ok) {
        const body = await opponentRes.json().catch(() => ({}));
        if (!cancelled) {
          setError(body.error ?? "This chicken cannot battle right now");
          setPhase("error");
        }
        return;
      }
      const loadedOpponent: Chicken = await opponentRes.json();

      if (!cancelled) {
        setChicken(loadedChicken);
        setOpponent(loadedOpponent);
        setPhase("ready");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [chickenId]);

  async function handleFight() {
    if (!chicken || !opponent) return;
    setPhase("fighting");

    const res = await fetch(`/api/chickens/${chickenId}/fight`, {
      method: "POST",
      body: JSON.stringify({ opponent }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "The fight could not be run");
      setPhase("error");
      return;
    }

    const body = await res.json();
    setResult(body.result);
    setLog(body.log);
    setUpdatedChicken(body.chicken);
    setCreditsEarned(body.creditsEarned ?? 0);
    setPhase("replaying");
  }

  async function handleHeal() {
    const res = await fetch(`/api/chickens/${chickenId}/heal`, { method: "POST" });
    if (!res.ok) return;
    const healed: Chicken = await res.json();
    setChicken(healed);
    setResult(null);
    setLog([]);
    setPhase("loading");

    const opponentRes = await fetch(`/api/chickens/${chickenId}/opponent`, { method: "POST" });
    if (opponentRes.ok) {
      setOpponent(await opponentRes.json());
      setPhase("ready");
    } else {
      setPhase("error");
      setError("This chicken cannot battle right now");
    }
  }

  function handleFightAgain() {
    setResult(null);
    setLog([]);
    setPhase("loading");
    fetch(`/api/chickens/${chickenId}/opponent`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          setPhase("error");
          setError("This chicken cannot battle right now");
          return;
        }
        setOpponent(await res.json());
        setPhase("ready");
      });
  }

  if (phase === "loading") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink)">
        <p className="text-(--color-text-muted)">⚔️ Loading battle...</p>
      </main>
    );
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6">
        <div className="panel-wood rounded-lg border-t-2 border-red-800/60 p-6 text-center">
          <p className="text-red-400">{error}</p>
          <Link href="/coop" className="mt-4 inline-block text-(--color-gold-bright) hover:underline">
            ← Back to Coop
          </Link>
        </div>
      </main>
    );
  }

  if (!chicken || !opponent) return null;

  return (
    <main className="min-h-screen bg-(--color-ink) p-6">
      <div className="mx-auto max-w-3xl">
        <div className="panel-wood mb-4 flex items-center justify-between rounded-lg p-4">
          <Link href="/coop" className="text-sm text-(--color-gold-bright) hover:underline">
            ← Coop
          </Link>
          <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-(--foreground)">
            ⚔️ {chicken.name} <span className="text-(--color-text-muted)">vs</span> {opponent.name}
          </h1>
        </div>

        {(phase === "ready" || phase === "fighting") && (
          <div className="panel-wood flex flex-col items-center gap-6 rounded-lg p-6">
            <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-4 text-center">
              <div className="rounded-lg border border-sky-700/40 bg-black/25 p-4">
                <ChickenViewer chicken={chicken} interactive={false} className="h-28 w-full" />
                <p className="mt-1 font-display text-lg font-semibold text-(--foreground)">{chicken.name}</p>
                <p className="text-xs uppercase tracking-wide text-(--color-gold-bright)">
                  {chicken.fightingStyle}
                </p>
              </div>
              <span className="font-display text-2xl font-black text-(--color-text-muted)">VS</span>
              <div className="rounded-lg border border-rose-700/40 bg-black/25 p-4">
                <ChickenViewer chicken={opponent} interactive={false} className="h-28 w-full" />
                <p className="mt-1 font-display text-lg font-semibold text-(--foreground)">{opponent.name}</p>
                <p className="text-xs uppercase tracking-wide text-(--color-gold-bright)">
                  {opponent.fightingStyle}
                </p>
              </div>
            </div>
            <button
              onClick={handleFight}
              disabled={phase === "fighting"}
              className="rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-8 py-3 font-display font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {phase === "fighting" ? "Fighting..." : "⚔️ Fight"}
            </button>
          </div>
        )}

      {phase === "replaying" && (
        <BattleCanvas
          chickenA={chicken}
          chickenB={opponent}
          log={log}
          audioEnabled={false}
          onReplayEnd={() => setPhase("result")}
        />
      )}

      {phase === "result" && result && (
        <CombatResultsScreen
          result={result}
          playerChicken={updatedChicken ?? chicken}
          opponent={opponent}
          creditsEarned={creditsEarned}
          onFightAgain={handleFightAgain}
          onHeal={handleHeal}
        />
      )}
      </div>
    </main>
  );
}
