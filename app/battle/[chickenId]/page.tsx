"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import type { Chicken, CombatResult } from "@/lib/types";
import type { PveEncounterDefinition } from "@/lib/combat";
import type { BattleReport } from "@/lib/combat/battleReport";
import BattleCanvas from "@/components/BattleCanvas";
import CombatResultsScreen from "@/components/CombatResultsScreen";
import { MatchupScreen } from "@/components/battle/MatchupScreen";
import { setPlayerCredits } from "@/lib/playerStore";

type Phase = "loading" | "ready" | "fighting" | "replaying" | "result" | "error";

const AUDIO_STORAGE_KEY = "rooster-arena-audio-enabled";

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
  const [encounter, setEncounter] = useState<PveEncounterDefinition | null>(null);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [log, setLog] = useState<CombatResult["log"]>([]);
  const [updatedChicken, setUpdatedChicken] = useState<Chicken | null>(null);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [battleReport, setBattleReport] = useState<BattleReport | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = window.localStorage.getItem(AUDIO_STORAGE_KEY);
    return stored === null ? true : stored === "true";
  });

  function toggleAudio() {
    setAudioEnabled((prev) => {
      const next = !prev;
      window.localStorage.setItem(AUDIO_STORAGE_KEY, String(next));
      return next;
    });
  }

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
      const { opponent: loadedOpponent, encounter: loadedEncounter } = (await opponentRes.json()) as {
        opponent: Chicken;
        encounter: PveEncounterDefinition;
      };

      if (!cancelled) {
        setChicken(loadedChicken);
        setOpponent(loadedOpponent);
        setEncounter(loadedEncounter);
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
    if (typeof body.credits === "number") setPlayerCredits(body.credits);
    setBattleReport(body.battleReport ?? null);
    setPhase("replaying");
  }

  function handleFightAgain() {
    if (updatedChicken) {
      setChicken(updatedChicken);
      setUpdatedChicken(null);
    }
    setResult(null);
    setLog([]);
    setBattleReport(null);
    setPhase("loading");
    fetch(`/api/chickens/${chickenId}/opponent`, { method: "POST" })
      .then(async (res) => {
        if (!res.ok) {
          setPhase("error");
          setError("This chicken cannot battle right now");
          return;
        }
        const { opponent: nextOpponent, encounter: nextEncounter } = (await res.json()) as {
          opponent: Chicken;
          encounter: PveEncounterDefinition;
        };
        setOpponent(nextOpponent);
        setEncounter(nextEncounter);
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
    <main className="min-h-screen bg-(--color-ink)">
      <div className={phase === "replaying" ? "mx-auto p-6 pb-0" : "mx-auto p-6"}>
        <div className="panel-wood mb-4 flex items-center justify-between w-full rounded-lg p-4">
          <Link href="/coop" className="text-sm text-(--color-gold-bright) hover:underline">
            ← Coop
          </Link>
          <h1 className="flex items-center gap-2 font-display text-xl font-semibold text-(--foreground)">
            ⚔️ {chicken.name} <span className="text-(--color-text-muted)">vs</span> {opponent.name}
          </h1>
          <button
            type="button"
            onClick={toggleAudio}
            aria-label={audioEnabled ? "Mute audio" : "Unmute audio"}
            aria-pressed={audioEnabled}
            className="rounded-full border border-(--color-gold)/30 bg-black/30 px-3 py-1.5 text-lg leading-none hover:bg-black/50"
          >
            {audioEnabled ? "🔊" : "🔇"}
          </button>
        </div>

        {(phase === "ready" || phase === "fighting") && (
          <MatchupScreen
            chicken={chicken}
            opponent={opponent}
            encounter={encounter}
            fighting={phase === "fighting"}
            onFight={handleFight}
          />
        )}

      {phase === "result" && result && (
        <CombatResultsScreen
          result={result}
          playerChicken={updatedChicken ?? chicken}
          opponent={opponent}
          creditsEarned={creditsEarned}
          battleReport={battleReport ?? undefined}
          onFightAgain={handleFightAgain}
        />
      )}
      </div>

      {phase === "replaying" && (
        <BattleCanvas
          chickenA={chicken}
          chickenB={opponent}
          log={log}
          audioEnabled={audioEnabled}
          onReplayEnd={() => setPhase("result")}
        />
      )}
    </main>
  );
}
