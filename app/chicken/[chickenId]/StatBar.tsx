/** A single labeled progress bar, used for stat and gene-strength readouts. */
export function StatBar({
  icon,
  label,
  value,
  max,
  display,
}: {
  icon: string;
  label: string;
  value: number;
  max: number;
  /** Text shown at the right edge; defaults to the raw value. */
  display?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));

  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-(--color-text-muted)">
          <span>{icon}</span>
          {label}
        </span>
        <span className="font-display font-semibold text-(--foreground)">{display ?? value}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
        <div
          className="h-full rounded-full bg-gradient-to-r from-(--color-gold) to-(--color-gold-bright)"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
