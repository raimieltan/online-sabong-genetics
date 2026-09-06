"use client";

import { useEffect, useMemo, useState } from "react";

import type { Chicken, Egg } from "@/lib/types";
import { DEFAULT_COOP_FILTERS, filterChickens } from "@/lib/coopFilters";

import { ChickenCard } from "./ChickenCard";
import { CoopFilters } from "./CoopFilters";

export default function CoopPage() {
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_COOP_FILTERS);

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

  const filteredChickens = useMemo(() => filterChickens(chickens, filters), [chickens, filters]);

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
      <div className="panel-wood mb-6 flex flex-wrap items-center justify-between gap-4 rounded-lg p-4">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-(--color-gold-bright)">
            🐔 Coop
          </h1>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            🥚 {eggs.length} incubating · 🐔 {chickens.length} chickens
          </p>
        </div>
        <button
          onClick={handleGenerate}
          className="rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-4 py-2 font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110"
        >
          + Generate Chicken
        </button>
      </div>

      {eggs.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-(--foreground)">
            <span className="rounded bg-black/30 px-2 py-0.5 text-base">🥚</span>
            Eggs
            <span className="text-sm font-normal text-(--color-text-muted)">({eggs.length})</span>
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
            {eggs.map((egg) => (
              <div key={egg.id} className="panel-wood rounded-lg p-4 text-center">
                <p className="text-3xl">🥚</p>
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  {egg.sex === "rooster" ? "🐓" : "🐔"} {egg.sex} · Gen {egg.generation}
                </p>
                <button
                  onClick={() => handleHatch(egg.id)}
                  className="mt-3 rounded bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-3 py-1 text-xs font-semibold text-(--color-ink) shadow shadow-black/40 hover:brightness-110"
                >
                  Hatch
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-(--foreground)">
        <span className="rounded bg-black/30 px-2 py-0.5 text-base">🐔</span>
        Coop
        <span className="text-sm font-normal text-(--color-text-muted)">({chickens.length})</span>
      </h2>

      <CoopFilters
        filters={filters}
        onChange={setFilters}
        resultCount={filteredChickens.length}
        totalCount={chickens.length}
      />

      {filteredChickens.length === 0 ? (
        <p className="rounded-lg border border-dashed border-(--color-gold)/20 p-8 text-center text-(--color-text-muted)">
          No chickens match your filters.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {filteredChickens.map((chicken) => (
            <ChickenCard
              key={chicken.id}
              chicken={chicken}
              onAgeUp={() => handleAgeUp(chicken.id)}
              onRetire={() => handleRetire(chicken.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
