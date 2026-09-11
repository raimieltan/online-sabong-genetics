import type { CSSProperties } from "react";
import Link from "next/link";

import type { Chicken } from "@/lib/types";
import { GENETIC_STAT_KEYS } from "@/lib/types";
import { RARITY_COLOR, RARITY_GLOW, topRarity } from "@/lib/rarity";
import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";

const STAT_LABEL: Record<(typeof GENETIC_STAT_KEYS)[number], string> = {
  power: "POW", speed: "SPD", stamina: "STA", defense: "DEF", accuracy: "ACC", agility: "AGI",
};

const ROLE_COLOR = { father: "var(--color-azure)", mother: "var(--color-rose)" };

export function ParentCard({ role, chicken, onChoose }: {
  role: "father" | "mother";
  chicken: Chicken | undefined;
  onChoose: () => void;
}) {
  const rarity = chicken ? topRarity(chicken.traits) : "common";
  const title = role === "father" ? "Sire" : "Dam";
  const icon = role === "father" ? "♂" : "♀";

  return (
    <section className={`breeding-parent-card breeding-parent-card-${role}`} style={{ "--lineage-color": ROLE_COLOR[role] } as CSSProperties}>
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
        <div>
          <p className="text-[9px] font-bold uppercase tracking-[0.24em] text-(--lineage-color)">{icon} {role === "father" ? "Paternal line" : "Maternal line"}</p>
          <h2 className="mt-0.5 font-display text-lg font-semibold uppercase tracking-[0.08em] text-(--color-parchment)">{title}</h2>
        </div>
        <button type="button" onClick={onChoose} className="breeding-change-button">{chicken ? "Change" : `Select ${title}`} <span aria-hidden>⌄</span></button>
      </div>

      {chicken ? (
        <div className="p-4">
          <div className="breeding-model-stage h-52 sm:h-60 lg:h-64" style={{ "--stage-glow": RARITY_GLOW[rarity] } as CSSProperties}>
            <ChickenThumbnail chicken={chicken} className="h-full w-full scale-110" />
            <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[8px] uppercase tracking-[0.18em] text-white/35">Genetic specimen</span>
          </div>

          <div className="mt-3 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate font-display text-xl font-semibold text-(--color-parchment)">{chicken.name}</h3>
              <p className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-(--color-text-muted)">{chicken.breed ?? "Mixed bloodline"} · Gen {chicken.generation} · {chicken.fightingStyle}</p>
            </div>
            <span className={`shrink-0 rounded border bg-black/30 px-2 py-1 text-[9px] font-bold uppercase tracking-wide ${RARITY_COLOR[rarity]}`}>{rarity}</span>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-px overflow-hidden rounded-lg border border-white/8 bg-white/8">
            {GENETIC_STAT_KEYS.map((stat) => (
              <div key={stat} className="bg-black/30 px-2 py-2 text-center">
                <span className="block text-[8px] font-bold tracking-[0.14em] text-(--color-text-muted)">{STAT_LABEL[stat]}</span>
                <strong className="mt-0.5 block font-display text-base text-(--color-parchment)">{Math.round(chicken.iv[stat])}</strong>
              </div>
            ))}
          </div>

          <div className="mt-3 flex min-h-7 flex-wrap gap-1.5">
            {chicken.traits.length ? chicken.traits.slice(0, 3).map((trait) => (
              <span key={trait.id} className={`rounded-full border bg-black/25 px-2 py-1 text-[8px] font-semibold uppercase tracking-wide ${RARITY_COLOR[trait.rarity]}`}>{trait.name}</span>
            )) : <span className="text-[10px] text-(--color-text-muted)">No known inheritable traits</span>}
          </div>

          <Link href={`/pedigree/${chicken.id}`} className="mt-3 inline-flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.14em] text-(--color-gold-bright) hover:text-white">View pedigree <span aria-hidden>→</span></Link>
        </div>
      ) : (
        <button type="button" onClick={onChoose} className="flex min-h-[30rem] w-full flex-col items-center justify-center p-8 text-center">
          <span className="flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-(--lineage-color)/50 bg-black/20 font-display text-4xl text-(--lineage-color)">{icon}</span>
          <span className="mt-5 font-display text-lg text-(--color-parchment)">Choose your {title.toLowerCase()}</span>
          <span className="mt-2 max-w-44 text-xs leading-relaxed text-(--color-text-muted)">Select an eligible {role === "father" ? "rooster" : "hen"} to inspect the bloodline.</span>
        </button>
      )}
    </section>
  );
}
