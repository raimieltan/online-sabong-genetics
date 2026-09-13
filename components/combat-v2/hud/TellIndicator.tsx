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
  // Lift the label a little above the projected head point rather than
  // centering on it, and offset it out from the fighter's own lane so it
  // never sits on top of the rig.
  const xPct = useAnchor ? tell.anchor!.xPct + (isLeft ? 4 : -4) : (isLeft ? 14 : 86);
  const yPct = useAnchor ? Math.max(4, tell.anchor!.yPct - 8) : 38;
  // Strength ramps the read from "barely forming" to "clear commitment"
  // (docs/combat/tell-revamped.md §22) — opacity/scale/glow track it instead
  // of the label just popping in at full readability.
  const opacity = (dimmed ? 0 : 1) * (.35 + tell.strength * .65);
  const scale = .92 + tell.strength * .08;
  const glow = .1 + tell.strength * .35;
  return (
    <div
      key={tell.id}
      className={`pointer-events-none absolute z-20 flex max-w-[190px] flex-col gap-0.5 rounded-md border border-[rgba(185,155,95,0.28)] bg-[rgba(12,12,11,0.68)] px-2.5 py-1.5 backdrop-blur-sm animate-tell-in transition-[left,top,opacity,transform,box-shadow] duration-300 ease-out ${isLeft ? 'items-start text-left' : 'items-end text-right'}`}
      style={{
        left: `${xPct}%`,
        top: `${yPct}%`,
        textShadow: '0 2px 12px rgba(0,0,0,.9)',
        opacity,
        transform: `translateX(${isLeft ? '0%' : '-100%'}) scale(${scale})`,
        boxShadow: `0 0 ${8 + tell.strength * 14}px rgba(231,185,95,${glow})`,
      }}
    >
      <span className="flex items-center gap-1.5 text-sm text-(--color-ivory,#e8e0d0)">
        {isLeft && <span className="text-(--color-gold-bright)">{tell.icon}</span>}
        {tell.label}
        {!isLeft && <span className="text-(--color-gold-bright)">{tell.icon}</span>}
      </span>
      {tell.interpretation && <span className="text-[11px] text-(--color-text-muted)">{tell.interpretation}</span>}
      {tell.secondary && (
        <span className="flex items-center gap-1 text-[10px] text-(--color-text-muted) opacity-70">
          {isLeft && <span>{tell.secondary.icon}</span>}
          {tell.secondary.label}
          {!isLeft && <span>{tell.secondary.icon}</span>}
        </span>
      )}
    </div>
  );
}
