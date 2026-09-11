import { GROWTH_STAGES } from "@/lib/types";
import type { CoopFilterState } from "@/lib/coopFilters";

import { CoopIcon } from "./CoopIcons";
import styles from "./coop.module.css";

const STATUS_OPTIONS = ["all", "active", "injured", "retired", "deceased"] as const;

export function CoopFilters({ filters, onChange, resultCount, totalCount }: {
  filters: CoopFilterState;
  onChange: (next: CoopFilterState) => void;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div>
      <div className={styles.filters}>
        <label className={styles.search}>
          <CoopIcon name="search" />
          <input type="search" value={filters.search} onChange={(event) => onChange({ ...filters, search: event.target.value })} placeholder="Search stable..." aria-label="Search stable" />
        </label>
        <label className={styles.selectWrap}>
          <select value={filters.sex} onChange={(event) => onChange({ ...filters, sex: event.target.value as CoopFilterState["sex"] })} className={styles.select} aria-label="Filter by sex">
            <option value="all">All fighters</option><option value="rooster">Roosters</option><option value="hen">Hens</option>
          </select><CoopIcon name="chevron" />
        </label>
        <label className={styles.selectWrap}>
          <select value={filters.growthStage} onChange={(event) => onChange({ ...filters, growthStage: event.target.value as CoopFilterState["growthStage"] })} className={styles.select} aria-label="Filter by growth stage">
            <option value="all">All stages</option>{GROWTH_STAGES.map((stage) => <option key={stage} value={stage}>{stage.replace("_", " ")}</option>)}
          </select><CoopIcon name="chevron" />
        </label>
      </div>
      <div className={styles.quickFilters} aria-label="Status filters">
        {STATUS_OPTIONS.map((status) => <button type="button" key={status} onClick={() => onChange({ ...filters, status })} className={`${styles.filterButton} ${filters.status === status ? styles.filterActive : ""}`} aria-pressed={filters.status === status}>{status === "all" ? "All" : status}</button>)}
        <span className={styles.count}><CoopIcon name="filter" className="mr-1 inline h-3 w-3" />{resultCount} / {totalCount}</span>
      </div>
    </div>
  );
}
