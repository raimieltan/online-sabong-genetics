"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { Chicken, CombatResult } from "@/lib/types";
import type { PveEncounterDefinition } from "@/lib/combat";
import type { BattleReport } from "@/lib/combat/battleReport";
import ContinuousBattle from "@/components/combat-v2/ContinuousBattle";
import { PostFightOverlay } from "@/components/battle/postfight/PostFightOverlay";
import { MatchupScreen } from "@/components/battle/MatchupScreen";
import { setPlayerCredits } from "@/lib/playerStore";

type Phase = "loading" | "ready" | "fighting" | "result" | "error";
type FightResponse = { result?: CombatResult; chicken?: Chicken; battleReport?: BattleReport; creditsEarned?: number; credits?: number };
const AUDIO_STORAGE_KEY = "rooster-arena-audio-enabled";

export default function BattlePage({ params }: { params: Promise<{ chickenId: string }> }) {
  const { chickenId } = use(params);
  const [phase, setPhase] = useState<Phase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [chicken, setChicken] = useState<Chicken | null>(null);
  const [opponent, setOpponent] = useState<Chicken | null>(null);
  const [encounter, setEncounter] = useState<PveEncounterDefinition | null>(null);
  const [result, setResult] = useState<CombatResult | null>(null);
  const [updatedChicken, setUpdatedChicken] = useState<Chicken | null>(null);
  const [creditsEarned, setCreditsEarned] = useState(0);
  const [battleReport, setBattleReport] = useState<BattleReport | null>(null);
  const [audioEnabled, setAudioEnabled] = useState(() => typeof window === "undefined" ? true : window.localStorage.getItem(AUDIO_STORAGE_KEY) !== "false");

  function toggleAudio() {
    setAudioEnabled(previous => { const next = !previous; window.localStorage.setItem(AUDIO_STORAGE_KEY, String(next)); return next; });
  }

  const completePresentation = useCallback(() => setPhase("result"), []);
  const fightAgain = useCallback(() => {
    setResult(null);
    setBattleReport(null);
    setPhase("ready");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const chickenRes = await fetch(`/api/chickens/${chickenId}`);
      if (!chickenRes.ok) { if (!cancelled) { setError("Chicken not found"); setPhase("error"); } return; }
      const loadedChicken: Chicken = await chickenRes.json();
      const opponentRes = await fetch(`/api/chickens/${chickenId}/opponent`, { method: "POST" });
      if (!opponentRes.ok) { if (!cancelled) { setError("This chicken cannot battle right now"); setPhase("error"); } return; }
      const body = await opponentRes.json() as { opponent: Chicken; encounter: PveEncounterDefinition };
      if (!cancelled) { setChicken(loadedChicken); setOpponent(body.opponent); setEncounter(body.encounter); setPhase("ready"); }
    })();
    return () => { cancelled = true; };
  }, [chickenId]);

  async function handleFight() {
    if (!chicken || !opponent) return;
    setPhase("fighting");
    const response = await fetch(`/api/chickens/${chickenId}/fight`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ opponent }) });
    if (!response.ok) { setError("The fight could not be started"); setPhase("error"); return; }
    const body: FightResponse = await response.json();
    setResult(body.result ?? null); setUpdatedChicken(body.chicken ?? null); setCreditsEarned(body.creditsEarned ?? 0); setBattleReport(body.battleReport ?? null);
    if (typeof body.credits === "number") setPlayerCredits(body.credits);
  }

  if (phase === "loading") return <main className="flex min-h-screen items-center justify-center bg-(--color-ink) text-(--color-text-muted)">⚔️ Loading battle...</main>;
  if (phase === "error") return <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6"><div className="panel-wood rounded-lg p-6 text-center"><p className="text-red-400">{error}</p><Link href="/coop" className="mt-4 inline-block text-(--color-gold-bright) hover:underline">← Back to Coop</Link></div></main>;
  if (!chicken || !opponent) return null;
  if (phase === "fighting" && !result) return <main className="flex min-h-screen items-center justify-center bg-(--color-ink) text-(--color-text-muted)">Starting the arena...</main>;
  if ((phase === "fighting" || phase === "result") && result) return <main className="min-h-screen bg-(--color-ink)"><div className="relative"><ContinuousBattle chickenA={chicken} chickenB={opponent} autoStart audioEnabled={audioEnabled} onToggleAudio={toggleAudio} onComplete={completePresentation} />{phase === "result" && <PostFightOverlay result={result} playerChicken={updatedChicken ?? chicken} creditsEarned={creditsEarned} battleReport={battleReport ?? undefined} onContinue={fightAgain} />}</div></main>;
  return <main className="min-h-screen bg-(--color-ink)"><MatchupScreen chicken={chicken} opponent={opponent} encounter={encounter} fighting={false} onFight={handleFight} eyebrow="PVE Challenge" title={encounter?.name} subtitle={encounter?.description} matchInfo="Arena exhibition" /></main>;
}
