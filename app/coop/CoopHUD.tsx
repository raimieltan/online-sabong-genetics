"use client";

import Link from "next/link";

import { CoopIcon } from "./CoopIcons";
import styles from "./coop.module.css";

export type CoopMode = "village" | "manage";

export function CoopHUD({
  eggCount,
  chickenCount,
  mode,
  onModeChange,
  onGenerate,
}: {
  eggCount: number;
  chickenCount: number;
  mode: CoopMode;
  onModeChange: (mode: CoopMode) => void;
  onGenerate: () => void;
}) {
  return (
    <header className={styles.hud}>
      <div className={styles.identity}>
        <span className={styles.crest}><CoopIcon name="bird" /></span>
        <div className="min-w-0">
          <p className={styles.eyebrow}>Fighter Stable</p>
          <h1 className={styles.title}>Coop</h1>
          <p className={styles.subtitle}>{chickenCount} fighters <span aria-hidden="true">·</span> {eggCount} eggs incubating</p>
        </div>
      </div>

      <div className={styles.hudActions}>
        <div className={styles.modeSwitch} aria-label="Coop view">
          <button type="button" onClick={() => onModeChange("village")} className={`${styles.modeButton} ${mode === "village" ? styles.modeActive : ""}`} aria-pressed={mode === "village"}>
            <CoopIcon name="village" /> Village
          </button>
          <button type="button" onClick={() => onModeChange("manage")} className={`${styles.modeButton} ${mode === "manage" ? styles.modeActive : ""}`} aria-pressed={mode === "manage"}>
            <CoopIcon name="manage" /> Manage
          </button>
        </div>
        <Link href="/breed" className={styles.secondaryButton}><CoopIcon name="egg" /> Breed</Link>
        <button type="button" onClick={onGenerate} className={styles.actionButton}><CoopIcon name="plus" /> Acquire</button>
      </div>
    </header>
  );
}
