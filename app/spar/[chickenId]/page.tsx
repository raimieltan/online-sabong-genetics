"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";

import ContinuousBattle from "@/components/combat-v2/ContinuousBattle";
import { PageHeader } from "@/components/PageHeader";
import type { MatchResult } from "@/lib/combat-v2";
import type { Chicken } from "@/lib/types";

type Phase = "loading" | "fighting" | "result" | "error";
type StartResponse = { chickenA: Chicken; chickenB: Chicken };

/** Non-persistent practice combat using the same V2 coaching contract. */
export default function SparPage({ params }: { params: Promise<{ chickenId: string }> }) {
  const { chickenId } = use(params);
  const [phase, setPhase] = useState<Phase>("loading");
  const [fighters, setFighters] = useState<[Chicken, Chicken] | null>(null);
  const [seed, setSeed] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [error, setError] = useState("");

  const start = useCallback(async () => {
    setPhase("loading");
    setResult(null);
    const response = await fetch("/api/spar/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chickenId }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(body.error ?? "Could not start a spar right now.");
      setPhase("error");
      return;
    }
    const started = body as StartResponse;
    setFighters([started.chickenA, started.chickenB]);
    setSeed(crypto.getRandomValues(new Uint32Array(1))[0]);
    setPhase("fighting");
  }, [chickenId]);

  useEffect(() => { void start(); }, [start]);

  if (phase === "loading") return <main className="flex min-h-screen items-center justify-center bg-(--color-ink) text-(--color-text-muted)">Preparing the sparring yard…</main>;
  if (phase === "error") return <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6"><div className="panel-wood rounded-lg p-6 text-center"><p className="text-red-300">{error}</p><Link href={`/chicken/${chickenId}`} className="mt-4 inline-block text-(--color-gold-bright)">Return to fighter</Link></div></main>;
  if (!fighters) return null;

  return <main className="min-h-screen bg-(--color-ink)">
    <div className="absolute left-4 top-3 z-40 max-w-sm">
      <PageHeader eyebrow="Sparring Yard" title="Practice Fight" description={<span>Four coaching instructions · no resource meter · no record kept</span>} />
    </div>
    <ContinuousBattle key={seed} chickenA={fighters[0]} chickenB={fighters[1]} matchSeed={seed} autoStart onComplete={completed => { if ("durationTicks" in completed) setResult(completed); setPhase("result"); }} />
    {phase === "result" && result && <div className="absolute inset-x-0 bottom-5 z-50 mx-auto flex w-fit items-center gap-3 rounded-xl border border-(--color-gold)/40 bg-black/80 p-3 backdrop-blur">
      <span className="text-sm text-(--foreground)">{result.winnerId ? `${fighters.find(fighter => fighter.id === result.winnerId)?.name ?? "A fighter"} wins` : "Draw"}</span>
      <button type="button" onClick={() => void start()} className="rounded bg-(--color-gold) px-4 py-2 text-xs font-bold uppercase text-(--color-ink)">Spar again</button>
      <Link href={`/chicken/${chickenId}`} className="px-3 py-2 text-xs uppercase text-(--color-text-muted)">Exit</Link>
    </div>}
  </main>;
}
