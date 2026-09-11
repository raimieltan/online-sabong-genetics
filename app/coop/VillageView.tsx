"use client";

import { useState } from "react";

import type { Chicken, Egg } from "@/lib/types";
import { paginateVillage } from "@/lib/coopVillage";
import { CoopWorld } from "@/components/chicken3d/CoopWorld";

import { CoopSelectionPanel } from "./CoopSelectionPanel";
import { EggGrid } from "./EggGrid";
import { CoopIcon } from "./CoopIcons";
import styles from "./coop.module.css";

export function VillageView({ chickens, eggs, onHatch, onAgeUp, onRetire, onGenerate }: {
  chickens: Chicken[];
  eggs: Egg[];
  onHatch: (eggId: string) => void;
  onAgeUp: (chickenId: string) => void;
  onRetire: (chickenId: string) => void;
  onGenerate: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showIncubator, setShowIncubator] = useState(false);
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(0);

  // Recovering fighters remain physically present near the medical hut; only
  // reserve-like terminal states are omitted from the living compound.
  const activeChickens = chickens.filter((chicken) => chicken.status === "active" || chicken.status === "injured");
  const selected = activeChickens.find((chicken) => chicken.id === selectedId) ?? null;
  const { page: currentPage, pageCount, items: visibleChickens } = paginateVillage(activeChickens, page);
  const battleReady = activeChickens.filter((chicken) => !chicken.injured && chicken.energy >= 25).length;

  function goToPage(next: number) {
    setSelectedId(null);
    setPage(next);
  }

  if (activeChickens.length === 0) {
    return (
      <div className={styles.empty}>
        <div className={`${styles.panel} ${styles.emptyCard}`}>
          <span className={styles.crest}><CoopIcon name="village" /></span>
          <h2>Your stable awaits</h2>
          <p>Hatch an egg or acquire your first fighter and bring this hillside coop to life.</p>
          <button type="button" onClick={onGenerate} className={styles.actionButton}><CoopIcon name="plus" /> Acquire first fighter</button>
        </div>
      </div>
    );
  }

  return (
    <section className={styles.villageStage} aria-label="3D coop village">
      {!ready && <div className={styles.loading}><div><CoopIcon name="bird" /><p>Preparing your coop</p></div></div>}

      <div className={styles.sceneCanvas}>
        <CoopWorld chickens={visibleChickens} eggCount={eggs.length} selectedId={selectedId} onSelect={(chicken) => setSelectedId(chicken?.id ?? null)} onIncubatorClick={() => setShowIncubator(true)} onReady={() => setReady(true)} />
      </div>

      <aside className={`${styles.sceneHud} ${styles.statusRail}`}>
        <div className={styles.panel}>
          <h2 className={styles.railTitle}>Stable grounds</h2>
          <p className={styles.railCopy}>Your fighters roam their home grounds. Select one to inspect or prepare them.</p>
          <div className={styles.railMetrics}>
            <div className={styles.railMetric}><span>Residents</span><b>{activeChickens.length}</b></div>
            <div className={styles.railMetric}><span>Battle ready</span><b>{battleReady}</b></div>
            <button type="button" className={styles.railMetric} onClick={() => setShowIncubator(true)}><span>Incubating</span><b>{eggs.length}</b></button>
            <div className={styles.railMetric}><span>Ground</span><b>{currentPage + 1}/{pageCount}</b></div>
          </div>
        </div>
      </aside>

      {pageCount > 1 && (
        <div className={`${styles.sceneHud} ${styles.pager}`}>
          <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 0} aria-label="Previous coop">‹</button>
          <span>Coop {currentPage + 1} of {pageCount}</span>
          <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage >= pageCount - 1} aria-label="Next coop">›</button>
        </div>
      )}

      <div className={`${styles.sceneHud} ${styles.sceneHint}`}><span>Drag to orbit</span><span>·</span><span>Scroll to zoom</span><span>·</span><span>Select a fighter</span></div>

      {selected && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center sm:inset-auto sm:right-4 sm:bottom-4 sm:justify-end">
          <CoopSelectionPanel chicken={selected} onClose={() => setSelectedId(null)} onAgeUp={() => onAgeUp(selected.id)} onRetire={() => { onRetire(selected.id); setSelectedId(null); }} />
        </div>
      )}

      {showIncubator && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`${styles.panel} w-full max-w-2xl p-5`}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 font-display text-lg text-(--color-gold-bright)"><CoopIcon name="egg" className="h-5 w-5" /> Incubator</h3>
              <button type="button" onClick={() => setShowIncubator(false)} className="text-(--color-text-muted) hover:text-(--foreground)" aria-label="Close incubator"><CoopIcon name="close" className="h-5 w-5" /></button>
            </div>
            <EggGrid eggs={eggs} onHatch={onHatch} />
          </div>
        </div>
      )}
    </section>
  );
}
