import { ChickenThumbnail } from '@/components/chicken3d/ChickenThumbnail';
import type { Chicken } from '@/lib/types';
import type { TacticalMode } from '@/lib/combat-v2';

export type CommandFeedback = { mode: TacticalMode; status: 'queued' | 'acknowledged' | 'ignored' };
export type CommandCardDef = { mode: TacticalMode; title: string; subtitle: string; icon: string; hotkey: string };

const SEGMENTS = [
  { position: 'left-1/2 top-0 -translate-x-1/2', shape: 'combat-command-top' },
  { position: 'left-0 top-[79px]', shape: 'combat-command-left' },
  { position: 'right-0 top-[79px]', shape: 'combat-command-right' },
  { position: 'bottom-0 left-1/2 -translate-x-1/2', shape: 'combat-command-bottom' },
] as const;

export function CommandWheel({ chicken, cards, activeMode, disabledAll, locked, feedback, onSelect }: {
  chicken: Chicken;
  cards: CommandCardDef[];
  activeMode: TacticalMode | undefined;
  disabledAll: boolean;
  locked: boolean;
  feedback: CommandFeedback | null;
  onSelect: (mode: TacticalMode) => void;
}) {
  const disabled = disabledAll || locked;
  return (
    <div className="relative mx-auto h-[238px] w-[450px] max-w-[96vw] drop-shadow-[0_18px_30px_rgba(0,0,0,.58)]">
      <div className="pointer-events-none absolute inset-x-[82px] top-[48px] h-[142px] rounded-[50%] bg-[radial-gradient(ellipse_at_center,rgba(197,151,70,.2),rgba(8,7,6,.72)_48%,transparent_72%)]" />
      {cards.slice(0, 4).map((card, index) => {
        const segment = SEGMENTS[index];
        if (!segment) return null;
        const active = activeMode === card.mode;
        const feedbackTarget = feedback?.mode === card.mode;
        const feedbackCopy = feedbackTarget ? feedback.status === 'acknowledged' ? 'Acknowledged ✓' : feedback.status === 'ignored' ? 'Ignored' : 'Queued' : card.subtitle;
        return (
          <div key={card.mode} className={`absolute z-10 ${segment.position}`}>
            <button
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onSelect(card.mode)}
              className={`group relative flex h-[80px] w-[176px] flex-col items-center justify-center border border-[rgba(190,160,100,.25)] bg-[linear-gradient(180deg,rgba(29,26,22,.91),rgba(11,10,9,.92))] px-4 text-center backdrop-blur-md transition-all duration-150 ${segment.shape} ${disabled ? 'cursor-not-allowed opacity-35' : 'hover:-translate-y-0.5 hover:border-[rgba(236,199,119,.7)] hover:bg-[linear-gradient(180deg,rgba(53,42,25,.94),rgba(15,13,11,.95))] active:scale-[.98]'} ${active ? 'border-[rgba(242,205,123,.85)] shadow-[inset_0_0_28px_rgba(190,137,50,.18),0_0_20px_rgba(212,162,78,.16)]' : ''} ${feedbackTarget && feedback?.status === 'ignored' ? 'animate-command-ignored border-red-700/70' : ''} ${feedbackTarget && feedback?.status === 'queued' ? 'animate-command-queued' : ''}`}
            >
              <span className="absolute right-3 top-2 text-[9px] text-white/25">{card.hotkey}</span>
              <span className="text-[22px] leading-none text-[#e5c27c] transition-transform group-hover:scale-110">{card.icon}</span>
              <span className="mt-0.5 font-display text-[15px] uppercase leading-none tracking-[.08em] text-[#eee4d2]">{card.title}</span>
              <span className="mt-1 text-[10px] leading-none text-[#92897c]">{feedbackCopy}</span>
            </button>
          </div>
        );
      })}
      <div className="absolute left-1/2 top-1/2 z-20 flex h-[78px] w-[78px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[rgba(239,199,112,.72)] bg-[#080706] shadow-[0_0_0_5px_rgba(5,4,3,.72),0_0_30px_rgba(212,162,78,.2)]">
        <div className="h-[64px] w-[64px] overflow-hidden rounded-full border border-[rgba(212,162,78,.28)] bg-black">
          <ChickenThumbnail chicken={chicken} className="h-full w-full" />
        </div>
      </div>
    </div>
  );
}
