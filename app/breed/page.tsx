"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { canBreed } from "@/lib/growth";
import type { Chicken, Egg } from "@/lib/types";
import { ParentCard } from "./ParentCard";
import { ParentSelector } from "./ParentSelector";
import { OffspringPreview } from "./OffspringPreview";

const BREED_COST = 500;

export default function BreedPage() {
  return <Suspense fallback={null}><BreedPageContent /></Suspense>;
}

function BreedPageContent() {
  const searchParams = useSearchParams();
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [eggs, setEggs] = useState<Egg[]>([]);
  const [fatherId, setFatherId] = useState(searchParams.get("fatherId") ?? "");
  const [motherId, setMotherId] = useState(searchParams.get("motherId") ?? "");
  const [selecting, setSelecting] = useState<"father" | "mother" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [breeding, setBreeding] = useState(false);

  useEffect(() => {
    fetch("/api/chickens").then((res) => res.json()).then(setChickens);
    fetch("/api/eggs").then((res) => res.json()).then(setEggs);
  }, []);

  const roosters = chickens.filter((chicken) => chicken.sex === "rooster" && canBreed(chicken.growthStage));
  const hens = chickens.filter((chicken) => chicken.sex === "hen" && canBreed(chicken.growthStage));
  const father = roosters.find((chicken) => chicken.id === fatherId);
  const mother = hens.find((chicken) => chicken.id === motherId);
  const ready = Boolean(father && mother);

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
      setEggs((previous) => [...previous, egg]);
      setFatherId("");
      setMotherId("");
    } finally {
      setBreeding(false);
    }
  }

  return (
    <main className="breeding-page min-h-screen px-3 py-4 sm:px-5 sm:py-5 lg:px-8">
      <div className="relative z-10 mx-auto max-w-[1520px]">
        <header className="smoked-glass mb-4 flex flex-col gap-4 rounded-xl px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex items-center gap-4">
            <Link href="/coop" className="breeding-back-button" aria-label="Back to coop">←</Link>
            <div>
              <p className="text-[9px] font-bold uppercase tracking-[0.28em] text-(--color-gold-bright)">Breeding · Bloodline pairing</p>
              <h1 className="mt-1 font-display text-2xl font-semibold uppercase tracking-[0.06em] text-(--color-parchment) sm:text-3xl">Build the next champion</h1>
              <p className="mt-1 text-xs text-(--color-text-muted)">Compare the parent lines, study the inheritance outlook, then commit the pairing.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <span className="breeding-status-pill"><b className="text-(--color-gold-bright)">{eggs.length}</b> active {eggs.length === 1 ? "clutch" : "clutches"}</span>
            <span className="breeding-status-pill"><b className="text-(--color-gold-bright)">🪙 {BREED_COST}</b> pairing cost</span>
          </div>
        </header>

        <section className="breeding-console">
          <ParentCard role="father" chicken={father} onChoose={() => setSelecting("father")} />
          <OffspringPreview father={father} mother={mother} />
          <ParentCard role="mother" chicken={mother} onChoose={() => setSelecting("mother")} />

          <footer className="breeding-commit-bar">
            <div className="hidden md:block">
              <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-(--color-gold-bright)">Pairing protocol</p>
              <p className="mt-1 text-xs text-(--color-text-muted)">{ready ? `${father?.name} and ${mother?.name} are ready to establish a new generation.` : "Choose one sire and one dam to unlock the genetic forecast."}</p>
            </div>
            <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:items-end">
              {error && <p className="rounded border border-red-300/20 bg-red-950/30 px-3 py-2 text-xs text-red-200">{error}</p>}
              <button type="button" onClick={handleBreed} disabled={!ready || breeding} className="breeding-primary-button">
                <span>{breeding ? "Securing bloodline…" : "Breed this pair"}</span><span className="h-4 w-px bg-black/20" /><span className="text-xs">🪙 {BREED_COST}</span>
              </button>
              <p className="text-center text-[8px] uppercase tracking-[0.13em] text-(--color-text-muted) md:text-right">Genetics lock when the egg is created</p>
            </div>
          </footer>
        </section>

        <section className="mt-5">
          <div className="mb-3 flex items-end justify-between gap-4 px-1">
            <div><p className="text-[9px] font-bold uppercase tracking-[0.22em] text-(--color-gold-bright)">Hatchery</p><h2 className="mt-1 font-display text-xl text-(--color-parchment)">Your nests</h2></div>
            <p className="text-[10px] uppercase tracking-wider text-(--color-text-muted)">{eggs.length ? `${eggs.length} genetics secured` : "Ready for a first clutch"}</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {eggs.map((egg) => {
              const sire = chickens.find((chicken) => chicken.id === egg.fatherId);
              const dam = chickens.find((chicken) => chicken.id === egg.motherId);
              return (
                <article key={egg.id} className="breeding-nest-card">
                  <div className="breeding-nest-egg"><span aria-hidden>🥚</span></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-300">● {egg.status}</p><h3 className="mt-1 font-display text-lg text-(--color-parchment)">Generation {egg.generation}</h3></div><span className="rounded-full border border-(--color-gold)/20 bg-black/25 px-2 py-1 text-[8px] uppercase tracking-wider text-(--color-text-muted)">{egg.breed ?? "Mixed line"}</span></div>
                    <p className="mt-2 truncate text-[10px] text-(--color-text-muted)">{sire?.name ?? "Sire"} <span className="mx-1 text-(--color-gold)">×</span> {dam?.name ?? "Dam"}</p>
                    <div className="mt-3 h-1 overflow-hidden rounded-full bg-black/45"><span className="block h-full w-full bg-gradient-to-r from-(--color-gold)/50 to-(--color-gold-bright)" /></div>
                    <p className="mt-2 text-[8px] uppercase tracking-[0.13em] text-(--color-text-muted)">Conception complete · Ready to hatch from the coop</p>
                  </div>
                  <Link href="/coop" className="shrink-0 text-lg text-(--color-gold-bright)" aria-label="Open coop to hatch">→</Link>
                </article>
              );
            })}
            <button type="button" onClick={() => setSelecting("father")} className="breeding-empty-nest">
              <span className="text-2xl opacity-50" aria-hidden>⌁</span><span className="font-display text-sm text-(--color-parchment)">Prepare a new nest</span><span className="text-[9px] uppercase tracking-[0.14em] text-(--color-text-muted)">Begin with a sire</span>
            </button>
          </div>
        </section>
      </div>

      {selecting && <ParentSelector role={selecting} options={selecting === "father" ? roosters : hens} selectedId={selecting === "father" ? fatherId : motherId} onSelect={selecting === "father" ? setFatherId : setMotherId} onClose={() => setSelecting(null)} />}
    </main>
  );
}
