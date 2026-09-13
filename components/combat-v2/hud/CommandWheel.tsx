import { ChickenThumbnail } from '@/components/chicken3d/ChickenThumbnail';
import type { Chicken } from '@/lib/types';
import type { TacticalMode } from '@/lib/combat-v2';

export type CommandFeedback = {
  mode: TacticalMode;
  status: 'queued' | 'acknowledged' | 'ignored';
};

export type CommandCardDef = {
  mode: TacticalMode;
  title: string;
  subtitle: string;
  icon: string;
  hotkey: string;
};

/**
 * Fixed symmetrical six-command layout.
 *
 * Important:
 * Positioning is applied to an OUTER wrapper.
 * Hover/press transforms are applied to the INNER button.
 *
 * This prevents absolute positioning transforms from fighting
 * Tailwind hover/scale transforms.
 */
const COMMAND_POSITIONS = [
  { x: 0, y: -105 }, // top
  { x: 145, y: -55 }, // upper-right
  { x: 145, y: 70 }, // lower-right
  { x: 0, y: 120 }, // bottom
  { x: -145, y: 70 }, // lower-left
  { x: -145, y: -55 }, // upper-left
] as const;

export function CommandWheel({
  chicken,
  cards,
  activeMode,
  disabledAll,
  locked,
  decisionWindow,
  feedback,
  onSelect,
}: {
  chicken: Chicken;
  cards: CommandCardDef[];
  activeMode: TacticalMode | undefined;
  disabledAll: boolean;
  /** docs/combat/tell-revamped.md §6 — the opponent has committed, so
   * coaching is locked for this exchange until the next readable window. */
  locked: boolean;
  decisionWindow: boolean;
  feedback: CommandFeedback | null;
  onSelect: (mode: TacticalMode) => void;
}) {
  const disabled = disabledAll || locked;

  return (
    <div className="relative mx-auto h-[330px] w-[420px] max-w-full">
      {/* Decorative center glow / backing */}
      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          h-[210px]
          w-[300px]
          -translate-x-1/2
          -translate-y-1/2
          rounded-[50%]
          bg-[radial-gradient(ellipse_at_center,rgba(173,128,52,0.08)_0%,rgba(0,0,0,0)_68%)]
        "
      />

      {cards.slice(0, 6).map((card, index) => {
        const position = COMMAND_POSITIONS[index];
        if (!position) return null;

        const active = activeMode === card.mode;
        const feedbackTarget = feedback?.mode === card.mode;

        return (
          <div
            key={card.mode}
            className="absolute left-1/2 top-1/2 z-10"
            style={{
              transform: `translate(
                calc(-50% + ${position.x}px),
                calc(-50% + ${position.y}px)
              )`,
            }}
          >
            <button
              type="button"
              aria-pressed={active}
              disabled={disabled}
              onClick={() => onSelect(card.mode)}
              className={`
                group
                relative
                flex
                h-[76px]
                w-[124px]
                flex-col
                items-center
                justify-center
                rounded-xl
                border
                px-3
                text-center

                backdrop-blur-md

                transition-[transform,background-color,border-color,box-shadow,opacity]
                duration-150
                ease-out

                ${
                  disabled
                    ? `
                      cursor-not-allowed
                      border-[rgba(190,160,100,0.12)]
                      bg-black/30
                      opacity-40
                    `
                    : `
                      cursor-pointer
                      border-[rgba(190,160,100,0.28)]
                      bg-[rgba(15,14,12,0.78)]

                      hover:-translate-y-1
                      hover:border-[rgba(218,181,103,0.62)]
                      hover:bg-[rgba(29,24,16,0.88)]
                      hover:shadow-[0_10px_28px_rgba(0,0,0,0.38)]

                      active:translate-y-0
                      active:scale-[0.97]
                    `
                }

                ${
                  active
                    ? `
                      border-[rgba(226,188,103,0.8)]
                      bg-[rgba(42,33,18,0.9)]
                      shadow-[0_0_0_1px_rgba(226,188,103,0.2),0_0_24px_rgba(212,162,78,0.14)]
                    `
                    : ''
                }

                ${
                  feedbackTarget && feedback?.status === 'ignored'
                    ? `
                      animate-command-ignored
                      border-[rgba(165,67,55,0.7)]
                    `
                    : ''
                }

                ${
                  feedbackTarget && feedback?.status === 'queued'
                    ? 'animate-command-queued'
                    : ''
                }
              `}
            >
              {/* Hotkey */}
              <span
                className="
                  absolute
                  right-2
                  top-1.5
                  text-[9px]
                  font-medium
                  text-[rgba(232,224,208,0.35)]
                "
              >
                {card.hotkey}
              </span>

              {/* Icon */}
              <span
                className="
                  mb-1
                  text-[20px]
                  leading-none
                  text-(--color-gold-bright)
                  transition-transform
                  duration-150
                  group-hover:scale-110
                "
              >
                {card.icon}
              </span>

              {/* Command */}
              <span
                className="
                  font-display
                  text-[14px]
                  uppercase
                  leading-none
                  tracking-[0.08em]
                  text-(--color-ivory,#e8e0d0)
                "
              >
                {card.title}
              </span>

              {/* Description */}
              <span
                className="
                  mt-1
                  whitespace-nowrap
                  text-[10px]
                  leading-none
                  text-(--color-text-muted)
                "
              >
                {card.subtitle}
              </span>

              {/* Acknowledged */}
              {feedbackTarget &&
                feedback?.status === 'acknowledged' && (
                  <span
                    className="
                      absolute
                      -right-1.5
                      -top-1.5
                      flex
                      h-5
                      w-5
                      items-center
                      justify-center
                      rounded-full
                      border
                      border-emerald-400/30
                      bg-emerald-950/90
                      text-[10px]
                      text-emerald-300
                      shadow-lg
                    "
                  >
                    ✓
                  </span>
                )}

              {/* Queued indicator */}
              {feedbackTarget && feedback?.status === 'queued' && (
                <span
                  className="
                    absolute
                    bottom-1
                    h-[2px]
                    w-8
                    rounded-full
                    bg-(--color-gold-bright)
                    opacity-80
                  "
                />
              )}
            </button>
          </div>
        );
      })}

      {/* Player rooster */}
      <div
        className="
          absolute
          left-1/2
          top-1/2
          z-20
          flex
          h-[76px]
          w-[76px]
          -translate-x-1/2
          -translate-y-1/2
          items-center
          justify-center
          rounded-full

          border-2
          border-[rgba(210,169,85,0.85)]

          bg-[rgba(7,7,6,0.9)]

          shadow-[
            0_0_0_4px_rgba(0,0,0,0.35),
            0_0_28px_rgba(212,162,78,0.22)
          ]
        "
      >
        <div
          className="
            h-[62px]
            w-[62px]
            overflow-hidden
            rounded-full
            border
            border-[rgba(212,162,78,0.25)]
            bg-black
          "
        >
          <ChickenThumbnail
            chicken={chicken}
            className="h-full w-full"
          />
        </div>
      </div>

      {/* Decision state */}
      <div
        className={`
          pointer-events-none
          absolute
          left-1/2
          top-1/2
          z-30
          mt-[48px]
          -translate-x-1/2

          whitespace-nowrap
          text-[9px]
          uppercase
          tracking-[0.18em]

          transition-opacity
          duration-200

          ${
            !disabledAll && locked
              ? 'opacity-70 text-[rgba(190,160,100,0.65)]'
              : decisionWindow && !disabled
              ? 'opacity-100 text-emerald-300/75'
              : 'opacity-0'
          }
        `}
      >
        {!disabledAll && locked ? 'Command locked' : 'Decision window open'}
      </div>
    </div>
  );
}