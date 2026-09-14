import { ChickenThumbnail } from '@/components/chicken3d/ChickenThumbnail';
import type { Chicken } from '@/lib/types';
import type { StatusIconUi } from './uiAdapter';

function conditionTone(pct: number): string {
  if (pct > 60) return 'linear-gradient(90deg, #3c5f4f, #4f7f69)';
  if (pct > 35) return 'linear-gradient(90deg, #55552f, #7a7a3f)';
  if (pct > 15) return 'linear-gradient(90deg, #5c3323, #a54337)';
  return 'linear-gradient(90deg, #4a231c, #a54337)';
}

const MAX_VISIBLE_STATUSES = 4;

export function FighterHud({
  chicken,
  subtitle,
  hp,
  maxHp,
  stamina,
  maxStamina,
  statuses,
  side,
  awakening,
  awakeningRemaining,
}: {
  chicken: Chicken;
  subtitle: string;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  statuses: StatusIconUi[];
  side: 'left' | 'right';
  awakening?: string;
  awakeningRemaining?: number;
}) {
  const hpPct = Math.max(0, Math.min(100, Math.round((hp / maxHp) * 100)));
  const visible = statuses.slice(0, MAX_VISIBLE_STATUSES);
  const overflow = statuses.length - visible.length;
  const isLeft = side === 'left';

  const portrait = (
    <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md border border-[rgba(190,160,100,0.4)] bg-black/40 sm:h-16 sm:w-16">
      <ChickenThumbnail chicken={chicken} className="h-full w-full" />
    </div>
  );

  const identity = (
    <div className={`min-w-0 flex-1 ${isLeft ? 'text-left' : 'text-right'}`}>
      <p className="truncate font-display text-lg uppercase tracking-[.04em] text-(--color-ivory,#e8e0d0) sm:text-xl">{chicken.name}</p>
      <p className="truncate text-[11px] text-(--color-text-muted)">{subtitle}</p>
      {awakening && (
        <p className="truncate font-display text-[10px] uppercase tracking-[.12em] text-[#f1cf77]">
          Awakened · {awakening.replaceAll('-', ' ')} · {awakeningRemaining ?? 0}s
        </p>
      )}
      <ResourceBar label="Condition" pct={hpPct} fill={conditionTone(hpPct)} isLeft={isLeft} thin={false} />
      <ResourceBar label="Stamina" pct={Math.max(0, Math.min(100, Math.round((stamina / maxStamina) * 100)))} fill="linear-gradient(90deg, #8a6a2c, #c49b46)" isLeft={isLeft} thin pulse={stamina / maxStamina < 0.25} />
      {visible.length > 0 && (
        <div className={`mt-1.5 flex gap-1 ${isLeft ? 'justify-start' : 'justify-end'}`}>
          {visible.map(status => (
            <span
              key={status.id}
              title={status.tooltip}
              tabIndex={0}
              aria-label={status.label}
              className="flex h-5 w-5 items-center justify-center rounded-sm border border-[rgba(165,67,55,0.45)] bg-[rgba(30,10,8,0.6)] text-[10px] text-[#d98c7c]"
            >
              {status.icon}
            </span>
          ))}
          {overflow > 0 && <span className="flex h-5 items-center px-1 text-[10px] text-(--color-text-muted)">+{overflow}</span>}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="flex w-[42%] max-w-[500px] min-w-0 items-center gap-2.5 rounded-[7px] border border-[rgba(185,155,95,0.24)] bg-[linear-gradient(90deg,rgba(8,8,7,.8),rgba(18,17,15,.62))] px-2.5 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-md sm:gap-3 sm:px-3 sm:py-2.5"
      style={{ flexDirection: isLeft ? 'row' : 'row-reverse' }}
    >
      {portrait}
      {identity}
    </div>
  );
}

function ResourceBar({ label, pct, fill, isLeft, thin, pulse }: { label: string; pct: number; fill: string; isLeft: boolean; thin: boolean; pulse?: boolean }) {
  return (
    <div className={`mt-1 flex items-center gap-1.5 ${isLeft ? '' : 'flex-row-reverse'}`}>
      <span className="w-[52px] shrink-0 text-[9px] uppercase tracking-[.1em] text-(--color-text-muted)">{label}</span>
      <div className={`flex-1 overflow-hidden rounded-full border border-black/60 bg-[#1a1512] ${thin ? 'h-[5px]' : 'h-[7px]'} ${pulse ? 'animate-pulse' : ''}`}>
        <div
          className="h-full transition-[width] duration-[350ms] ease-out"
          style={{ width: `${pct}%`, background: fill, marginLeft: isLeft ? 0 : 'auto' }}
        />
      </div>
    </div>
  );
}
