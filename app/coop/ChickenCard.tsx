import Link from "next/link";

import type { Chicken } from "@/lib/types";
import { canAgeUp, canChickenAgeUp, canRetire } from "@/lib/growth";
import { canFight } from "@/lib/combat";
import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";
import { RARITY_GEM, topRarity } from "@/lib/rarity";

import { CoopIcon } from "./CoopIcons";
import styles from "./coop.module.css";

export function ChickenCard({ chicken, selected, onSelect, onAgeUp, onRetire }: {
  chicken: Chicken;
  selected?: boolean;
  onSelect?: () => void;
  onAgeUp?: () => void;
  onRetire?: () => void;
}) {
  const rarity = topRarity(chicken.traits);
  const status = chicken.injured ? "Recovering" : chicken.status === "retired" ? "Retired" : chicken.growthStage === "chick" || chicken.growthStage === "juvenile" ? "Young" : canFight(chicken) ? "Ready" : "Resting";

  return (
    <article className={`${styles.card} ${selected ? styles.cardSelected : ""}`}>
      <button type="button" onClick={onSelect} className={styles.cardSelect} aria-pressed={selected}>
        <div className={styles.cardStage}>
          <span className={styles.cardBadge}>{RARITY_GEM[rarity]}</span>
          <ChickenThumbnail chicken={chicken} className="h-full w-full" />
        </div>
        <div className={styles.cardBody}>
          <h3 className={styles.cardName}>{chicken.name}</h3>
          <p className={styles.cardMeta}>{chicken.fightingStyle} fighter · {chicken.growthStage.replace("_", " ")} · Gen {chicken.generation}</p>
          <div className={styles.cardStats}>
            <div className={styles.cardStat}><b><CoopIcon name="bolt" />{chicken.energy}</b><span>Energy</span></div>
            <div className={styles.cardStat}><b><CoopIcon name="trophy" />{chicken.record.wins}-{chicken.record.losses}</b><span>Record</span></div>
            <div className={styles.cardStat}><b className={chicken.injured ? "text-red-300" : "text-emerald-300"}>{status}</b><span>Status</span></div>
          </div>
        </div>
      </button>
      <div className={styles.cardActions}>
        <Link href={`/chicken/${chicken.id}`}>View</Link>
        {canFight(chicken) && <Link href={`/battle/${chicken.id}`}>Fight</Link>}
        {canAgeUp(chicken.growthStage) && onAgeUp && <button type="button" onClick={onAgeUp} disabled={!canChickenAgeUp(chicken)} title={canChickenAgeUp(chicken) ? "Ready to mature" : "Maturity requirements not met"}>{canChickenAgeUp(chicken) ? "Age up" : "Requirements"}</button>}
        {canRetire(chicken.growthStage) && onRetire && <button type="button" onClick={onRetire}>Retire</button>}
      </div>
    </article>
  );
}
