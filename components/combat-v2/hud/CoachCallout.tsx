import type { Chicken } from '@/lib/types';

/** Splits the existing caption string on its first line break so the second
 * line can render as the spec's emphasized line — no new coach-copy system,
 * just a presentation split of text `ContinuousBattle` already produces. */
function splitCaption(caption: string): [string, string | null] {
  const dashIndex = caption.indexOf(' — ');
  if (dashIndex === -1) return [caption, null];
  return [caption.slice(0, dashIndex), caption.slice(dashIndex + 3)];
}

export function CoachCallout({ caption, dimmed }: { chicken: Chicken; caption: string | null; dimmed: boolean }) {
  if (!caption) return null;
  const [line, emphasis] = splitCaption(caption);
  return (
    <div
      className={`pointer-events-none absolute bottom-4 left-4 z-20 flex max-w-[310px] items-center gap-3 rounded-r-lg border border-l-0 border-[rgba(185,155,95,0.22)] bg-[linear-gradient(90deg,rgba(8,8,7,.9),rgba(14,13,11,.7))] py-2 pr-4 backdrop-blur-md transition-opacity duration-200 sm:bottom-5 sm:left-6 ${dimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <div className="flex h-14 w-14 shrink-0 items-end justify-center overflow-hidden rounded-r-full border-r border-[rgba(190,160,100,.4)] bg-[radial-gradient(circle_at_50%_35%,#685541,#171410_65%)] text-[#c9b79b]">
        <svg aria-hidden="true" viewBox="0 0 48 48" className="h-12 w-12 fill-current opacity-85"><circle cx="24" cy="16" r="9"/><path d="M8 48c1-13 7-20 16-20s15 7 16 20H8z"/><path d="M14 14c2-8 17-12 22-2-8-4-15-3-22 2z" className="fill-[#23201b]"/></svg>
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[.16em] text-(--color-text-muted)">Coach</p>
        <p className="text-[12px] italic leading-snug text-(--color-ivory,#e8e0d0)">{line}</p>
        {emphasis && <p className="text-[12px] font-semibold italic leading-snug text-[#f0dfbd]">{emphasis}</p>}
      </div>
    </div>
  );
}
