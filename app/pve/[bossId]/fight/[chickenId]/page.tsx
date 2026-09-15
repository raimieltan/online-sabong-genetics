"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MatchupScreen } from "@/components/battle/MatchupScreen";
import { PostFightOverlay } from "@/components/battle/postfight/PostFightOverlay";
import ContinuousBattle from "@/components/combat-v2/ContinuousBattle";
import type { Chicken } from "@/lib/types";
import type { BossListEntry } from "@/lib/pve/types";
import type { BossFightResult } from "@/lib/pve/service";
import { campaignConsequence } from "@/lib/pve/presentation";

type Phase = "loading" | "configure" | "tape" | "intro" | "battle" | "result" | "error";
type Start = {
  sessionId: string;
  matchSeed: number;
  chicken: Chicken;
  bossFighter: Chicken;
  rivalry: import("@/lib/pve/rivalry").RivalryStatus;
  escalationDeltas: import("@/lib/pve/escalation").EscalationDelta[];
  combatView: Record<string, unknown>;
};

export default function BossFightPage({ params }: { params: Promise<{ bossId: string; chickenId: string }> }) {
  const { bossId, chickenId } = use(params);
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("loading"); const [entry, setEntry] = useState<BossListEntry | null>(null); const [start, setStart] = useState<Start | null>(null); const [outcome, setOutcome] = useState<BossFightResult | null>(null); const [presentationComplete, setPresentationComplete] = useState(false); const [error, setError] = useState<string | null>(null);
  const [combatConfig, setCombatConfig] = useState<{ coachingMode: "MANUAL" | "AUTO"; openingCommand: "PRESS" | "WAIT" | "COUNTER" | "RECOVER"; disconnectPolicy: "KEEP_INSTRUCTION" | "AUTO_COACH" }>({ coachingMode: "MANUAL", openingCommand: "WAIT", disconnectPolicy: "KEEP_INSTRUCTION" });
  const [battleView, setBattleView] = useState<Record<string, unknown> | null>(null);
  useEffect(() => {
    let cancelled = false; async function prepare() {
      const data = await fetch("/api/pve/bosses").then((r) => r.json());

      const allEncounters: BossListEntry[] = [
        ...(data.bosses ?? []),
        ...(data.sideEncounters ?? []),
      ];

      const found = allEncounters.find(
        (item) => item.boss.id === bossId
      );

      if (cancelled) return; setEntry(found ?? null); if (!found?.progress.unlocked) { setError("This encounter is locked."); setPhase("error"); return; } setPhase("configure");
    } void prepare(); return () => { cancelled = true; };
  }, [bossId, chickenId]);
  async function prepareFight() {
    setPhase("loading");
    const response = await fetch(`/api/pve/bosses/${bossId}/fight/start`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chickenId, ...combatConfig }) });
    if (!response.ok) { setError((await response.json().catch(() => ({}))).error ?? "Unable to prepare this fight."); setPhase("error"); return; }
    setStart(await response.json()); setPhase("tape");
  }
  if (phase === "loading") return <main className="min-h-screen bg-(--color-ink) py-20 text-center text-(--color-text-muted)">Preparing the event…</main>;
  if (phase === "error" || !entry) return <main className="min-h-screen bg-(--color-ink) py-20 text-center"><p className="text-red-300">{error ?? "Encounter unavailable."}</p><Link className="mt-4 inline-block text-(--color-gold-bright)" href={`/pve/${bossId}`}>Return to encounter</Link></main>;
  if (phase === "configure") return <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6 text-(--foreground)"><section className="panel-wood w-full max-w-xl rounded-xl p-7"><p className="text-xs uppercase tracking-[.25em] text-(--color-gold-bright)">{entry.boss.name}</p><h1 className="mt-2 font-display text-3xl">Set the corner</h1><div className="mt-6 grid gap-4 sm:grid-cols-3"><label className="text-xs uppercase">Coach<select className="mt-1 w-full rounded bg-black/50 p-2" value={combatConfig.coachingMode} onChange={event => setCombatConfig({ ...combatConfig, coachingMode: event.target.value as "MANUAL" | "AUTO" })}><option value="MANUAL">Manual</option><option value="AUTO">Auto-Coach</option></select></label><label className="text-xs uppercase">Opening<select className="mt-1 w-full rounded bg-black/50 p-2" value={combatConfig.openingCommand} onChange={event => setCombatConfig({ ...combatConfig, openingCommand: event.target.value as typeof combatConfig.openingCommand })}>{["PRESS", "WAIT", "COUNTER", "RECOVER"].map(command => <option key={command}>{command}</option>)}</select></label><label className="text-xs uppercase">Disconnect<select className="mt-1 w-full rounded bg-black/50 p-2" value={combatConfig.disconnectPolicy} onChange={event => setCombatConfig({ ...combatConfig, disconnectPolicy: event.target.value as "KEEP_INSTRUCTION" | "AUTO_COACH" })}><option value="KEEP_INSTRUCTION">Keep instruction</option><option value="AUTO_COACH">Auto-Coach</option></select></label></div><button type="button" onClick={() => void prepareFight()} className="mt-7 w-full rounded-lg bg-(--color-gold) px-4 py-3 font-display font-bold uppercase text-(--color-ink)">Prepare matchup</button></section></main>;
  const p = entry.boss.presentation;
  if (phase === "tape" && start) return <main className="pve-tape"><MatchupScreen chicken={start.chicken} opponent={start.bossFighter} fighting={false} onFight={() => setPhase("intro")} eyebrow={p.venue.name} title="Tale of the Tape" subtitle={start.rivalry.isRival ? `RIVALRY · ${start.rivalry.record.wins}–${start.rivalry.record.losses}${start.rivalry.deciderDue ? " · DECIDER" : ""}` : `${p.nodeType} · ${entry.boss.name}`} matchInfo={`${p.venue.location} · ${p.title}`} /></main>;
  if (!start) return null;
  if (phase === "intro") return <ArenaIntro player={start.chicken} boss={start.bossFighter} entry={entry} start={start} onFightStart={async () => {
    const response = await fetch(`/api/combat/sessions/${start.sessionId}/begin`, { method: "POST" }).catch(() => null);
    if (response?.ok) setBattleView(await response.json());
    // Enter the arena even if the explicit handoff was dropped. Its first sync
    // will activate a still-CREATED session and retry transient failures.
    setPhase("battle");
  }} />;
  const consequence = outcome ? campaignConsequence(outcome.won, entry.boss, outcome.rewards.firstClear, outcome.rivalry) : null;
  return <main className="min-h-screen bg-(--color-ink)"><div className="relative"><ContinuousBattle sessionId={start.sessionId} initialView={(battleView ?? start.combatView) as never} onComplete={(result, settlement) => { const payload = settlement as unknown as BossFightResult | null; if (payload) setOutcome({ ...payload, result: (payload as unknown as { legacyResult: BossFightResult["result"] }).legacyResult, won: (result as { winnerId: string | null }).winnerId === start.chicken.id, bossFighter: start.bossFighter, rivalry: start.rivalry } as BossFightResult); setPresentationComplete(true); setPhase("result"); }} />{phase === "result" && presentationComplete && outcome && consequence && <PostFightOverlay result={outcome.result} playerChicken={outcome.chicken as Chicken} creditsEarned={outcome.rewards.credits} battleReport={outcome.battleReport} actionLabel="Return to Road" onContinue={() => router.push("/pve")} campaign={{ ...consequence, bossName: entry.boss.name, unlocked: outcome.won && outcome.rewards.firstClear ? `Next fight: ${nextBossName(entry.boss.order)}` : undefined }} />}</div></main>;
}

