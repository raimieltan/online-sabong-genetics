"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import { CampaignMap } from "@/components/pve/CampaignMap";
import type { BossListEntry, CampaignProgressView, PveCircuit } from "@/lib/pve/types";

export default function CircuitPage({ params }: { params: Promise<{ circuitId: string }> }) {
  const { circuitId } = use(params);
  const [data, setData] = useState<{ bosses: BossListEntry[]; circuits: PveCircuit[]; campaign: CampaignProgressView } | null>(null);
  useEffect(() => { fetch("/api/pve/bosses").then((r) => r.json()).then(setData); }, []);
  const circuit = data?.circuits.find((item) => item.id === circuitId);
  if (!data) return <main className="road-to-glory min-h-screen py-16 text-center text-(--color-text-muted)">Loading circuit…</main>;
  if (!circuit) return <main className="road-to-glory min-h-screen py-16 text-center"><p>Unknown circuit.</p><Link href="/pve">Return to the road</Link></main>;
  return <main className="road-to-glory min-h-screen"><header className="road-hero"><p>{circuit.chapter}</p><h1>{circuit.name}</h1><span>{circuit.subtitle}</span></header><CampaignMap bosses={data.bosses} circuits={data.circuits} campaign={data.campaign} focusCircuitId={circuitId} /></main>;
}
