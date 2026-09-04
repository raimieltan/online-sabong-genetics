"use client";

import type { Rooster, StatKey } from "@/lib/types";
import { STAT_KEYS } from "@/lib/types";

interface StatsDisplayProps {
  rooster: Rooster;
}

export default function StatsDisplay({ rooster }: StatsDisplayProps) {
  const statTotal = STAT_KEYS.reduce((sum, key) => sum + rooster[key], 0);

  return (
    <div className="space-y-2">
      {STAT_KEYS.map((key) => (
        <StatBar key={key} label={key} value={rooster[key]} />
      ))}
      <div className="mt-4 pt-3 border-t border-gray-700">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-cyan-400 uppercase tracking-wide">
            Total Stats
          </span>
          <span className="text-lg font-bold text-cyan-300">{statTotal}</span>
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, value }: { label: StatKey; value: number }) {
  const percentage = Math.min(100, value);

  // Color scheme: cyan for high, yellow for mid, red for low
  const getBarColor = (val: number) => {
    if (val >= 70) return "bg-cyan-400";
    if (val >= 40) return "bg-yellow-400";
    return "bg-red-400";
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs font-medium text-gray-300 uppercase tracking-wider w-20">
        {label}
      </span>
      <div className="flex-1 bg-gray-800 rounded-full h-5 overflow-hidden border border-gray-700">
        <div
          className={`h-full ${getBarColor(value)} transition-all duration-300 ease-out flex items-center justify-end pr-2`}
          style={{ width: `${percentage}%` }}
        >
          {value >= 15 && (
            <span className="text-xs font-bold text-gray-900">{value}</span>
          )}
        </div>
      </div>
      {value < 15 && (
        <span className="text-xs font-bold text-gray-300 w-8 text-right">
          {value}
        </span>
      )}
    </div>
  );
}
