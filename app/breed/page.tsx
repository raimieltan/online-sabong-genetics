"use client";

import { useEffect, useState } from "react";

import type { Chicken, Egg } from "@/lib/types";

export default function BreedPage() {
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [fatherId, setFatherId] = useState("");
  const [motherId, setMotherId] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/chickens").then((res) => res.json()).then(setChickens);
    fetch("/api/eggs").then((res) => res.json()).then(setEggs);
  }, []);

  const roosters = chickens.filter((c) => c.sex === "rooster");
  const hens = chickens.filter((c) => c.sex === "hen");

  async function handleBreed() {
    setError(null);
    const res = await fetch("/api/breed", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fatherId, motherId }),
    });

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Breeding failed");
      return;
    }

    const egg: Egg = await res.json();
    setEggs((prev) => [...prev, egg]);
  }

  return (
    <main className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-neutral-100">Breed</h1>

      <div className="mb-6 flex gap-4">
        <select
          value={fatherId}
          onChange={(event) => setFatherId(event.target.value)}
          className="rounded bg-neutral-800 p-2 text-neutral-100"
        >
          <option value="">Select rooster</option>
          {roosters.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select
          value={motherId}
          onChange={(event) => setMotherId(event.target.value)}
          className="rounded bg-neutral-800 p-2 text-neutral-100"
        >
          <option value="">Select hen</option>
          {hens.map((h) => (
            <option key={h.id} value={h.id}>
              {h.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleBreed}
          disabled={!fatherId || !motherId}
          className="rounded bg-amber-500 px-4 py-2 font-semibold text-neutral-900 hover:bg-amber-400 disabled:opacity-50"
        >
          Breed
        </button>
      </div>

      {error && <p className="mb-4 text-red-400">{error}</p>}

      <h2 className="mb-2 text-xl font-bold text-neutral-100">Nest</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {eggs.map((egg) => (
          <div key={egg.id} className="rounded border border-neutral-800 bg-neutral-900 p-4">
            <p className="font-semibold text-neutral-100">Egg · {egg.sex}</p>
            <p className="text-sm text-neutral-400">
              Gen {egg.generation} · {egg.status}
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
