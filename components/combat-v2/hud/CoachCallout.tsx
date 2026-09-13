import { ChickenThumbnail } from '@/components/chicken3d/ChickenThumbnail';
import type { Chicken } from '@/lib/types';

/** Splits the existing caption string on its first line break so the second
 * line can render as the spec's emphasized line — no new coach-copy system,
 * just a presentation split of text `ContinuousBattle` already produces. */
function splitCaption(caption: string): [string, string | null] {
  const dashIndex = caption.indexOf(' — ');
  if (dashIndex === -1) return [caption, null];
  return [caption.slice(0, dashIndex), caption.slice(dashIndex + 3)];
}

export function CoachCallout({ chicken, caption, dimmed }: { chicken: Chicken; caption: string | null; dimmed: boolean }) {
  if (!caption) return null;
  const [line, emphasis] = splitCaption(caption);
  return (
    <div
      className={`pointer-events-none absolute bottom-3 left-3 z-20 flex max-w-[280px] items-start gap-2 rounded-lg border border-[rgba(185,155,95,0.24)] bg-[rgba(12,12,11,0.68)] p-2 backdrop-blur-md transition-opacity duration-200 sm:bottom-4 sm:left-4 ${dimmed ? 'opacity-30' : 'opacity-100'}`}
    >
      <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full border border-[rgba(190,160,100,0.4)] bg-black/40">
        <ChickenThumbnail chicken={chicken} className="h-full w-full" />
      </div>
      <div className="min-w-0">
        <p className="text-[9px] uppercase tracking-[.16em] text-(--color-text-muted)">Coach</p>
        <p className="text-[12px] leading-snug text-(--color-ivory,#e8e0d0)">{line}</p>
        {emphasis && <p className="text-[12px] font-semibold italic leading-snug text-(--color-gold-bright)">{emphasis}</p>}
      </div>
    </div>
  );
}
