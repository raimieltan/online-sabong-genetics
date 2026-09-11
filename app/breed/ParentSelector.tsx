"use client";

import { useMemo, useState } from "react";
import type { Chicken } from "@/lib/types";
import { topRarity } from "@/lib/rarity";
import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";

type Sort = "all" | "power" | "speed" | "traits";

export function ParentSelector({ role, options, selectedId, onSelect, onClose }: {
  role: "father" | "mother"; options: Chicken[]; selectedId: string; onSelect: (id: string) => void; onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("all");
  const title = role === "father" ? "Sire" : "Dam";
  const filtered = useMemo(() => {
    const matches = options.filter((chicken) => `${chicken.name} ${chicken.breed ?? ""} ${chicken.fightingStyle}`.toLowerCase().includes(query.toLowerCase()));
    if (sort === "power") return matches.sort((a, b) => b.iv.power - a.iv.power);
    if (sort === "speed") return matches.sort((a, b) => b.iv.speed - a.iv.speed);
    if (sort === "traits") return matches.sort((a, b) => b.traits.length - a.traits.length);
    return matches;
  }, [options, query, sort]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-label={`Select ${title}`} onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="breeding-selector w-full max-w-5xl rounded-t-2xl sm:rounded-2xl">
        <header className="flex items-start justify-between gap-4 border-b border-(--color-gold)/15 px-5 py-4"><div><p className="text-[9px] font-bold uppercase tracking-[0.24em] text-(--color-gold-bright)">Breeding stock</p><h2 className="mt-1 font-display text-2xl text-(--color-parchment)">Select {title}</h2><p className="mt-1 text-xs text-(--color-text-muted)">{options.length} eligible {role === "father" ? "roosters" : "hens"}</p></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-black/30 text-(--color-text-muted) hover:border-(--color-gold)/50 hover:text-white" aria-label="Close selector">×</button></header>
        <div className="border-b border-white/5 px-5 py-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Search ${title.toLowerCase()} name, breed, or style…`} className="w-full rounded-lg border border-(--color-gold)/20 bg-black/35 px-3 py-2.5 text-xs text-(--color-parchment) outline-none placeholder:text-(--color-text-muted) focus:border-(--color-gold)/60" autoFocus />
          <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">{([['all', 'All stock'], ['power', 'Best power'], ['speed', 'Best speed'], ['traits', 'Trait lines']] as [Sort, string][]).map(([value, label]) => <button key={value} type="button" onClick={() => setSort(value)} className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-[9px] font-bold uppercase tracking-wider ${sort === value ? "border-(--color-gold-bright) bg-(--color-gold)/15 text-(--color-gold-bright)" : "border-white/10 bg-black/20 text-(--color-text-muted)"}`}>{label}</button>)}</div>
        </div>
        <div className="grid max-h-[62vh] grid-cols-2 gap-2 overflow-y-auto p-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((chicken) => {
            const selected = chicken.id === selectedId;
            return <button key={chicken.id} type="button" onClick={() => { onSelect(chicken.id); onClose(); }} className={`group rounded-xl border p-3 text-left transition ${selected ? "border-(--color-gold-bright) bg-(--color-gold)/15 shadow-[0_0_24px_rgba(218,163,64,.12)]" : "border-white/8 bg-black/25 hover:border-(--color-gold)/45 hover:bg-black/35"}`}><ChickenThumbnail chicken={chicken} className="h-28 w-full rounded-lg bg-[radial-gradient(ellipse_at_center,rgba(212,162,78,.14),transparent_70%)] sm:h-36" /><div className="mt-2 flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-display text-sm text-(--color-parchment)">{chicken.name}</p><p className="mt-0.5 truncate text-[8px] uppercase tracking-wide text-(--color-text-muted)">{chicken.breed ?? "Mixed"} · Gen {chicken.generation}</p></div><span className="text-[8px] uppercase text-(--color-gold-bright)">{topRarity(chicken.traits)}</span></div><div className="mt-3 grid grid-cols-3 gap-1 text-center text-[8px] text-(--color-text-muted)"><span>POW <b className="text-(--color-parchment)">{Math.round(chicken.iv.power)}</b></span><span>SPD <b className="text-(--color-parchment)">{Math.round(chicken.iv.speed)}</b></span><span>AGI <b className="text-(--color-parchment)">{Math.round(chicken.iv.agility)}</b></span></div></button>;
          })}
          {!filtered.length && <p className="col-span-full py-16 text-center text-sm text-(--color-text-muted)">No eligible bloodline matches that search.</p>}
        </div>
      </section>
    </div>
  );
}
