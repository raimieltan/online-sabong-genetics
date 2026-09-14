"use client";

import Link from "next/link";
import type { CSSProperties } from "react";

import type { BossListEntry, CampaignProgressView, PveCircuit } from "@/lib/pve/types";

type Props = { bosses: BossListEntry[]; circuits: readonly PveCircuit[]; campaign: CampaignProgressView; focusCircuitId?: string };

const NODE_ICON: Record<string, string> = { standard: "◆", gatekeeper: "♜", rival: "⚔", qualifier: "✦", championship: "♛", challenge: "!", special: "✵", invitational: "✉" };

export function CampaignMap({ bosses, circuits, campaign, focusCircuitId }: Props) {
  const visibleCircuits = focusCircuitId ? circuits.filter((c) => c.id === focusCircuitId) : circuits;
  return <section className="road-map" aria-label="Road to Glory campaign map">
    {visibleCircuits.map((circuit) => {
      const entries = circuit.bossIds.map((id) => bosses.find((entry) => entry.boss.id === id)).filter(Boolean) as BossListEntry[];
      const cleared = entries.filter((entry) => entry.progress.completed).length;
      const unlocked = campaign.unlockedCircuitIds.includes(circuit.id);
      return <article key={circuit.id} className={`road-circuit road-circuit-${circuit.environmentId} ${unlocked ? "" : "road-circuit-locked"}`}>
        <header className="road-circuit-header">
          <p>{circuit.chapter}</p><h2>{circuit.name}</h2><span>{cleared} / {entries.length} defeated</span>
          <p className="road-circuit-copy">{circuit.description}</p>
          {focusCircuitId && <Link href="/pve" className="road-back">← All circuits</Link>}
        </header>
        <div className="road-path">
          {entries.map((entry, index) => <CampaignNode key={entry.boss.id} entry={entry} index={index} />)}
        </div>
      </article>;
    })}
  </section>;
}

function CampaignNode({ entry, index }: { entry: BossListEntry; index: number }) {
  const { boss, progress } = entry;
  const type = boss.presentation.nodeType;
  const state = progress.completed ? "defeated" : progress.unlocked ? "available" : "locked";
  const body = <div className={`campaign-node campaign-node-${state} campaign-node-${type}`} style={{ "--node-offset": `${index % 2 ? 12 : -12}%` } as CSSProperties}>
    <span className="campaign-node-mark">{progress.completed ? "✓" : progress.unlocked ? NODE_ICON[type] : "🔒"}</span>
    {entry.rivalry.isRival && progress.unlocked && <span className="campaign-node-rivalry" title="Rivalry">⚔</span>}
    <div><p>{type.replace("-", " ")}</p><h3>{progress.unlocked || progress.completed ? boss.name : "Unknown fighter"}</h3><span>{progress.unlocked ? boss.styleLabel : "Requirement locked"}</span></div>
    {entry.rivalry.isRival && progress.unlocked && <b className="campaign-node-rivalry-record">{entry.rivalry.record.wins} — {entry.rivalry.record.losses}{entry.rivalry.deciderDue ? " · DECIDER" : ""}</b>}
    {progress.unlocked && !progress.completed && <b>Fight available</b>}
    {progress.completed && <b>Defeated {progress.clearCount > 1 ? `· ${progress.clearCount} clears` : ""}</b>}
  </div>;
  return <div className="road-node-wrap">{progress.unlocked ? <Link href={`/pve/${boss.id}`}>{body}</Link> : body}</div>;
}
