"use client";

import type { Egg } from "@/lib/types";

/** Shared egg grid + Hatch action (spec §15) — used by both Manage view and the Village incubator popover. */
export function EggGrid({ eggs, onHatch }: { eggs: Egg[]; onHatch: (eggId: string) => void }) {
  if (eggs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-(--color-gold)/20 p-6 text-center text-sm text-(--color-text-muted)">
        No eggs incubating right now.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
      {eggs.map((egg) => (
        <div key={egg.id} className="panel-wood rounded-lg p-4 text-center">
          <p className="text-3xl">🥚</p>
          <p className="mt-2 text-sm text-(--color-text-muted)">
            {egg.sex === "rooster" ? "🐓" : "🐔"} {egg.sex} · Gen {egg.generation}
          </p>
          <button
            onClick={() => onHatch(egg.id)}
            className="mt-3 rounded bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-3 py-1 text-xs font-semibold text-(--color-ink) shadow shadow-black/40 hover:brightness-110"
          >
            Hatch
          </button>
        </div>
      ))}
    </div>
  );
}
