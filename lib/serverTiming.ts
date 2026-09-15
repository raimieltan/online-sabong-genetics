export type ServerTimingMetric = readonly [name: string, durationMs: number];

/** Formats coarse, non-sensitive route timings for the browser Network panel. */
export function serverTiming(...metrics: ServerTimingMetric[]): string {
  return metrics
    .map(([name, durationMs]) => `${name};dur=${Math.max(0, durationMs).toFixed(1)}`)
    .join(", ");
}
