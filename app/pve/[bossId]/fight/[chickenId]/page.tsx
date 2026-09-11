"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MatchupScreen } from "@/components/battle/MatchupScreen";
import { PostFightOverlay } from "@/components/battle/postfight/PostFightOverlay";
import ContinuousBattle from "@/components/combat-v2/ContinuousBattle";
import type { Chicken } from "@/lib/types";
import type { BossListEntry } from "@/lib/pve/types";
import type { BossFightResult } from "@/lib/pve/service";
import { campaignConsequence } from "@/lib/pve/presentation";

type Phase = "loading" | "tape" | "intro" | "battle" | "result" | "error";
type Start = { sessionId: string; matchSeed: number; chicken: Chicken; bossFighter: Chicken };

export default function BossFightPage({ params }: { params: Promise<{ bossId: string; chickenId: string }> }) {
  const { bossId, chickenId } = use(params);
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading"); const [entry, setEntry] = useState<BossListEntry | null>(null); const [start, setStart] = useState<Start | null>(null); const [outcome, setOutcome] = useState<BossFightResult | null>(null); const [presentationComplete, setPresentationComplete] = useState(false); const [error, setError] = useState<string | null>(null);
  useEffect(() => { let cancelled = false; async function prepare() { const data = await fetch("/api/pve/bosses").then((r) => r.json()); const found = data.bosses.find((item: BossListEntry) => item.boss.id === bossId); if (cancelled) return; setEntry(found ?? null); if (!found?.progress.unlocked) { setError("This encounter is locked."); setPhase("error"); return; } const response = await fetch(`/api/pve/bosses/${bossId}/fight/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chickenId }) }); if (cancelled) return; if (!response.ok) { setError((await response.json().catch(() => ({}))).error ?? "Unable to prepare this fight."); setPhase("error"); return; } setStart(await response.json()); setPhase("tape"); } void prepare(); return () => { cancelled = true; }; }, [bossId, chickenId]);
  const resolve = useCallback(async () => { if (!start) return; for (;;) { const response = await fetch(`/api/pve/bosses/${bossId}/fight/${start.sessionId}/step`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); if (!response.ok) { setError("The fight connection was lost."); setPhase("error"); return; } const step = await response.json(); if (step.fightOver) { setOutcome(step.outcome); return; } } }, [bossId, start]);
  useEffect(() => { if (phase !== "intro") return; const timer = window.setTimeout(() => { setPhase("battle"); void resolve(); }, 5200); return () => window.clearTimeout(timer); }, [phase, resolve]);
  if (phase === "loading") return <main className="min-h-screen bg-(--color-ink) py-20 text-center text-(--color-text-muted)">Preparing the event…</main>;
  if (phase === "error" || !entry) return <main className="min-h-screen bg-(--color-ink) py-20 text-center"><p className="text-red-300">{error ?? "Encounter unavailable."}</p><Link className="mt-4 inline-block text-(--color-gold-bright)" href={`/pve/${bossId}`}>Return to encounter</Link></main>;
  const p = entry.boss.presentation;
  if (phase === "tape" && start) return <main className="pve-tape"><MatchupScreen chicken={start.chicken} opponent={start.bossFighter} fighting={false} onFight={() => setPhase("intro")} eyebrow={p.venue.name} title="Tale of the Tape" subtitle={`${p.nodeType} · ${entry.boss.name}`} matchInfo={`${p.venue.location} · ${p.title}`} /></main>;
  if (!start) return null;
  if (phase === "intro") return <ArenaIntro player={start.chicken} boss={start.bossFighter} entry={entry} />;
  const consequence = outcome ? campaignConsequence(outcome.won, entry.boss, outcome.rewards.firstClear) : null;
  return <main className="min-h-screen bg-(--color-ink)"><div className="relative"><ContinuousBattle chickenA={start.chicken} chickenB={start.bossFighter} matchSeed={start.matchSeed} autoStart onComplete={() => { setPresentationComplete(true); setPhase("result"); }} />{phase === "result" && presentationComplete && outcome && consequence && <PostFightOverlay result={outcome.result} playerChicken={outcome.chicken as Chicken} creditsEarned={outcome.rewards.credits} battleReport={outcome.battleReport} actionLabel="Return to Road" onContinue={() => router.push("/pve")} campaign={{ ...consequence, bossName: entry.boss.name, unlocked: outcome.won && outcome.rewards.firstClear ? `Next fight: ${nextBossName(entry.boss.order)}` : undefined }} />}</div></main>;
}

function ArenaIntro({ player, boss, entry }: { player: Chicken; boss: Chicken; entry: BossListEntry }) {
  const p = entry.boss.presentation;
  const [beat, setBeat] = useState(0);
  useEffect(() => { const timer = window.setInterval(() => setBeat((current) => Math.min(3, current + 1)), 1300); return () => window.clearInterval(timer); }, []);
  return <main className="arena-intro">
    {beat === 0 && <div className="arena-intro-beat"><p>{p.venue.name}</p><h1>{p.venue.location}</h1></div>}
    {beat === 1 && <div className="arena-intro-beat"><p>{p.nodeType} · {p.title}</p><h1>{boss.name}</h1><span>{p.record.wins}–{p.record.losses} · {p.record.kos} KO</span>{p.quote && <blockquote>“{p.quote}”</blockquote>}</div>}
    {beat === 2 && <div className="arena-intro-beat"><p>Challenger</p><h1>{player.name}</h1><span>{player.record.wins}–{player.record.losses} · {player.record.koTko} KO</span></div>}
    {beat === 3 && <div className="arena-intro-fight">FIGHT</div>}
  </main>;
}
function nextBossName(order: number) { return order >= 20 ? "The Road is complete" : "A new challenger"; }
