"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { canBreed } from "@/lib/growth";
import type { Chicken, Egg } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { ParentCard } from "./ParentCard";
import { OffspringPreview } from "./OffspringPreview";

const BREED_COST = 500;

export default function BreedPage() {
  return (
    <Suspense fallback={null}>
      <BreedPageContent />
    </Suspense>
  );
}

function BreedPageContent() {
  const searchParams = useSearchParams();
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [fatherId, setFatherId] = useState(searchParams.get("fatherId") ?? "");
  const [motherId, setMotherId] = useState(searchParams.get("motherId") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [breeding, setBreeding] = useState(false);

  useEffect(() => {
    fetch("/api/chickens").then((res) => res.json()).then(setChickens);
    fetch("/api/eggs").then((res) => res.json()).then(setEggs);
  }, []);

  const roosters = chickens.filter((c) => c.sex === "rooster" && canBreed(c.growthStage));
  const hens = chickens.filter((c) => c.sex === "hen" && canBreed(c.growthStage));
  const father = roosters.find((r) => r.id === fatherId);
  const mother = hens.find((h) => h.id === motherId);

  async function handleBreed() {
    setError(null);
    setBreeding(true);
    try {
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
      setFatherId("");
      setMotherId("");
    } finally {
      setBreeding(false);
    }
  }

  return (
    <main className="min-h-screen bg-(--color-ink) p-6">
      <PageHeader
        eyebrow="Bloodline Pairing"
        title="🥚 Breeding"
        description={<Link href="/coop" className="hover:underline">← Back to Coop</Link>}
        right={<p className="text-sm text-(--color-text-muted)">
          🐓 {roosters.length} eligible roosters · 🐔 {hens.length} eligible hens
        </p>}
      />

      <div className="mx-auto mb-10 max-w-5xl">
        <div className="grid grid-cols-1 items-start gap-6 sm:grid-cols-[1fr_auto_1fr]">
          <ParentCard
            role="father"
            label="Father"
            chicken={father}
            options={roosters}
            value={fatherId}
            onChange={setFatherId}
          />

          <div className="flex flex-row items-center justify-center gap-4 py-2 sm:flex-col sm:gap-3 sm:pt-24">
            <span className="text-4xl drop-shadow-[0_0_10px_rgba(240,198,116,0.6)]">💗</span>
            <span className="text-3xl">🥚</span>
            <button
              onClick={handleBreed}
              disabled={!fatherId || !motherId || breeding}
              className="whitespace-nowrap rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-6 py-2.5 font-display font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:from-neutral-700 disabled:to-neutral-700 disabled:text-neutral-400 disabled:shadow-none"
            >
              {breeding ? "Breeding…" : "Breed"}
              <span className="ml-2 text-xs font-normal opacity-80">🪙 {BREED_COST}</span>
            </button>
          </div>

          <ParentCard
            role="mother"
            label="Mother"
            chicken={mother}
            options={hens}
            value={motherId}
            onChange={setMotherId}
          />
        </div>

        {error && <p className="mt-3 text-center text-sm text-red-400">{error}</p>}
      </div>

      <div className="mx-auto mb-10 max-w-4xl">
        <OffspringPreview father={father} mother={mother} />
      </div>

      <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-(--foreground)">
        <span className="rounded bg-black/30 px-2 py-0.5 text-base">🪺</span>
        Nest
        <span className="text-sm font-normal text-(--color-text-muted)">({eggs.length})</span>
      </h2>
      {eggs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-(--color-gold)/20 p-8 text-center text-(--color-text-muted)">
          No eggs yet — breed a pair to start a clutch.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {eggs.map((egg) => (
            <div key={egg.id} className="panel-wood rounded-lg p-4 text-center">
              <p className="text-3xl">🥚</p>
              <p className="mt-2 text-sm font-semibold text-(--foreground)">
                {egg.sex === "rooster" ? "🐓" : "🐔"} {egg.sex}
              </p>
              <p className="text-xs text-(--color-text-muted)">
                Gen {egg.generation} · {egg.status}
              </p>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}
