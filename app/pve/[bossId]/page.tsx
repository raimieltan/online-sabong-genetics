"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChickenViewer } from "@/components/chicken3d/ChickenViewer";
import { buildMatchupAssessment } from "@/lib/pve/presentation";
import type { Chicken } from "@/lib/types";
import type { BossListEntry } from "@/lib/pve/types";

const BATTLE_STAGES = ["young_adult", "adult", "prime", "senior"];
type View = "encounter" | "scout" | "fighters" | "confirm";
const eligible = (c: Chicken) => c.sex === "rooster" && !c.injured && BATTLE_STAGES.includes(c.growthStage);

export default function BossEncounterPage({ params }: { params: Promise<{ bossId: string }> }) {
  const { bossId } = use(params); const router = useRouter();
  const [entry, setEntry] = useState<BossListEntry | null>(null); const [chickens, setChickens] = useState<Chicken[]>([]); const [view, setView] = useState<View>("encounter"); const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    Promise.all([
      fetch("/api/pve/bosses").then((r) => r.json()),
      fetch("/api/chickens").then((r) => r.json()),
    ]).then(([pve, roster]) => {
      const allEncounters: BossListEntry[] = [
        ...(pve.bosses ?? []),
        ...(pve.sideEncounters ?? []),
      ];

      setEntry(
        allEncounters.find(
          (item) => item.boss.id === bossId
        ) ?? null
      );

      setChickens(roster);
    });
  }, [bossId]);
  const selected = useMemo(() => chickens.find((c) => c.id === selectedId) ?? null, [chickens, selectedId]);
  if (!entry) return <main className="min-h-screen bg-(--color-ink) py-20 text-center text-(--color-text-muted)">Loading encounter…</main>;
  const { boss, progress } = entry; const p = boss.presentation;
  console.log(boss)
  if (!progress.unlocked) return <main className="encounter-page min-h-screen"><section className="encounter-lock"><p>Unknown fighter</p><h1>Locked encounter</h1><span>Defeat the previous opponent to reveal this challenge.</span><Link href="/pve">Return to the road</Link></section></main>;
  return <main className="encounter-page min-h-screen">
    <nav className="encounter-nav"><Link href={`/pve/circuit/${p.circuitId}`}>← {p.circuitId} circuit</Link><span>{progress.completed ? "Previously defeated" : "Fight available"}</span></nav>
    <section className="encounter-hero"><div className="encounter-copy"><p>{p.venue.name} · Boss {boss.order}</p><h1>{boss.name}</h1><h2>{p.title}</h2><span className="encounter-type">{p.nodeType.replace("-", " ")} · {boss.styleLabel}</span>{p.quote && <blockquote>“{p.quote}”</blockquote>}<p className="encounter-description">{p.tagline}</p><div className="encounter-actions"><button onClick={() => setView(view === "scout" ? "encounter" : "scout")}>Scout opponent</button><button className="gold" onClick={() => setView("fighters")}>Choose your fighter</button></div></div><div className="encounter-model"><ChickenViewer chicken={{ ...buildBossVisual(boss.id), sex: "rooster" }} interactive={false} cameraDistance={3.2} className="h-full w-full" /></div></section>
    {(view === "scout" || view === "encounter") && <section className="encounter-details"><div><p>Scout report</p><h3>{p.scoutReport}</h3><span>Scouting confidence: {progress.clearCount ? "92" : "72"}%</span></div><div><p>Known for</p>{p.knownFor.map((item) => <span key={item}>◆ {item}</span>)}</div><div><p>Fight history</p><b>{p.record.wins} W · {p.record.losses} L · {p.record.kos} KO</b><span>{p.reputation}</span></div></section>}
    {entry.rivalry.isRival && <section className="rivalry-panel"><p>Rivalry</p><h3>Your fighter — {boss.name}</h3><b>{entry.rivalry.record.wins} — {entry.rivalry.record.losses}</b>{entry.rivalry.deciderDue && <span className="rivalry-decider">NEXT FIGHT: DECIDER</span>}</section>}
    {entry.escalationDeltas.length > 0 && <section className="rematch-panel"><p>Since your last fight</p>{entry.escalationDeltas.map((delta, i) => <span key={i}>{delta.label} {delta.direction === "up" ? "↑" : "↓"}</span>)}</section>}
    {view === "scout" && <section className="tendency-panel">{p.tendencies.map((item) => <div key={item.label}><p>{item.label}</p><b>{item.value}</b></div>)}</section>}
    {view === "fighters" && <section className="fighter-drawer"><header><p>Choose a fighter</p><h2>Who carries your name?</h2></header><div className="fighter-grid">{chickens.filter(eligible).map((c) => { const assessment = buildMatchupAssessment(c, boss); return <button key={c.id} onClick={() => { setSelectedId(c.id); setView("confirm"); }} className="fighter-card"><div className="model-stage h-40"><ChickenViewer chicken={c} interactive={false} cameraDistance={3.5} className="h-full w-full" /></div><h3>{c.name}</h3><p>{c.fightingStyle} · {c.record.wins}W–{c.record.losses}L · {c.record.koTko} KO</p><span>Condition {c.condition}%</span><b className={`matchup-${assessment.toLowerCase().replace(" ", "-")}`}>{assessment}</b></button>; })}</div>{!chickens.some(eligible) && <p className="text-(--color-text-muted)">No healthy, battle-ready rooster is available.</p>}</section>}
    {view === "confirm" && selected && <section className="fighter-confirm"><div><p>Your fighter</p><h2>{selected.name}</h2><span>{selected.fightingStyle} · {selected.record.wins}W–{selected.record.losses}L · {selected.record.koTko} KO</span><p>Condition {selected.condition}% · Morale {selected.morale} · {selected.traits.slice(0, 2).map((t) => t.name).join(" · ") || "No signature traits"}</p></div><div className="confirm-vs">VS<br /><small>{boss.name}</small></div><div><button onClick={() => setView("fighters")}>Change fighter</button><button className="gold" onClick={() => router.push(`/pve/${boss.id}/fight/${selected.id}`)}>Confirm fighter</button></div></section>}
  </main>;
}

function buildBossVisual(id: string) { const hue = [...id].reduce((n, char) => n + char.charCodeAt(0), 0) % 70; return { colorScheme: { body: `hsl(${20 + hue}, 45%, 30%)`, hackle: "#c9a24f", wings: "#24120b", tail: "#171411", comb: "#b8100f", beak: "#d9a83a", shanks: "#cc9e33", pattern: "SOLID" as const, patternColor: "#4a3521" }, physical: { scale: 1, bodyGirth: 1, bodyLength: 1, chest: 1, neckLength: 1, neckThick: 1, headSize: 1, combSize: 1, wattleSize: 1, beakLength: 1, wingSpan: 1, wingSize: 1, legLength: 1, legThick: 1, footSize: 1, tailLength: 1, tailSpread: 1, tailArc: 1 }, mutations: {}, growthStage: "adult" as const }; }
