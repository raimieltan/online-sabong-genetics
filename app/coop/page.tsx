"use client";

import { useEffect, useState } from "react";

import type { Chicken } from "@/lib/types";

import { ChickenCard } from "./ChickenCard";

export default function CoopPage() {
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [selected, setSelected] = useState<Chicken | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/chickens")
      .then((res) => res.json())
      .then((data: Chicken[]) => setChickens(data))
      .finally(() => setLoading(false));
  }, []);

  async function handleGenerate() {
    const res = await fetch("/api/chickens", { method: "POST" });
    const chicken: Chicken = await res.json();
    setChickens((prev) => [...prev, chicken]);
  }

  if (loading) {
    return <p className="p-6 text-neutral-400">Loading coop...</p>;
  }

  return (
    <main className="p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-neutral-100">Coop</h1>
        <button
          onClick={handleGenerate}
          className="rounded bg-amber-500 px-4 py-2 font-semibold text-neutral-900 hover:bg-amber-400"
        >
          Generate Chicken
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {chickens.map((chicken) => (
          <ChickenCard key={chicken.id} chicken={chicken} onSelect={() => setSelected(chicken)} />
        ))}
      </div>

      {selected && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/70"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-w-md rounded bg-neutral-900 p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 className="mb-2 text-xl font-bold text-neutral-100">{selected.name}</h2>
            <p className="text-neutral-400">
              {selected.sex} · Gen {selected.generation}
            </p>

            <h3 className="mt-4 font-semibold text-neutral-200">IV</h3>
            <ul className="text-sm text-neutral-400">
              {Object.entries(selected.iv).map(([stat, value]) => (
                <li key={stat}>
                  {stat}: {value}
                </li>
              ))}
            </ul>

            <h3 className="mt-4 font-semibold text-neutral-200">EV</h3>
            <ul className="text-sm text-neutral-400">
              {Object.entries(selected.ev).map(([stat, value]) => (
                <li key={stat}>
                  {stat}: {value}
                </li>
              ))}
            </ul>

            <h3 className="mt-4 font-semibold text-neutral-200">Traits</h3>
            <p className="text-sm text-neutral-400">
              {selected.traits.length ? selected.traits.map((t) => t.name).join(", ") : "None"}
            </p>

            <h3 className="mt-4 font-semibold text-neutral-200">Record</h3>
            <p className="text-sm text-neutral-400">
              {selected.record.wins}W - {selected.record.losses}L · {selected.record.championships}{" "}
              championships
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