const NARRATIVE_BEATS = 3;
const COUNTDOWN_STEPS = ["3", "2", "1", "FIGHT!"];

function ArenaIntro({ player, boss, entry, start, onFightStart }: { player: Chicken; boss: Chicken; entry: BossListEntry; start: Start; onFightStart: () => void }) {
  const p = entry.boss.presentation;
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (beat >= NARRATIVE_BEATS) return;
    const timer = window.setTimeout(() => setBeat((current) => current + 1), 1300);
    return () => window.clearTimeout(timer);
  }, [beat]);
  // The countdown's own clock — not the narrative beats above — is what
  // fires `onFightStart`, so the server's combat clock begins at the exact
  // real moment "FIGHT!" appears, regardless of how the narrative timed out.
  const countdownStep = beat - NARRATIVE_BEATS;
  useEffect(() => {
    if (countdownStep < 0 || countdownStep >= COUNTDOWN_STEPS.length) return;
    if (countdownStep === COUNTDOWN_STEPS.length - 1) onFightStart();
    const timer = window.setTimeout(() => setBeat((current) => current + 1), countdownStep === COUNTDOWN_STEPS.length - 1 ? 700 : 800);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownStep]);
  return <main className="arena-intro">
    {beat === 0 && <div className="arena-intro-beat"><p>{p.venue.name}</p><h1>{p.venue.location}</h1></div>}
    {beat === 1 && <div className="arena-intro-beat"><p>{start.rivalry.isRival ? "Rivalry" : p.nodeType} · {p.title}</p><h1>{boss.name}</h1><span>{p.record.wins}–{p.record.losses} · {p.record.kos} KO</span>{start.rivalry.isRival && <span className="arena-intro-rivalry">{start.rivalry.record.wins}–{start.rivalry.record.losses}{start.rivalry.deciderDue ? " · DECIDER" : ""}</span>}{start.escalationDeltas.length > 0 && <span className="arena-intro-escalation">{start.escalationDeltas.map((d) => d.label).join(" · ")} ↑</span>}{p.quote && <blockquote>“{p.quote}”</blockquote>}</div>}
    {beat === 2 && <div className="arena-intro-beat"><p>Challenger</p><h1>{player.name}</h1><span>{player.record.wins}–{player.record.losses} · {player.record.koTko} KO</span></div>}
    {countdownStep >= 0 && countdownStep < COUNTDOWN_STEPS.length && <div className="arena-intro-fight arena-intro-countdown" key={countdownStep}>{COUNTDOWN_STEPS[countdownStep]}</div>}
  </main>;
}
function nextBossName(order: number) { return order >= 20 ? "The Road is complete" : "A new challenger"; }
