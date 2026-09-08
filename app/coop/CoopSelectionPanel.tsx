"use client";

import Link from "next/link";

import type { Chicken } from "@/lib/types";
import { canAgeUp, canRetire } from "@/lib/growth";
import { canFight, effectiveStat } from "@/lib/combat";
import { isChampion } from "@/lib/coopVillage";

const SEX_ICON: Record<Chicken["sex"], string> = { rooster: "🐓", hen: "🐔" };

/**
 * Compact selected-chicken panel (spec §9-10): summary + shortcuts into the
 * existing View/Train/Battle/Breed/Age-Up/Retire flows. Never a second
 * ChickenCard — just enough context plus buttons. Desktop renders as a
 * floating panel; on mobile the parent positions this as a bottom sheet.
 */
export function CoopSelectionPanel({
  chicken,
  onClose,
  onAgeUp,
  onRetire,
}: {
  chicken: Chicken;
  onClose: () => void;
  onAgeUp: () => void;
  onRetire: () => void;
}) {
  const breedParam = chicken.sex === "rooster" ? `fatherId=${chicken.id}` : `motherId=${chicken.id}`;

  return (
    <div className="panel-wood pointer-events-auto w-full rounded-t-lg p-4 shadow-2xl shadow-black/50 sm:w-80 sm:rounded-lg">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-1.5 font-display text-lg font-semibold text-(--color-gold-bright)">
            {SEX_ICON[chicken.sex]} {chicken.name}
          </h3>
          <p className="text-xs text-(--color-text-muted)">
            Gen {chicken.generation} · {chicken.growthStage.replace("_", " ")}
            {isChampion(chicken) && <span className="ml-1.5 text-(--color-gold-bright)">⭐ Champion</span>}
          </p>
        </div>
        <button onClick={onClose} className="text-(--color-text-muted) hover:text-(--foreground)" aria-label="Close">
          ✕
        </button>
      </div>

      <div className="mb-3 grid grid-cols-3 gap-2 text-center text-xs">
        <div className="rounded bg-black/25 px-2 py-1.5">
          <p className="text-(--color-text-muted)">⚔️ Power</p>
          <p className="font-semibold text-(--foreground)">{Math.round(effectiveStat(chicken, "power"))}</p>
        </div>
        <div className="rounded bg-black/25 px-2 py-1.5">
          <p className="text-(--color-text-muted)">💨 Speed</p>
          <p className="font-semibold text-(--foreground)">{Math.round(effectiveStat(chicken, "speed"))}</p>
        </div>
        <div className="rounded bg-black/25 px-2 py-1.5">
          <p className="text-(--color-text-muted)">❤️ Energy</p>
          <p className="font-semibold text-(--foreground)">{chicken.energy}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 text-sm">
        <Link
          href={`/chicken/${chicken.id}`}
          className="rounded bg-black/30 px-3 py-2 text-center font-medium text-(--foreground) hover:bg-black/45"
        >
          View
        </Link>
        <Link
          href={`/chicken/${chicken.id}?tab=Evolve`}
          className="rounded bg-black/30 px-3 py-2 text-center font-medium text-(--foreground) hover:bg-black/45"
        >
          Train
        </Link>
        {canFight(chicken) ? (
          <Link
            href={`/battle/${chicken.id}`}
            className="rounded bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-3 py-2 text-center font-semibold text-(--color-ink) hover:brightness-110"
          >
            Battle
          </Link>
        ) : (
          <span className="cursor-not-allowed rounded bg-black/15 px-3 py-2 text-center text-(--color-text-muted)">Battle</span>
        )}
        <Link
          href={`/breed?${breedParam}`}
          className="rounded bg-black/30 px-3 py-2 text-center font-medium text-(--foreground) hover:bg-black/45"
        >
          Breed
        </Link>
      </div>

      {(canAgeUp(chicken.growthStage) || canRetire(chicken.growthStage)) && (
        <div className="mt-2 flex gap-2 text-sm">
          {canAgeUp(chicken.growthStage) && (
            <button
              onClick={onAgeUp}
              className="flex-1 rounded border border-(--color-gold)/40 px-3 py-1.5 font-medium text-(--color-gold-bright) hover:bg-black/25"
            >
              Age Up
            </button>
          )}
          {canRetire(chicken.growthStage) && (
            <button
              onClick={onRetire}
              className="flex-1 rounded border border-red-500/40 px-3 py-1.5 font-medium text-red-300 hover:bg-black/25"
            >
              Retire
            </button>
          )}
        </div>
      )}
    </div>
  );
}
