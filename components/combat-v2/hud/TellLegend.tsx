'use client';

import { useState } from 'react';

// Canonical tell vocabulary (docs/combat/tell-revamped.md §8, §58).
const LEGEND_ENTRIES: Array<{ icon: string; label: string }> = [
  { icon: '↗', label: 'Weight Forward' },
  { icon: '↑', label: 'Closing Distance' },
  { icon: '🪽', label: 'Wing Adjust' },
  { icon: '⌄', label: 'Head Low' },
  { icon: '◇', label: 'Guard Open' },
  { icon: '⚡', label: 'Rear Leg Loaded' },
  { icon: '?', label: 'Hesitating' },
  { icon: '⬡', label: 'Recovering' },
  { icon: '↔', label: 'Angle Shift' },
  { icon: '⟂', label: 'Side-On Stance' },
  { icon: '!', label: 'Overextended' },
  { icon: '↺', label: 'Resetting' },
];

// Secondary/reference panel — the live read now surfaces next to the fighter
// via TellIndicator, so this starts collapsed to keep focus on the fight.
export function TellLegend({ dimmed }: { dimmed: boolean }) {
  const [collapsed, setCollapsed] = useState(true);

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        aria-label="Show tell legend"
        className={`pointer-events-auto absolute right-4 top-1/2 z-20 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(185,155,95,0.28)] bg-[rgba(12,12,11,0.68)] text-(--color-gold-bright) backdrop-blur-sm transition-opacity duration-200 ${dimmed ? 'opacity-25' : 'opacity-100'}`}
      >
        ?
      </button>
    );
  }

  return (
    <div className={`pointer-events-auto absolute right-4 top-1/2 z-20 w-[168px] -translate-y-1/2 rounded-lg border border-[rgba(185,155,95,0.24)] bg-[rgba(12,12,11,0.68)] p-2.5 backdrop-blur-md transition-opacity duration-200 ${dimmed ? 'opacity-25' : 'opacity-100'}`}>
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[9px] uppercase tracking-[.16em] text-(--color-text-muted)">Tell Indicators</p>
        <button type="button" onClick={() => setCollapsed(true)} aria-label="Collapse tell legend" className="text-(--color-text-muted) hover:text-(--color-gold-bright)">
          ×
        </button>
      </div>
      <ul className="flex flex-col gap-1">
        {LEGEND_ENTRIES.map(entry => (
          <li key={entry.label} className="flex items-center gap-1.5 text-[11px] text-(--color-ivory,#e8e0d0)">
            <span className="w-4 text-center text-(--color-gold-bright)">{entry.icon}</span>
            {entry.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
