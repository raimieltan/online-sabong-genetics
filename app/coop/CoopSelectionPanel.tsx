"use client";

import Link from "next/link";

import type { Chicken } from "@/lib/types";
import { ageUpRequirements, canAgeUp, canChickenAgeUp, canRetire } from "@/lib/growth";
import { canFight, effectiveStat } from "@/lib/combat";
import { isChampion } from "@/lib/coopVillage";

import { CoopIcon } from "./CoopIcons";
import styles from "./coop.module.css";

export function CoopSelectionPanel({ chicken, onClose, onAgeUp, onRetire }: {
  chicken: Chicken;
  onClose: () => void;
  onAgeUp: () => void;
  onRetire: () => void;
}) {
  const breedParam = chicken.sex === "rooster" ? `fatherId=${chicken.id}` : `motherId=${chicken.id}`;
  const readyToMature = canChickenAgeUp(chicken);
  const unmetRequirements = ageUpRequirements(chicken).filter((requirement) => !requirement.met);

  return (
    <div className={`${styles.panel} pointer-events-auto w-full rounded-t-xl p-4 shadow-2xl shadow-black/50 sm:w-80 sm:rounded-xl`}>
      <div className="mb-3 flex items-start justify-between gap-2 border-b border-(--color-gold)/20 pb-3">
        <div><p className={styles.eyebrow}>{isChampion(chicken) ? "Champion resident" : "Stable resident"}</p><h3 className="font-display text-lg text-(--color-gold-bright)">{chicken.name}</h3><p className="text-xs capitalize text-(--color-text-muted)">{chicken.fightingStyle} · {chicken.growthStage.replace("_", " ")} · Gen {chicken.generation}</p></div>
        <button type="button" onClick={onClose} className="text-(--color-text-muted) transition hover:text-(--foreground)" aria-label="Close"><CoopIcon name="close" className="h-5 w-5" /></button>
      </div>
      <div className={styles.selectedStats}>
        <div className={styles.selectedStat}><CoopIcon name="sword" /><div><span>Power</span><b>{Math.round(effectiveStat(chicken, "power"))}</b></div></div>
        <div className={styles.selectedStat}><CoopIcon name="bolt" /><div><span>Speed</span><b>{Math.round(effectiveStat(chicken, "speed"))}</b></div></div>
        <div className={styles.selectedStat}><CoopIcon name="heart" /><div><span>Energy</span><b>{chicken.energy}</b></div></div>
        <div className={styles.selectedStat}><CoopIcon name="trophy" /><div><span>Record</span><b>{chicken.record.wins}-{chicken.record.losses}</b></div></div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Link href={`/chicken/${chicken.id}`} className={styles.secondaryButton}>View</Link>
        <Link href={`/training?chickenId=${chicken.id}`} className={styles.secondaryButton}><CoopIcon name="training" /> Train</Link>
        {canFight(chicken) ? <Link href={`/battle/${chicken.id}`} className={styles.actionButton}><CoopIcon name="sword" /> Fight</Link> : <span className={`${styles.secondaryButton} cursor-not-allowed opacity-40`}>Unavailable</span>}
        <Link href={`/breed?${breedParam}`} className={styles.secondaryButton}><CoopIcon name="egg" /> Breed</Link>
      </div>
      {(canAgeUp(chicken.growthStage) || canRetire(chicken.growthStage)) && <div className="mt-2 flex gap-2 text-xs">
        {canAgeUp(chicken.growthStage) && <button type="button" onClick={onAgeUp} disabled={!readyToMature} title={unmetRequirements.map((requirement) => requirement.label).join(" · ")} className={`${styles.secondaryButton} flex-1 disabled:cursor-not-allowed disabled:opacity-40`}>{readyToMature ? "Age up" : `${unmetRequirements.length} requirements`}</button>}
        {canRetire(chicken.growthStage) && <button type="button" onClick={onRetire} className="flex-1 rounded-md border border-red-500/40 bg-red-950/40 px-3 py-2 font-semibold text-red-200">Retire</button>}
      </div>}
    </div>
  );
}
