"use client";

import { useEffect, useState } from "react";
import type { BossListEntry, CampaignProgressView, PveCircuit } from "@/lib/pve/types";
import { CampaignMap } from "@/components/pve/CampaignMap";
import { CampaignFeed } from "@/components/pve/CampaignFeed";
import { SideEncounters } from "@/components/pve/SideEncounters";

export default function PveLadderPage() {
  const [bosses, setBosses] = useState<BossListEntry[]>([]);
  const [circuits, setCircuits] = useState<PveCircuit[]>([]);
  const [campaign, setCampaign] = useState<CampaignProgressView | null>(null);
  const [sideEncounters, setSideEncounters] = useState<BossListEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pve/bosses")
      .then((r) => r.json())
      .then((b) => { setBosses(b.bosses ?? []); setCircuits(b.circuits ?? []); setCampaign(b.campaign ?? null); setSideEncounters(b.sideEncounters ?? []); })
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="road-to-glory min-h-screen">
      <header className="road-hero">
        <p>Career campaign</p><h1>The Road to Glory</h1><span>From backyard fights to the grand championship.</span>
      </header>
      {loading || !campaign ? <p className="py-16 text-center text-(--color-text-muted)">Preparing the road…</p> : <>
        <CampaignFeed />
        <CampaignMap bosses={bosses} circuits={circuits} campaign={campaign} />
        <SideEncounters entries={sideEncounters} />
        <aside className="road-progress"><div><p>Campaign progress</p><b>{campaign.completedCount} / {campaign.totalCount} fighters defeated</b></div><div><p>Circuit reputation</p><b>{campaign.reputation.toLocaleString()}</b></div><div><p>Current rank</p><b>#{campaign.rank}</b></div></aside>
      </>}
    </main>
  );
}
