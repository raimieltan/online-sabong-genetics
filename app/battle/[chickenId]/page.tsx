"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import type { Chicken, CombatResult } from "@/lib/types";
import BattleCanvas from "@/components/BattleCanvas";
import CombatResultsScreen from "@/components/CombatResultsScreen";

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
    return <main className="p-6 text-neutral-400">Loading battle...</main>;
  }

  if (phase === "error") {
    return (
      <main className="p-6">
        <p className="text-red-400">{error}</p>
        <Link href="/coop" className="mt-4 inline-block text-amber-400 hover:underline">
          Back to Coop
        </Link>
      </main>
    );
  }

  if (!chicken || !opponent) return null;

  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/coop" className="text-sm text-amber-400 hover:underline">
          ← Coop
        </Link>
        <h1 className="text-xl font-bold text-neutral-100">
          {chicken.name} vs {opponent.name}
        </h1>
      </div>

      {(phase === "ready" || phase === "fighting") && (
        <div className="flex flex-col items-center gap-4">
          <div className="grid w-full grid-cols-2 gap-4 text-center text-sm text-neutral-400">
            <div>
              <p className="text-lg font-black text-neutral-100">{chicken.name}</p>
              <p className="uppercase tracking-wide text-amber-400">{chicken.fightingStyle}</p>
            </div>
            <div>
              <p className="text-lg font-black text-neutral-100">{opponent.name}</p>
              <p className="uppercase tracking-wide text-amber-400">{opponent.fightingStyle}</p>
            </div>
          </div>
          <button
            onClick={handleFight}
            disabled={phase === "fighting"}
            className="rounded bg-amber-500 px-6 py-3 font-bold text-neutral-900 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {phase === "fighting" ? "Fighting..." : "Fight"}
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
          onFightAgain={handleFightAgain}
          onHeal={handleHeal}
        />
      )}
    </main>
  );
}
