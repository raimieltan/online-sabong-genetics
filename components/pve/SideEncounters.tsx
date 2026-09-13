"use client";

import Link from "next/link";
import type { BossListEntry } from "@/lib/pve/types";

const KIND_LABEL: Record<string, string> = { challenge: "Optional Challenge", invitational: "Invitational", special: "Special Encounter" };

export function SideEncounters({ entries }: { entries: BossListEntry[] }) {
  if (!entries.length) return null;

  console.log(entries)
  return (
    <section className="side-encounters" aria-label="Side Fights">
      <header><p>Beyond the road</p><h2>Side Fights</h2></header>
      <div className="side-encounters-grid">
        {entries.map((entry) => (
     
          <Link key={entry.boss.id} href={`/pve/${entry.boss.id}`} className={`side-encounter-card side-encounter-${entry.boss.presentation.nodeType}`}>
            <p>{KIND_LABEL[entry.boss.presentation.nodeType] ?? "Side Fight"}</p>
            <h3>{entry.boss.name}</h3>
            <span>{entry.boss.presentation.tagline}</span>
            {entry.progress.completed && <b>Cleared {entry.progress.clearCount > 1 ? `· ${entry.progress.clearCount}x` : ""}</b>}
          </Link>
        ))}
      </div>
    </section>
  );
}
