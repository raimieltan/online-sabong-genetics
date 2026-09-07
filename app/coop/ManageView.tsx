"use client";

import { useMemo, useState } from "react";

import type { Chicken, Egg } from "@/lib/types";
import { DEFAULT_COOP_FILTERS, filterChickens } from "@/lib/coopFilters";

import { ChickenCard } from "./ChickenCard";
import { CoopFilters } from "./CoopFilters";
import { EggGrid } from "./EggGrid";

/** The pre-existing grid/card management view (spec §19-20) — unchanged behavior, now a secondary mode alongside Village. */
export function ManageView({
  chickens,
  eggs,
  onHatch,
  onAgeUp,
  onRetire,
}: {
  chickens: Chicken[];
  eggs: Egg[];
  onHatch: (eggId: string) => void;
  onAgeUp: (chickenId: string) => void;
  onRetire: (chickenId: string) => void;
}) {
  const [filters, setFilters] = useState(DEFAULT_COOP_FILTERS);
  const filteredChickens = useMemo(() => filterChickens(chickens, filters), [chickens, filters]);

  return (
    <div>
      {eggs.length > 0 && (
        <div className="mb-8">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-semibold text-(--foreground)">
            <span className="rounded bg-black/30 px-2 py-0.5 text-base">🥚</span>
            Eggs
            <span className="text-sm font-normal text-(--color-text-muted)">({eggs.length})</span>
          </h2>
          <EggGrid eggs={eggs} onHatch={onHatch} />
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
              onAgeUp={() => onAgeUp(chicken.id)}
              onRetire={() => onRetire(chicken.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
