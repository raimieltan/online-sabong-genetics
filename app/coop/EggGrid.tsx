"use client";

import type { Egg } from "@/lib/types";

import { CoopIcon } from "./CoopIcons";
import styles from "./coop.module.css";

export function EggGrid({ eggs, onHatch }: { eggs: Egg[]; onHatch: (eggId: string) => void }) {
  if (eggs.length === 0) return <p className={styles.emptyResults}>No eggs incubating right now.</p>;

  return (
    <div className={styles.eggGrid}>
      {eggs.map((egg) => (
        <div key={egg.id} className={styles.eggCard}>
          <span className={styles.eggIcon}><CoopIcon name="egg" /></span>
          <p>{egg.sex}<br />Gen {egg.generation}</p>
          <button type="button" onClick={() => onHatch(egg.id)}>Hatch</button>
        </div>
      ))}
    </div>
  );
}
