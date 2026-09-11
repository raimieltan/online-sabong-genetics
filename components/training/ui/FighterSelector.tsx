"use client";

import type { SessionDTO, TrainingChicken } from "../types";

export function FighterSelector({ chickens, sessions, selectedId, onSelect }: { chickens:TrainingChicken[]; sessions:SessionDTO[]; selectedId:string; onSelect:(id:string)=>void }) {
  if(!chickens.length)return <div className="smoked-glass rounded-xl p-4"><p className="font-display text-sm text-(--color-gold-bright)">No eligible fighters</p><p className="mt-1 text-xs text-(--color-text-muted)">Raise a rooster to a trainable growth stage or recover injured fighters before training.</p></div>;
  return <div className="flex gap-2 overflow-x-auto pb-1" aria-label="Fighter selector">{chickens.map(chicken=>{const active=sessions.find(session=>session.chickenId===chicken.id);const selected=chicken.id===selectedId;return <button key={chicken.id} onClick={()=>onSelect(chicken.id)} aria-pressed={selected} className={`min-w-40 rounded-lg border p-3 text-left transition ${selected?"border-(--color-gold-bright) bg-(--color-gold)/15":"border-(--color-gold)/15 bg-black/35 hover:border-(--color-gold)/45"}`}>
    <div className="flex items-center gap-2"><span className="h-8 w-8 rounded-full border border-white/10" style={{background:`linear-gradient(135deg,${chicken.colorScheme.hackle},${chicken.colorScheme.body})`}} /><span className="min-w-0"><span className="block truncate font-display text-sm text-(--color-parchment)">{chicken.name}</span><span className="block text-[9px] uppercase tracking-wider text-(--color-text-muted)">{chicken.fightingStyle} · {chicken.growthStage}</span></span></div>
    <div className="mt-2 flex justify-between text-[9px] uppercase tracking-wide"><span className={active?"text-emerald-300":"text-(--color-text-muted)"}>{active?"● Training":"Ready"}</span><span className="text-(--color-gold-bright)">Energy {chicken.energy}</span></div>
  </button>;})}</div>;
}
