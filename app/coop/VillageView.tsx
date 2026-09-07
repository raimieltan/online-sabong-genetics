"use client";

import { useState } from "react";

import type { Chicken, Egg } from "@/lib/types";
import { paginateVillage } from "@/lib/coopVillage";
import { CoopWorld } from "@/components/chicken3d/CoopWorld";

import { CoopSelectionPanel } from "./CoopSelectionPanel";
import { EggGrid } from "./EggGrid";

/**
 * The primary 3D village experience (spec §1-12): a live scene of the
 * player's active chickens, with a compact selection panel and an incubator
 * popover for the existing egg/hatch flow. Handles its own empty-coop and
 * "preparing your coop" states so the page component stays a thin data layer.
 */
export function VillageView({
  chickens,
  eggs,
  onHatch,
  onAgeUp,
  onRetire,
  onGenerate,
}: {
  chickens: Chicken[];
  eggs: Egg[];
  onHatch: (eggId: string) => void;
  onAgeUp: (chickenId: string) => void;
  onRetire: (chickenId: string) => void;
  onGenerate: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showIncubator, setShowIncubator] = useState(false);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(0);

  const activeChickens = chickens.filter((c) => c.status === "active");
  const selected = activeChickens.find((c) => c.id === selectedId) ?? null;
  // paginateVillage clamps into range every render, so a stale `page` after a
  // retire/hatch is corrected on display without needing to sync it back.
  const { page: currentPage, pageCount, items: visibleChickens } = paginateVillage(activeChickens, page);

  function goToPage(next: number) {
    setSelectedId(null);
    setPage(next);
  }

  if (activeChickens.length === 0) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-(--color-gold)/20 p-10 text-center">
        <p className="text-5xl">⛺</p>
        <p className="text-(--color-text-muted)">Your coop is empty.</p>
        <p className="max-w-sm text-sm text-(--color-text-muted)">
          Hatch an egg or generate your first chicken to start your village.
        </p>
        <button
          onClick={onGenerate}
          className="rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-5 py-2.5 font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110"
        >
          + Get Chicken
        </button>
      </div>
    );
  }

  return (
    <div className="relative h-[70vh] min-h-[420px] overflow-hidden rounded-lg border border-(--color-gold)/15">
      {!ready && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-(--color-ink)">
          <p className="animate-bounce text-4xl">🐔</p>
          <p className="text-sm text-(--color-text-muted)">Preparing your coop...</p>
        </div>
      )}

      <CoopWorld
        chickens={visibleChickens}
        selectedId={selectedId}
        onSelect={(chicken) => setSelectedId(chicken?.id ?? null)}
        onIncubatorClick={() => setShowIncubator(true)}
        onReady={() => setReady(true)}
      />

      {pageCount > 1 && (
        <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-(--color-gold)/25 bg-(--color-ink)/80 px-3 py-1.5 text-sm backdrop-blur">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="rounded px-2 py-0.5 font-semibold text-(--color-gold-bright) transition hover:bg-black/30 disabled:opacity-30"
              aria-label="Previous page"
            >
              ‹
            </button>
            <span className="tabular-nums text-(--color-text-muted)">
              Coop {currentPage + 1} / {pageCount}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              className="rounded px-2 py-0.5 font-semibold text-(--color-gold-bright) transition hover:bg-black/30 disabled:opacity-30"
              aria-label="Next page"
            >
              ›
            </button>
          </div>
        </div>
      )}

      {selected && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center p-0 sm:inset-auto sm:right-4 sm:bottom-4 sm:justify-end sm:p-0">
          <CoopSelectionPanel
            chicken={selected}
            onClose={() => setSelectedId(null)}
            onAgeUp={() => onAgeUp(selected.id)}
            onRetire={() => {
              onRetire(selected.id);
              setSelectedId(null);
            }}
          />
        </div>
      )}

      {showIncubator && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4">
          <div className="panel-wood w-full max-w-lg rounded-lg p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-(--color-gold-bright)">🥚 Incubator</h3>
              <button
                onClick={() => setShowIncubator(false)}
                className="text-(--color-text-muted) hover:text-(--foreground)"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <EggGrid eggs={eggs} onHatch={onHatch} />
          </div>
        </div>
      )}
    </div>
  );
}
