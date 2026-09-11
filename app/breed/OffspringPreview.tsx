import type { Chicken, TraitRarity } from "@/lib/types";
import { GENETIC_STAT_KEYS } from "@/lib/types";
import { computeOffspringOdds } from "@/lib/breedingPreview";
import { RARITY_GEM, RARITY_LABEL } from "@/lib/rarity";

const STAT_META: Record<(typeof GENETIC_STAT_KEYS)[number], { short: string; icon: string }> = {
  power: { short: "POW", icon: "⚔" }, speed: { short: "SPD", icon: "↯" }, stamina: { short: "STA", icon: "♥" },
  defense: { short: "DEF", icon: "◆" }, accuracy: { short: "ACC", icon: "◎" }, agility: { short: "AGI", icon: "◇" },
};

const RARITY_BAR: Record<TraitRarity, string> = {
  common: "#a99a7a", uncommon: "#55c778", rare: "#3485d0", epic: "#a849db", legendary: "#e1b65c",
};

function projectedRange(father: number, mother: number) {
  const weightedA = father * 0.35 + mother * 0.65;
  const weightedB = father * 0.65 + mother * 0.35;
  return {
    min: Math.max(1, Math.round(Math.min(weightedA, weightedB) - 8)),
    max: Math.min(99, Math.round(Math.max(weightedA, weightedB) + 8)),
  };
}

function pairingNotes(father: Chicken, mother: Chicken) {
  const sharedTraits = father.traits.filter((trait) => mother.traits.some((other) => other.id === trait.id));
  const strongestGap = GENETIC_STAT_KEYS.map((stat) => ({ stat, gap: Math.abs(father.iv[stat] - mother.iv[stat]) })).sort((a, b) => b.gap - a.gap)[0];
  const carriers = new Set([...Object.keys(father.mutations), ...Object.keys(mother.mutations)]).size;
  return [
    sharedTraits.length ? `Shared ${sharedTraits[0].name} lineage improves its pass-through opportunity` : "Distinct trait pools create a broader inheritance draw",
    strongestGap.gap >= 8 ? `${STAT_META[strongestGap.stat].short} genetics complement a weaker parent line` : "Parent stat profiles are closely matched",
    carriers ? `${carriers} known mutation ${carriers === 1 ? "line" : "lines"} may be inherited` : "No known mutation carriers in this pairing",
  ];
}

export function OffspringPreview({ father, mother }: { father?: Chicken; mother?: Chicken }) {
  const ready = Boolean(father && mother);
  const odds = father && mother ? computeOffspringOdds(father.traits, mother.traits) : null;
  const generation = father && mother ? Math.max(father.generation, mother.generation) + 1 : null;
  const profile = father && mother ? (father.fightingStyle === mother.fightingStyle ? `${father.fightingStyle} tendency` : `${father.fightingStyle} × ${mother.fightingStyle}`) : "Awaiting parent lines";
  const emptyOdds = (["legendary", "epic", "rare", "uncommon", "common"] as TraitRarity[]).map((rarity) => ({ rarity, percent: 0 }));

  return (
    <section className={`breeding-offspring ${ready ? "is-ready" : ""}`}>
      <header className="text-center">
        <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-(--color-gold-bright)">Offspring projection</p>
        <h2 className="mt-1 font-display text-xl uppercase tracking-[0.06em] text-(--color-parchment)">Next generation</h2>
      </header>

      <div className="relative mx-auto mt-4 flex h-32 w-32 items-center justify-center">
        <span className="breeding-gene-line breeding-gene-line-left" /><span className="breeding-gene-line breeding-gene-line-right" /><span className="breeding-egg-aura" />
        <span className={`relative text-6xl drop-shadow-[0_10px_20px_rgba(0,0,0,.6)] ${ready ? "breeding-egg-ready" : "grayscale opacity-40"}`} aria-hidden>🥚</span>
      </div>

      <div className="text-center">
        <p className="font-display text-base capitalize text-(--color-parchment)">{profile}</p>
        <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-(--color-text-muted)">{generation ? `Generation ${generation} · Genetics unlocked` : "Select both parents to reveal the outlook"}</p>
      </div>

      <div className="mt-5 border-t border-(--color-gold)/15 pt-4">
        <div className="mb-3 flex items-center justify-between gap-2"><p className="text-[9px] font-bold uppercase tracking-[0.2em] text-(--color-gold-bright)">Expected IV range</p><span className="text-right text-[8px] uppercase tracking-wider text-(--color-text-muted)">Mutation outliers possible</span></div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3">
          {GENETIC_STAT_KEYS.map((stat) => {
            const range = father && mother ? projectedRange(father.iv[stat], mother.iv[stat]) : null;
            return <div key={stat}><div className="flex items-center justify-between text-[9px]"><span className="font-bold tracking-wider text-(--color-text-muted)">{STAT_META[stat].icon} {STAT_META[stat].short}</span><strong className="font-mono text-(--color-parchment)">{range ? `${range.min}–${range.max}` : "—"}</strong></div><div className="mt-1 h-1 overflow-hidden rounded-full bg-black/50"><span className="block h-full rounded-full bg-gradient-to-r from-(--color-gold) to-(--color-gold-bright) transition-all duration-500" style={{ width: range ? `${Math.max(12, range.max)}%` : "0%" }} /></div></div>;
          })}
        </div>
      </div>

      <div className="mt-5 border-t border-(--color-gold)/15 pt-4">
        <p className="mb-3 text-[9px] font-bold uppercase tracking-[0.2em] text-(--color-gold-bright)">Rarity outlook</p>
        <div className="space-y-2">
          {(odds ? [...odds].reverse() : emptyOdds).map(({ rarity, percent }) => (
            <div key={rarity} className="grid grid-cols-[5.5rem_1fr_2.6rem] items-center gap-2 text-[8px] uppercase tracking-wide"><span className="truncate text-(--color-text-muted)">{RARITY_GEM[rarity]} {RARITY_LABEL[rarity]}</span><div className="h-1.5 overflow-hidden rounded-full bg-black/50"><span className="block h-full rounded-full transition-all duration-500" style={{ width: percent ? `${Math.max(percent, 1.5)}%` : "0%", backgroundColor: RARITY_BAR[rarity] }} /></div><strong className="text-right font-mono text-(--color-parchment)">{odds ? `${percent > 0 && percent < 0.1 ? "<0.1" : percent.toFixed(1)}%` : "—"}</strong></div>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-lg border border-(--color-gold)/15 bg-black/20 p-3">
        <p className="text-[9px] font-bold uppercase tracking-[0.2em] text-(--color-gold-bright)">Pairing analysis</p>
        {father && mother ? <ul className="mt-2 space-y-1.5">{pairingNotes(father, mother).map((note, index) => <li key={note} className="flex gap-2 text-[10px] leading-relaxed text-(--color-text-muted)"><span className={index === 2 ? "text-purple-300" : "text-emerald-300"}>{index === 2 ? "◇" : "✓"}</span>{note}</li>)}</ul> : <p className="mt-2 text-[10px] leading-relaxed text-(--color-text-muted)">Pair two adult bloodlines to compare inherited strengths, traits, and mutation carriers.</p>}
      </div>
    </section>
  );
}
