"use client";

/**
 * Comic-book overlay for the /live feed: onomatopoeia bursts ("PAK!", "BAGSAK!!")
 * that pop up near the impact side, plus a caption-box announcer line at the
 * bottom in Taglish sabong-commentary style. Purely presentational — the
 * page owns the burst queue and expiry timers (see lib/liveCommentary.ts for
 * the line-picking logic).
 */

export type CommentaryBurst = {
  id: number;
  text: string;
  side: "left" | "right" | "center";
  kind: "hit" | "crit" | "miss" | "ko";
};

interface ComicCommentaryProps {
  bursts: CommentaryBurst[];
  caption: string | null;
}

const KIND_CLASS: Record<CommentaryBurst["kind"], string> = {
  hit: "text-yellow-300",
  crit: "text-orange-400",
  miss: "text-sky-300 italic",
  ko: "text-red-500",
};

const KIND_SIZE: Record<CommentaryBurst["kind"], string> = {
  hit: "text-4xl",
  crit: "text-5xl",
  miss: "text-3xl",
  ko: "text-6xl",
};

const SIDE_POSITION: Record<CommentaryBurst["side"], string> = {
  left: "left-[14%]",
  right: "left-[58%]",
  center: "left-[38%]",
};

export function ComicCommentary({ bursts, caption }: ComicCommentaryProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {bursts.map((burst, i) => (
        <span
          key={burst.id}
          className={`font-comic animate-comic-burst absolute select-none whitespace-nowrap tracking-wide [-webkit-text-stroke:2px_black] ${KIND_CLASS[burst.kind]} ${KIND_SIZE[burst.kind]} ${SIDE_POSITION[burst.side]}`}
          style={{
            top: `${24 + (i % 3) * 12}%`,
            transform: `rotate(${burst.side === "left" ? -8 : burst.side === "right" ? 8 : 0}deg)`,
            filter: "drop-shadow(3px 3px 0 rgba(0,0,0,0.75))",
          }}
        >
          {burst.text}
        </span>
      ))}

      {caption && (
        <div className="absolute inset-x-0 bottom-3 flex justify-center px-4 sm:bottom-5">
          <div className="relative max-w-2xl rounded-2xl border-[3px] border-black bg-[#f5ecd8] px-5 py-3 text-center shadow-[4px_4px_0_rgba(0,0,0,0.6)]">
            <p className="font-comic text-lg leading-snug tracking-wide text-black sm:text-xl">
              {caption}
            </p>
            <span className="absolute -bottom-2.5 left-8 h-4 w-4 rotate-45 border-b-[3px] border-r-[3px] border-black bg-[#f5ecd8]" />
          </div>
        </div>
      )}
    </div>
  );
}
