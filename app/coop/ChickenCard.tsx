import Link from "next/link";
import { Suspense, useState } from "react";
import type { CSSProperties } from "react";

import type { Chicken } from "@/lib/types";
import { canAgeUp, canRetire } from "@/lib/growth";
import { canFight } from "@/lib/combat";
import { ChickenViewer } from "@/components/chicken3d/ChickenViewer";
import { RARITY_BORDER, RARITY_COLOR, RARITY_GEM, RARITY_GLOW, topRarity } from "@/lib/rarity";

const SEX_ICON: Record<Chicken["sex"], string> = {
  rooster: "🐓",
  hen: "🐔",
};

const STAGE_COLOR: Record<Chicken["growthStage"], string> = {
  chick: "bg-lime-900/60 text-lime-300",
  juvenile: "bg-teal-900/60 text-teal-300",
  young_adult: "bg-sky-900/60 text-sky-300",
  adult: "bg-amber-900/60 text-amber-300",
  prime: "bg-fuchsia-900/60 text-fuchsia-300",
  senior: "bg-neutral-700/60 text-neutral-300",
  retired: "bg-neutral-800 text-neutral-500",
};

export function ChickenCard({
  chicken,
  onSelect,
  onAgeUp,
  onRetire,
}: {
  chicken: Chicken;
  onSelect: () => void;
  onAgeUp?: () => void;
  onRetire?: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const visibleTraits = chicken.traits.slice(0, 2);
  const hiddenTraitCount = chicken.traits.length - visibleTraits.length;
  const rarity = topRarity(chicken.traits);

  return (
    <div
      className={`panel-wood group relative overflow-hidden rounded-lg border-t-2 p-4 text-left transition hover:-translate-y-0.5 hover:shadow-[0_0_0_1px_rgba(212,162,78,0.4)] ${RARITY_BORDER[rarity]}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {(chicken.injured || chicken.status === "retired") && (
        <span
          className={`absolute right-2 top-2 z-10 rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
            chicken.injured
              ? "bg-red-900/80 text-red-300"
              : "bg-neutral-800 text-neutral-400"
          }`}
        >
          {chicken.injured ? "Injured" : "Retired"}
        </span>
      )}

      <button onClick={onSelect} className="block w-full text-left">
        <div
          className="model-stage -mx-4 -mt-4 mb-3 h-32 w-[calc(100%+2rem)]"
          style={{ "--stage-glow": RARITY_GLOW[rarity] } as CSSProperties}
        >
          <span className="absolute left-2 top-2 z-10 text-lg leading-none opacity-80">
            {RARITY_GEM[rarity]}
          </span>
          <Suspense
            fallback={
              <div className="flex h-full w-full items-center justify-center text-3xl opacity-30">
                {SEX_ICON[chicken.sex]}
              </div>
            }
          >
            <ChickenViewer
              chicken={chicken}
              interactive={false}
              animate={hovered}
              cameraDistance={4.5}
              className="h-full w-full"
            />
          </Suspense>
        </div>

        <div className="flex items-center gap-2">
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold text-(--foreground)">
              {SEX_ICON[chicken.sex]} {chicken.name}
            </p>
            <p className="text-xs text-(--color-text-muted)">Gen {chicken.generation}</p>
          </div>
        </div>

        <span
          className={`mt-3 inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${STAGE_COLOR[chicken.growthStage]}`}
        >
          {chicken.growthStage.replace("_", " ")}
        </span>

        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-(--color-text-muted)">
            <span>⚡ Energy</span>
            <span>{chicken.energy}/100</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-black/40">
            <div
              className="h-full rounded-full bg-gradient-to-r from-(--color-gold) to-(--color-gold-bright)"
              style={{ width: `${chicken.energy}%` }}
            />
          </div>
        </div>

        {visibleTraits.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {visibleTraits.map((trait) => (
              <span
                key={trait.id}
                className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${RARITY_COLOR[trait.rarity]}`}
              >
                ✨ {trait.name}
              </span>
            ))}
            {hiddenTraitCount > 0 && (
              <span className="rounded border border-neutral-700 px-1.5 py-0.5 text-[10px] text-(--color-text-muted)">
                +{hiddenTraitCount}
              </span>
            )}
          </div>
        )}

        <p className="mt-2 text-[11px] text-(--color-text-muted)">
          🏆 {chicken.record.wins}W - {chicken.record.losses}L
        </p>
      </button>

      {(canAgeUp(chicken.growthStage) || canRetire(chicken.growthStage) || canFight(chicken)) && (
        <div className="mt-3 flex gap-2">
          {canFight(chicken) && (
            <Link
              href={`/battle/${chicken.id}`}
              className="rounded bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-2 py-1 text-xs font-semibold text-(--color-ink) shadow shadow-black/40 hover:brightness-110"
            >
              ⚔️ Fight
            </Link>
          )}
          {canAgeUp(chicken.growthStage) && onAgeUp && (
            <button
              onClick={onAgeUp}
              className="rounded bg-black/30 px-2 py-1 text-xs font-semibold text-(--foreground) hover:bg-black/50"
            >
              Age Up
            </button>
          )}
          {canRetire(chicken.growthStage) && onRetire && (
            <button
              onClick={onRetire}
              className="rounded bg-black/30 px-2 py-1 text-xs font-semibold text-(--foreground) hover:bg-black/50"
            >
              Retire
            </button>
          )}
        </div>
      )}
    </div>
  );
}
