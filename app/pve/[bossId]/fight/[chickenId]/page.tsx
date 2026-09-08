"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Chicken, CombatResult } from "@/lib/types";
import type { BossListEntry } from "@/lib/pve/types";
import type { BattleReport } from "@/lib/combat/battleReport";
import BattleCanvas from "@/components/BattleCanvas";
import CombatResultsScreen from "@/components/CombatResultsScreen";

type Phase = "loading" | "ready" | "fighting" | "replaying" | "result" | "error";

const AUDIO_STORAGE_KEY = "rooster-arena-audio-enabled";

type FightResponse = {
  won: boolean;
  result: CombatResult;
  log: CombatResult["log"];
  bossFighter: Chicken;
  rewards: { credits: number; firstClear: boolean; experienceMultiplier: number };
  chicken: Chicken;
  summary: { durationTurns: number; outcomeReason: string; analysis: string | null };
  battleReport: BattleReport;
};

function stars(n: number): string {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
}

export default function BossFightPage({
  params,
}: {
  params: Promise<{ bossId: string; chickenId: string }>;
}) {
  const { bossId, chickenId } = use(params);
  const router = useRouter();

  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [chicken, setChicken] = useState<Chicken | null>(null);
  const [entry, setEntry] = useState<BossListEntry | null>(null);
  const [fight, setFight] = useState<FightResponse | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(AUDIO_STORAGE_KEY) !== "false";
  });

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [chickenRes, bossesRes] = await Promise.all([
        fetch(`/api/chickens/${chickenId}`),
        fetch("/api/pve/bosses"),
      ]);
      if (!chickenRes.ok) {
        if (!cancelled) { setError("Rooster not found"); setPhase("error"); }
        return;
      }
      const loadedChicken: Chicken = await chickenRes.json();
      const { bosses } = (await bossesRes.json()) as { bosses: BossListEntry[] };
      const bossEntry = bosses.find((e) => e.boss.id === bossId) ?? null;
      if (!bossEntry || !bossEntry.progress.unlocked) {
        if (!cancelled) { setError("This boss is locked"); setPhase("error"); }
        return;
      }
      if (!cancelled) {
        setChicken(loadedChicken);
        setEntry(bossEntry);
        setPhase("ready");
      }
    }
    load();
    return () => { cancelled = true; };
  }, [bossId, chickenId]);

  async function startFight() {
    setPhase("fighting");
    const res = await fetch(`/api/pve/bosses/${bossId}/fight`, {
      method: "POST",
      body: JSON.stringify({ chickenId }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "The fight could not be run");
      setPhase("error");
      return;
    }
    const body = (await res.json()) as FightResponse;
    setFight(body);
    setPhase("replaying");
  }

  async function handleHeal() {
    await fetch(`/api/chickens/${chickenId}/heal`, { method: "POST" });
    router.push(`/pve/${bossId}`);
  }

  if (phase === "loading") {
    return <main className="flex min-h-screen items-center justify-center bg-(--color-ink) text-(--color-text-muted)">⚔️ Loading…</main>;
  }

  if (phase === "error") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6">
        <div className="panel-wood rounded-lg border-t-2 border-red-800/60 p-6 text-center">
          <p className="text-red-400">{error}</p>
          <Link href="/pve" className="mt-4 inline-block text-(--color-gold-bright) hover:underline">← Back to PvE</Link>
        </div>
      </main>
    );
  }

  if (!chicken || !entry) return null;
  const { boss } = entry;

  return (
    <main className="min-h-screen bg-(--color-ink)">
      <div className={phase === "replaying" ? "mx-auto p-6 pb-0" : "mx-auto max-w-2xl p-6"}>
        <div className="panel-wood mb-4 flex items-center justify-between rounded-lg p-4">
          <Link href={`/pve/${bossId}`} className="text-sm text-(--color-gold-bright) hover:underline">← Boss</Link>
          <h1 className="font-display text-lg font-semibold text-(--foreground)">
            ⚔️ {chicken.name} <span className="text-(--color-text-muted)">vs</span> {boss.name}
          </h1>
          <button
            type="button"
            onClick={() => {
              setAudioEnabled((p) => {
                window.localStorage.setItem(AUDIO_STORAGE_KEY, String(!p));
                return !p;
              });
            }}
            className="rounded-full border border-(--color-gold)/30 bg-black/30 px-3 py-1.5 text-lg leading-none hover:bg-black/50"
          >
            {audioEnabled ? "🔊" : "🔇"}
          </button>
        </div>

        {(phase === "ready" || phase === "fighting") && (
          <div className="panel-wood rounded-lg p-6 text-center">
            <p className="text-(--color-gold-bright)">{stars(boss.difficulty)}</p>
            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-(--color-text-muted)">
              {boss.styleLabel} · {boss.behaviorLabel}
            </p>
            <p className="mt-4 font-display text-2xl font-semibold text-(--foreground)">
              {chicken.name} vs {boss.name}
            </p>
            <p className="mt-2 text-sm text-(--color-text-muted)">{boss.description}</p>
            <button
              type="button"
              disabled={phase === "fighting"}
              onClick={startFight}
              className="mt-6 rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-8 py-3 font-display font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110 disabled:opacity-60"
            >
              {phase === "fighting" ? "Fighting…" : "Start Battle"}
            </button>
          </div>
        )}

        {phase === "result" && fight && (
          <CombatResultsScreen
            result={fight.result}
            playerChicken={fight.chicken}
            opponent={fight.bossFighter}
            creditsEarned={fight.rewards.credits}
            battleReport={fight.battleReport}
            onFightAgain={() => window.location.reload()}
            onHeal={handleHeal}
          />
        )}
      </div>

      {phase === "replaying" && fight && (
        <BattleCanvas
          chickenA={chicken}
          chickenB={fight.bossFighter}
          log={fight.log}
          audioEnabled={audioEnabled}
          onReplayEnd={() => setPhase("result")}
        />
      )}
    </main>
  );
}
