"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import type { Chicken, Egg, GeneticStatKey } from "@/lib/types";
import { canTrain } from "@/lib/growth";
import { ENERGY_PER_TRAIN } from "@/lib/training";
import { DEFAULT_COOP_FILTERS, filterChickens } from "@/lib/coopFilters";

import { ChickenViewer } from "@/components/chicken3d/ChickenViewer";

import { ChickenCard } from "./ChickenCard";
import { CoopFilters } from "./CoopFilters";

export default function CoopPage() {
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [selected, setSelected] = useState<Chicken | null>(null);
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

  async function handleTrain(chickenId: string, stat: GeneticStatKey) {
    const res = await fetch(`/api/chickens/${chickenId}/train`, {
      method: "POST",
      body: JSON.stringify({ stat }),
    });
    if (!res.ok) return;
    const updated: Chicken = await res.json();
    setChickens((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  async function handleRest(chickenId: string) {
    const res = await fetch(`/api/chickens/${chickenId}/rest`, { method: "POST" });
    if (!res.ok) return;
    const updated: Chicken = await res.json();
    setChickens((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    setSelected((prev) => (prev && prev.id === updated.id ? updated : prev));
  }

  async function handleSell(chickenId: string) {
    const res = await fetch(`/api/chickens/${chickenId}/sell`, { method: "POST" });
    if (!res.ok) return;
    setChickens((prev) => prev.filter((c) => c.id !== chickenId));
    setSelected((prev) => (prev && prev.id === chickenId ? null : prev));
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
              onSelect={() => setSelected(chicken)}
              onAgeUp={() => handleAgeUp(chicken.id)}
              onRetire={() => handleRetire(chicken.id)}
            />
          ))}
        </div>
      )}

      {selected && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
          onClick={() => setSelected(null)}
        >
          <div
            className="panel-parchment max-h-[90vh] w-full max-w-md overflow-y-auto rounded-lg p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <ChickenViewer chicken={selected} className="mb-2 h-56 w-full rounded-lg bg-(--color-ink)" />

            <div className="flex items-center gap-2 border-b border-(--color-parchment-dark) pb-3">
              <span className="text-2xl">{selected.sex === "rooster" ? "🐓" : "🐔"}</span>
              <div>
                <h2 className="font-display text-xl font-semibold">{selected.name}</h2>
                <p className="text-sm opacity-70">
                  {selected.sex} · Gen {selected.generation}
                </p>
              </div>
            </div>

            <h3 className="mt-4 flex items-center gap-1 font-display font-semibold">🧬 IV</h3>
            <ul className="text-sm opacity-80">
              {Object.entries(selected.iv).map(([stat, value]) => (
                <li key={stat}>
                  {stat}: {value}
                </li>
              ))}
            </ul>

            <div className="mt-4 flex items-center justify-between">
              <h3 className="flex items-center gap-1 font-display font-semibold">
                💪 Training <span className="opacity-60">· ⚡ {selected.energy}/100</span>
              </h3>
              {selected.energy < 100 && (
                <button
                  onClick={() => handleRest(selected.id)}
                  className="rounded bg-black/10 px-2 py-1 text-xs font-semibold hover:bg-black/20"
                >
                  Rest
                </button>
              )}
            </div>
            <ul className="text-sm opacity-80">
              {Object.entries(selected.ev).map(([stat, value]) => (
                <li key={stat} className="mt-1 flex items-center justify-between gap-2">
                  <span>
                    {stat}: {value}
                  </span>
                  {canTrain(selected.growthStage) && (
                    <button
                      onClick={() => handleTrain(selected.id, stat as GeneticStatKey)}
                      disabled={selected.energy < ENERGY_PER_TRAIN}
                      className="rounded bg-black/10 px-2 py-0.5 text-xs font-semibold text-amber-800 hover:bg-black/20 disabled:cursor-not-allowed disabled:text-neutral-400 disabled:hover:bg-black/10"
                    >
                      Train
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <h3 className="mt-4 flex items-center gap-1 font-display font-semibold">✨ Traits</h3>
            <p className="text-sm opacity-80">
              {selected.traits.length ? selected.traits.map((t) => t.name).join(", ") : "None"}
            </p>

            <h3 className="mt-4 flex items-center gap-1 font-display font-semibold">🏆 Record</h3>
            <p className="text-sm opacity-80">
              {selected.record.wins}W - {selected.record.losses}L · {selected.record.championships}{" "}
              championships
            </p>

            <Link
              href={`/pedigree/${selected.id}`}
              className="mt-4 flex items-center justify-center gap-1.5 rounded bg-black/10 px-3 py-2 text-sm font-semibold hover:bg-black/20"
            >
              🌳 View Pedigree
            </Link>

            <button
              onClick={() => {
                if (confirm(`Sell ${selected.name} for Battle Credits? This can't be undone.`)) {
                  handleSell(selected.id);
                }
              }}
              className="mt-2 flex w-full items-center justify-center gap-1.5 rounded bg-red-900/20 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-900/30"
            >
              🪙 Sell Chicken
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
