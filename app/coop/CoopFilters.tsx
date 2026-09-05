import { GROWTH_STAGES } from "@/lib/types";
import type { CoopFilterState } from "@/lib/coopFilters";

const STATUS_OPTIONS = ["all", "active", "injured", "retired", "deceased"] as const;

const selectClass =
  "rounded-md border border-(--color-gold)/25 bg-black/30 px-3 py-2 text-sm text-(--foreground) focus:border-(--color-gold) focus:outline-none";

export function CoopFilters({
  filters,
  onChange,
  resultCount,
  totalCount,
}: {
  filters: CoopFilterState;
  onChange: (next: CoopFilterState) => void;
  resultCount: number;
  totalCount: number;
}) {
  return (
    <div className="panel-wood mb-6 flex flex-col gap-3 rounded-lg p-3 sm:flex-row sm:items-center sm:gap-4">
      <div className="relative flex-1">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-(--color-text-muted)">
          🔍
        </span>
        <input
          type="text"
          value={filters.search}
          onChange={(event) => onChange({ ...filters, search: event.target.value })}
          placeholder="Search by name…"
          className="w-full rounded-md border border-(--color-gold)/25 bg-black/30 py-2 pl-9 pr-3 text-sm text-(--foreground) placeholder:text-(--color-text-muted) focus:border-(--color-gold) focus:outline-none"
        />
      </div>

      <select
        value={filters.sex}
        onChange={(event) => onChange({ ...filters, sex: event.target.value as CoopFilterState["sex"] })}
        className={selectClass}
      >
        <option value="all">All Sexes</option>
        <option value="rooster">🐓 Rooster</option>
        <option value="hen">🐔 Hen</option>
      </select>

      <select
        value={filters.growthStage}
        onChange={(event) =>
          onChange({ ...filters, growthStage: event.target.value as CoopFilterState["growthStage"] })
        }
        className={selectClass}
      >
        <option value="all">All Stages</option>
        {GROWTH_STAGES.map((stage) => (
          <option key={stage} value={stage}>
            {stage.replace("_", " ")}
          </option>
        ))}
      </select>

      <select
        value={filters.status}
        onChange={(event) =>
          onChange({ ...filters, status: event.target.value as CoopFilterState["status"] })
        }
        className={selectClass}
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status === "all" ? "All Statuses" : status[0].toUpperCase() + status.slice(1)}
          </option>
        ))}
      </select>

      <span className="whitespace-nowrap text-xs text-(--color-text-muted)">
        {resultCount} / {totalCount} shown
      </span>
    </div>
  );
}
