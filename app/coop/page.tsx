"use client";

import { useEffect, useState } from "react";

import type { Chicken, Egg } from "@/lib/types";

import { CoopHUD, type CoopMode } from "./CoopHUD";
import { VillageView } from "./VillageView";
import { ManageView } from "./ManageView";

export default function CoopPage() {
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState<CoopMode>("village");

  useEffect(() => {
    Promise.all([
      fetch("/api/chickens").then((res) => res.json()),
      fetch("/api/eggs").then((res) => res.json()),
    ])
      .then(([chickenData, eggData]: [Chicken[], Egg[]]) => {
        setChickens(chickenData);
        setEggs(eggData);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    const res = await fetch("/api/chickens", { method: "POST" });
    const chicken: Chicken = await res.json();
    setChickens((prev) => [...prev, chicken]);
  }

  async function handleHatch(eggId: string) {
    const res = await fetch(`/api/eggs/${eggId}/hatch`, { method: "POST" });
    if (!res.ok) return;
    const chick: Chicken = await res.json();
    setEggs((prev) => prev.filter((egg) => egg.id !== eggId));
    setChickens((prev) => [...prev, chick]);
  }

  async function handleAgeUp(chickenId: string) {
    const res = await fetch(`/api/chickens/${chickenId}/age-up`, { method: "POST" });
    if (!res.ok) return;
    const updated: Chicken = await res.json();
    setChickens((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  async function handleRetire(chickenId: string) {
    const res = await fetch(`/api/chickens/${chickenId}/retire`, { method: "POST" });
    if (!res.ok) return;
    const updated: Chicken = await res.json();
    setChickens((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink)">
        <p className="text-(--color-text-muted)">🐔 Loading coop...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-(--color-ink) p-6">
      <div className="mb-6">
        <CoopHUD
          eggCount={eggs.length}
          chickenCount={chickens.length}
          mode={mode}
          onModeChange={setMode}
          onGenerate={handleGenerate}
        />
      </div>

      {mode === "village" ? (
        <VillageView
          chickens={chickens}
          eggs={eggs}
          onHatch={handleHatch}
          onAgeUp={handleAgeUp}
          onRetire={handleRetire}
          onGenerate={handleGenerate}
        />
      ) : (
        <ManageView
          chickens={chickens}
          eggs={eggs}
          onHatch={handleHatch}
          onAgeUp={handleAgeUp}
          onRetire={handleRetire}
        />
      )}
    </main>
  );
}
