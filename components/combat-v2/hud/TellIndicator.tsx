import type { TellUiState } from './uiAdapter';

/** True world->screen anchoring: `tell.anchor` is the fighter's head
 * projected through the live (director-driven) camera every frame
 * (BattleStage3D's `ScreenAnchorTracker`), sampled once per HUD tick. Falls
 * back to a fixed side lane only if the projection is missing or the head
 * has gone off-frame (e.g. a hard cinematic cut) — the label should never
 * float somewhere the fighter clearly isn't. Hidden once the phase locks
 * into a clash — the spec calls for the tell to disappear on commit rather
 * than linger over the resolution beat. */
export function TellIndicator({ tell, dimmed }: { tell: TellUiState | null; dimmed?: boolean }) {
  if (!tell) return null;
  const isLeft = tell.fighterSide === 'left';
  const useAnchor = tell.anchor?.visible ?? false;
  const xPct = useAnchor ? tell.anchor!.xPct : (isLeft ? 28 : 72);
  const yPct = useAnchor ? Math.max(13, tell.anchor!.yPct - 13) : 34;
  // Strength ramps the read from "barely forming" to "clear commitment"
  // (docs/combat/tell-revamped.md §22) — opacity/scale/glow track it instead
  // of the label just popping in at full readability.
  const opacity = (dimmed ? 0 : 1) * (.35 + tell.strength * .65);
  const scale = .92 + tell.strength * .08;
  const glow = .1 + tell.strength * .35;
  return (
    <div
      key={tell.id}
      className="pointer-events-none absolute z-20 flex min-w-[138px] max-w-[170px] flex-col items-center gap-0.5 rounded-md border border-[rgba(185,155,95,0.18)] bg-[linear-gradient(90deg,transparent,rgba(12,12,11,.76)_18%,rgba(12,12,11,.76)_82%,transparent)] px-3 py-1.5 text-center backdrop-blur-sm animate-tell-in transition-[left,top,opacity,transform,box-shadow] duration-300 ease-out"
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        textShadow: '0 2px 12px rgba(0,0,0,.9)',
        opacity,
        transform: `translateX(-50%) scale(${scale})`,
        boxShadow: `0 0 ${8 + tell.strength * 14}px rgba(231,185,95,${glow})`,
      }}
    >
      <span className="flex items-center gap-1 text-[12px] leading-tight text-(--color-ivory,#e8e0d0)">
        <span className="text-[#df4938] drop-shadow-[0_0_7px_rgba(198,42,31,.8)]">{tell.icon}</span>
        {tell.label}
      </span>
      {tell.interpretation && <span className="text-[10px] leading-tight text-(--color-text-muted)">{tell.interpretation}</span>}
      {tell.secondary && (
        <span className="flex items-center gap-1 text-[9px] leading-tight text-(--color-text-muted) opacity-70">
          <span>{tell.secondary.icon}</span>
          {tell.secondary.label}
        </span>
      )}
    </div>
  );
}
