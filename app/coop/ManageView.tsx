"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import type { Chicken, Egg } from "@/lib/types";
import { canFight, effectiveStat } from "@/lib/combat";
import { canChickenAgeUp } from "@/lib/growth";
import { isChampion } from "@/lib/coopVillage";
import { DEFAULT_COOP_FILTERS, filterChickens } from "@/lib/coopFilters";
import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";

import { ChickenCard } from "./ChickenCard";
import { CoopFilters } from "./CoopFilters";
import { EggGrid } from "./EggGrid";
import { CoopIcon } from "./CoopIcons";
import styles from "./coop.module.css";

function recommendation(chicken: Chicken) {
  if (chicken.injured) return "Recovery comes first. Let this fighter heal before returning to camp or competition.";
  if (chicken.energy < 40) return "Energy is running low. Rest this fighter before committing to a hard bout.";
  if ((chicken.confidence ?? 50) < 45) return "Build confidence through controlled training and a favorable matchup.";
  return `Focus on ${chicken.fightingStyle === "counter" ? "timing and reaction" : chicken.fightingStyle === "aggressive" ? "pressure and power" : chicken.fightingStyle === "endurance" ? "conditioning and recovery" : "balanced technical work"} to sharpen this fighter's identity.`;
}

export function ManageView({ chickens, eggs, onHatch, onAgeUp, onRetire }: {
  chickens: Chicken[];
  eggs: Egg[];
  onHatch: (eggId: string) => void;
  onAgeUp: (chickenId: string) => void;
  onRetire: (chickenId: string) => void;
}) {
  const [filters, setFilters] = useState(DEFAULT_COOP_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(chickens[0]?.id ?? null);
  const filteredChickens = useMemo(() => filterChickens(chickens, filters), [chickens, filters]);
  const selected = chickens.find((chicken) => chicken.id === selectedId) ?? filteredChickens[0] ?? chickens[0] ?? null;
  const battleReady = chickens.filter((chicken) => canFight(chicken)).length;
  const recovering = chickens.filter((chicken) => chicken.injured).length;
  const topFighter = [...chickens].sort((a, b) => (b.record.wins - b.record.losses) - (a.record.wins - a.record.losses))[0];
  const attention = chickens.filter((chicken) => chicken.injured || chicken.energy < 35 || canChickenAgeUp(chicken));

  return (
    <div className={styles.manageGrid}>
      <aside className={`${styles.panel} ${styles.overview}`}>
        <div className={styles.panelHeading}><h2>Stable overview</h2><p>Your fighters, their future.</p></div>
        <div className={styles.overviewStats}>
          <div className={styles.overviewStat}><CoopIcon name="bird" /><span>Total fighters</span><b>{chickens.length}</b></div>
          <div className={styles.overviewStat}><CoopIcon name="egg" /><span>Eggs incubating</span><b>{eggs.length}</b></div>
          <div className={`${styles.overviewStat} ${styles.good}`}><CoopIcon name="sword" /><span>Battle ready</span><b>{battleReady}</b></div>
          <div className={`${styles.overviewStat} ${recovering ? styles.bad : ""}`}><CoopIcon name="heart" /><span>Recovering</span><b>{recovering}</b></div>
        </div>
        {topFighter && <button type="button" className={`${styles.overviewStat} mt-3 w-full text-left`} onClick={() => setSelectedId(topFighter.id)}><CoopIcon name="trophy" /><span><small className="block text-[8px] uppercase tracking-wider">Top fighter</small>{topFighter.name}</span><b>{topFighter.record.wins}W</b></button>}
        {attention.length > 0 && <div className={styles.attention}><h3>Needs attention</h3>{attention.slice(0,3).map((chicken) => <button type="button" key={chicken.id} onClick={() => setSelectedId(chicken.id)} className="block w-full text-left"><p>{chicken.name} — {chicken.injured ? "recovering" : chicken.energy < 35 ? "low energy" : "ready to age up"}</p></button>)}</div>}
        <p className={styles.motto}>“Discipline breeds champions.”</p>
      </aside>

      <section className={`${styles.panel} ${styles.rosterPanel}`}>
        <div className={styles.rosterTop}><div><h2>Roster</h2><p>Manage, train, and prepare your fighters.</p></div><span className={styles.count}>{filteredChickens.length} of {chickens.length}</span></div>
        <CoopFilters filters={filters} onChange={setFilters} resultCount={filteredChickens.length} totalCount={chickens.length} />

        {eggs.length > 0 && <div className={styles.eggs}><h3 className={styles.eggsTitle}><CoopIcon name="egg" /> Incubator · {eggs.length}</h3><EggGrid eggs={eggs} onHatch={onHatch} /></div>}

        {filteredChickens.length === 0 ? <p className={styles.emptyResults}>No fighters match these stable filters.</p> : (
          <div className={styles.cards}>{filteredChickens.map((chicken) => <ChickenCard key={chicken.id} chicken={chicken} selected={selected?.id === chicken.id} onSelect={() => setSelectedId(chicken.id)} onAgeUp={() => onAgeUp(chicken.id)} onRetire={() => onRetire(chicken.id)} />)}</div>
        )}
      </section>

      <aside className={`${styles.panel} ${styles.selectedPanel}`}>
        <div className={styles.panelHeading}><h2 className="flex items-center gap-2"><CoopIcon name="trophy" className="h-5 w-5 text-(--color-gold-bright)" /> Selected fighter</h2><p>Detailed information and actions.</p></div>
        {selected ? <>
          <div className={styles.selectedStage}><ChickenThumbnail chicken={selected} className="h-full w-full" /></div>
          <h3 className={styles.selectedName}>{selected.name}</h3>
          <p className={styles.selectedMeta}>{selected.fightingStyle} fighter · {selected.growthStage.replace("_", " ")} · Gen {selected.generation}{isChampion(selected) ? " · Champion" : ""}</p>
          <div className={styles.selectedStats}>
            <div className={styles.selectedStat}><CoopIcon name="bolt" /><div><span>Energy</span><b>{selected.energy} / 100</b></div></div>
            <div className={styles.selectedStat}><CoopIcon name="heart" /><div><span>Condition</span><b>{selected.injured ? "Recovering" : "Healthy"}</b></div></div>
            <div className={styles.selectedStat}><CoopIcon name="trophy" /><div><span>Record</span><b>{selected.record.wins} - {selected.record.losses}</b></div></div>
            <div className={styles.selectedStat}><CoopIcon name="sword" /><div><span>Power</span><b>{Math.round(effectiveStat(selected, "power"))}</b></div></div>
          </div>
          <div className={styles.recommendation}><b>Recommendation</b><p>{recommendation(selected)}</p></div>
          <div className={styles.selectedActions}>
            <Link href={`/chicken/${selected.id}`} className={styles.secondaryButton}>View fighter</Link>
            <Link href={`/training?chickenId=${selected.id}`} className={styles.actionButton}><CoopIcon name="training" /> Train</Link>
            {canFight(selected) ? <Link href={`/battle/${selected.id}`} className={styles.actionButton}><CoopIcon name="sword" /> Fight</Link> : <span className={`${styles.secondaryButton} cursor-not-allowed opacity-40`}>Unavailable</span>}
          </div>
        </> : <p className={styles.emptyResults}>Your selected fighter will appear here.</p>}
      </aside>
    </div>
  );
}
