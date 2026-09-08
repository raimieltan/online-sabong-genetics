import { FighterPlate, StatCompareRow, mockOpponentRecord } from "@/components/battle/MatchupScreen";
import { GENETIC_STAT_KEYS } from "@/lib/types";
import type { Chicken } from "@/lib/types";

/**
 * Pre-fight visual for /live — chicken plates (thumbnail, name, rarity, rank) plus
 * a stat comparison, shown behind the betting slip while the window is open.
 * Mirrors MatchupScreen's corners but drops the "Fight" button since /live resolves
 * on its own countdown rather than a player action.
 */
export function LiveMatchupPreview({ chickenA, chickenB }: { chickenA: Chicken; chickenB: Chicken }) {
  const recordA = chickenA.record.wins > 0 || chickenA.record.losses > 0 ? chickenA.record : mockOpponentRecord(chickenA);
  const recordB = chickenB.record.wins > 0 || chickenB.record.losses > 0 ? chickenB.record : mockOpponentRecord(chickenB);

  return (
    <div className="flex flex-col items-center gap-6 p-4 pt-10">
      <div className="relative grid w-full max-w-4xl grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <FighterPlate fighter={chickenA} corner="var(--color-azure)" record={recordA} align="left" />

        <div className="relative flex items-center justify-center px-1">
          <div className="vs-burst" />
          <span className="vs-mark font-display text-4xl sm:text-5xl">VS</span>
        </div>

        <FighterPlate fighter={chickenB} corner="var(--color-blood)" record={recordB} align="right" />
      </div>

      <div className="w-full max-w-lg space-y-2.5 rounded-lg border border-(--color-gold)/15 bg-black/20 p-4">
        {GENETIC_STAT_KEYS.map((key) => (
          <StatCompareRow key={key} statKey={key} a={chickenA} b={chickenB} />
        ))}
      </div>
    </div>
  );
}
