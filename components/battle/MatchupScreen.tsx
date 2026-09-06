import type { CSSProperties } from "react";

import type { Chicken, CombatRecord, GeneticStatKey } from "@/lib/types";
import { GENETIC_STAT_KEYS } from "@/lib/types";
import { effectiveStat } from "@/lib/combat";
import { RARITY_GEM, topRarity } from "@/lib/rarity";
import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";

const STAT_LABEL: Record<GeneticStatKey, string> = {
  power: "Power",
  speed: "Speed",
  stamina: "Stamina",
  defense: "Defense",
  accuracy: "Accuracy",
  agility: "Agility",
};

/** Bars are scaled against a fixed ceiling rather than the opponent's value, so a
 *  lopsided matchup still reads as lopsided (neither bar rescales to fill the row). */
const STAT_SCALE_MAX = 110;

const RANK_TITLE = [
  { minWins: 30, title: "Legend" },
  { minWins: 15, title: "Champion" },
  { minWins: 5, title: "Veteran" },
  { minWins: 0, title: "Rookie" },
] as const;

function rankTitle(wins: number): string {
  return RANK_TITLE.find((tier) => wins >= tier.minWins)?.title ?? "Rookie";
}

/** Deterministic string hash → seeded RNG, so a given chicken's mocked record stays
 *  stable across re-renders instead of jittering on every paint. */
function seededRng(seed: string): () => number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    h ^= h >>> 16;
    return (h >>> 0) / 4294967296;
  };
}

/**
 * NPC opponents are generated fresh per matchup and never persisted, so their real
 * `record` is always 0-0. The UI still needs a rival with a history, so this fabricates
 * one — seeded by the opponent's id (stable per matchup) and its stat total (stronger
 * opponents read as more battle-tested), per the design brief's "mock the AI data" ask.
 */
function mockOpponentRecord(opponent: Chicken): CombatRecord {
  const rng = seededRng(opponent.id);
  const statTotal = GENETIC_STAT_KEYS.reduce((sum, key) => sum + effectiveStat(opponent, key), 0);
  const strength = Math.min(1, Math.max(0, (statTotal - 250) / 350));
  const wins = Math.round(3 + strength * 34 + rng() * 6);
  const losses = Math.round(1 + (1 - strength) * 10 + rng() * 4);
  const koTko = Math.round(wins * (0.2 + strength * 0.35 + rng() * 0.1));
  return {
    wins,
    losses,
    championships: strength > 0.75 ? Math.round(1 + rng() * 3) : 0,
    koTko,
    decisions: Math.max(0, wins - koTko),
  };
}

function StatCompareRow({
  statKey,
  a,
  b,
}: {
  statKey: GeneticStatKey;
  a: Chicken;
  b: Chicken;
}) {
  const valueA = effectiveStat(a, statKey);
  const valueB = effectiveStat(b, statKey);
  const pctA = Math.min(100, (valueA / STAT_SCALE_MAX) * 100);
  const pctB = Math.min(100, (valueB / STAT_SCALE_MAX) * 100);

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
      <div className="flex items-center justify-end gap-2">
        <span className="w-8 text-right text-xs font-semibold tabular-nums text-(--foreground)">
          {Math.round(valueA)}
        </span>
        <div className="h-2 w-full max-w-32 overflow-hidden rounded-full bg-black/40">
          <div
            className="stat-fill ml-auto bg-(--color-azure)"
            style={{ width: `${pctA}%` }}
          />
        </div>
      </div>
      <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-(--color-text-muted)">
        {STAT_LABEL[statKey]}
      </span>
      <div className="flex items-center gap-2">
        <div className="h-2 w-full max-w-32 overflow-hidden rounded-full bg-black/40">
          <div
            className="stat-fill bg-(--color-blood)"
            style={{ width: `${pctB}%` }}
          />
        </div>
        <span className="w-8 text-xs font-semibold tabular-nums text-(--foreground)">
          {Math.round(valueB)}
        </span>
      </div>
    </div>
  );
}

function FighterPlate({
  fighter,
  corner,
  record,
  align,
}: {
  fighter: Chicken;
  corner: string;
  record: CombatRecord;
  align: "left" | "right";
}) {
  const rarity = topRarity(fighter.traits);

  return (
    <div
      className="corner-card flex flex-col items-center gap-1 overflow-hidden rounded-lg p-4 pt-5 text-center"
      style={{ "--corner": corner } as CSSProperties}
    >
      <div
        className="model-stage -mt-1 mb-1 h-32 w-full"
        style={{ "--stage-glow": `color-mix(in srgb, ${corner} 45%, transparent)` } as CSSProperties}
      >
        <ChickenThumbnail chicken={fighter} className="h-full w-full" />
      </div>
      <p className="flex items-center gap-1.5 font-display text-lg font-semibold text-(--foreground)">
        {align === "right" && <span className="text-sm">{RARITY_GEM[rarity]}</span>}
        {fighter.name}
        {align === "left" && <span className="text-sm">{RARITY_GEM[rarity]}</span>}
      </p>
      <p className="text-[11px] font-bold uppercase tracking-[0.18em]" style={{ color: corner }}>
        {fighter.fightingStyle} · Gen {fighter.generation}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-(--color-gold-bright)">
        {rankTitle(record.wins)}
      </p>
      <p className="text-xs text-(--color-text-muted)">
        {record.wins}W – {record.losses}L{record.koTko > 0 ? ` · ${record.koTko} KO` : ""}
      </p>
    </div>
  );
}

export function MatchupScreen({
  chicken,
  opponent,
  fighting,
  onFight,
}: {
  chicken: Chicken;
  opponent: Chicken;
  fighting: boolean;
  onFight: () => void;
}) {
  const opponentRecord = mockOpponentRecord(opponent);

  return (
    <div className="vs-arena h-screen flex flex-col items-center gap-6 rounded-lg p-6">
      <div className="relative grid w-full h-full grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-6">
        <FighterPlate fighter={chicken} corner="var(--color-azure)" record={chicken.record} align="left" />

        <div className="relative flex items-center justify-center px-1">
          <div className="vs-burst" />
          <span className="vs-mark font-display text-4xl sm:text-5xl">VS</span>
        </div>

        <FighterPlate fighter={opponent} corner="var(--color-blood)" record={opponentRecord} align="right" />
      </div>

      <div className="w-full max-w-lg space-y-2.5 rounded-lg border border-(--color-gold)/15 bg-black/20 p-4">
        {GENETIC_STAT_KEYS.map((key) => (
          <StatCompareRow key={key} statKey={key} a={chicken} b={opponent} />
        ))}
      </div>

      <button
        onClick={onFight}
        disabled={fighting}
        className="rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-10 py-3 font-display text-lg font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {fighting ? "Fighting..." : "⚔️ Fight"}
      </button>
    </div>
  );
}
