import type { Chicken } from "@/lib/types";
import { computeOffspringOdds } from "@/lib/breedingPreview";
import { RARITY_COLOR, RARITY_GEM, RARITY_LABEL } from "@/lib/rarity";

export function OffspringPreview({ father, mother }: { father?: Chicken; mother?: Chicken }) {
  const odds = father && mother ? computeOffspringOdds(father.traits, mother.traits) : null;
  const tiers = odds ? [...odds].reverse() : null; // legendary first, common last

  return (
    <div>
      <h2 className="mb-3 text-center text-xs font-bold uppercase tracking-[0.2em] text-(--color-text-muted)">
        Possible Offspring
      </h2>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
        {tiers
          ? tiers.map(({ rarity, percent }) => (
              <div
                key={rarity}
                className={`panel-wood rounded-lg p-3 text-center ${
                  rarity === "epic" ? "outline outline-2 outline-fuchsia-500/60" : ""
                }`}
              >
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-black/30 text-2xl">
                  {rarity === "legendary" ? "❔" : RARITY_GEM[rarity]}
                </div>
                <p className={`text-[11px] font-bold uppercase tracking-wide ${RARITY_COLOR[rarity].split(" ")[1]}`}>
                  {rarity === "legendary" ? "???" : RARITY_LABEL[rarity]}
                </p>
                <p className="mt-0.5 font-display text-sm font-semibold text-(--color-gold-bright)">
                  {percent < 0.1 && percent > 0 ? "<0.1" : percent.toFixed(1)}%
                </p>
              </div>
            ))
          : Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="panel-wood rounded-lg p-3 text-center opacity-40">
                <div className="mx-auto mb-2 h-12 w-12 rounded-full bg-black/30" />
                <p className="text-[11px] text-(--color-text-muted)">—</p>
              </div>
            ))}
      </div>

      <p className="mt-3 text-center text-[11px] text-(--color-text-muted)">
        Better parents have higher odds of a rare trait.
      </p>
    </div>
  );
}
