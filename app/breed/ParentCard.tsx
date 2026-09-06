import type { CSSProperties } from "react";

import type { Chicken } from "@/lib/types";
import { GENETIC_STAT_KEYS } from "@/lib/types";
import { RARITY_COLOR, RARITY_GLOW, topRarity } from "@/lib/rarity";
import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";

const SEX_ICON: Record<Chicken["sex"], string> = { rooster: "🐓", hen: "🐔" };

const STAT_ICON: Record<(typeof GENETIC_STAT_KEYS)[number], string> = {
  power: "⚔️",
  speed: "💨",
  stamina: "🌀",
  defense: "🛡️",
  accuracy: "🎯",
  agility: "🍀",
};

const ROLE_RIBBON: Record<"father" | "mother", string> = {
  father: "var(--color-azure)",
  mother: "var(--color-rose)",
};

export function ParentCard({
  role,
  label,
  chicken,
  options,
  value,
  onChange,
}: {
  role: "father" | "mother";
  label: string;
  chicken: Chicken | undefined;
  options: Chicken[];
  value: string;
  onChange: (id: string) => void;
}) {
  const rarity = chicken ? topRarity(chicken.traits) : "common";
  const ribbonSide = role === "father" ? "left-5" : "right-5";

  return (
    <div className="relative pt-3">
      <span
        className={`ribbon-tag absolute -top-1 z-10 ${ribbonSide}`}
        style={{ "--ribbon": ROLE_RIBBON[role] } as CSSProperties}
      >
        {label}
      </span>

      <div className="brass-bolts panel-parchment rounded-lg p-4 pt-6">
        <select
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="mb-3 w-full rounded border border-(--color-parchment-dark) bg-white/40 p-1.5 text-xs text-[#3a2f1c] focus:border-[#3a2f1c]/50 focus:outline-none"
        >
          <option value="">Choose a {label.toLowerCase()}…</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {SEX_ICON[option.sex]} {option.name}
            </option>
          ))}
        </select>

        {chicken ? (
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-lg font-semibold text-[#2c2313]">
                  {chicken.name}
                </p>
                <p className="text-xs text-[#6b5c3d]">
                  {chicken.growthStage.replace("_", " ")} · Gen {chicken.generation}
                </p>
              </div>
              <span
                className={`shrink-0 rounded border bg-white/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${RARITY_COLOR[rarity]}`}
              >
                {rarity}
              </span>
            </div>

            <div
              className="model-stage-light my-3 h-36 w-full"
              style={{ "--stage-glow": RARITY_GLOW[rarity] } as CSSProperties}
            >
              <ChickenThumbnail chicken={chicken} className="h-full w-full" />
            </div>

            <div className="space-y-1.5">
              {GENETIC_STAT_KEYS.map((stat) => (
                <div key={stat} className="flex items-center justify-between text-sm text-[#3a2f1c]">
                  <span className="flex items-center gap-1.5 capitalize text-[#6b5c3d]">
                    <span aria-hidden>{STAT_ICON[stat]}</span> {stat}
                  </span>
                  <span className="font-display font-semibold">{chicken.iv[stat] + chicken.ev[stat]}</span>
                </div>
              ))}
            </div>

            {chicken.traits.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1 border-t border-(--color-parchment-dark) pt-3">
                {chicken.traits.map((trait) => (
                  <span
                    key={trait.id}
                    className={`rounded border bg-white/40 px-1.5 py-0.5 text-[10px] font-medium ${RARITY_COLOR[trait.rarity]}`}
                  >
                    {trait.name}
                  </span>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center gap-2 text-center text-[#6b5c3d]">
            <span className="text-4xl opacity-30">{SEX_ICON[role === "father" ? "rooster" : "hen"]}</span>
            <p className="text-xs">No {label.toLowerCase()} selected</p>
          </div>
        )}
      </div>
    </div>
  );
}
