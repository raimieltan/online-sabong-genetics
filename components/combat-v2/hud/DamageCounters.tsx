import type { ScreenAnchor } from '@/components/chicken3d/BattleStage3D';

export type DamageCounterUi = {
  id: number;
  amount: number;
  side: 'left' | 'right';
  anchor: ScreenAnchor;
};

/** Visual-only feedback sourced from authoritative HEALTH_CHANGED events. */
export function DamageCounters({ counters }: { counters: DamageCounterUi[] }) {
  return (
    <div className="pointer-events-none absolute inset-0 z-30 overflow-hidden" aria-live="polite">
      {counters.map(counter => {
        const x = counter.anchor.visible ? counter.anchor.xPct : counter.side === 'left' ? 28 : 72;
        const y = counter.anchor.visible ? Math.max(18, counter.anchor.yPct - 4) : 47;
        return (
          <span
            key={counter.id}
            className="animate-damage-counter absolute -translate-x-1/2 select-none font-display text-[25px] font-black tabular-nums text-[#f1dfbd]"
            style={{
              left: `${x}%`, top: `${y}%`,
              textShadow: '0 0 10px rgba(154,37,26,.8),2px 3px 0 #28100b',
            }}
          >
            −{counter.amount}
          </span>
        );
      })}
    </div>
  );
}
