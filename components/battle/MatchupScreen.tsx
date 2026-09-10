import type { CSSProperties } from "react";

import type { Chicken, CombatRecord, GeneticStatKey } from "@/lib/types";
import { GENETIC_STAT_KEYS } from "@/lib/types";
import { effectiveStat, type PveEncounterDefinition } from "@/lib/combat";
import { RARITY_GEM, topRarity } from "@/lib/rarity";
import { ChickenViewer } from "@/components/chicken3d/ChickenViewer";

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

export function rankTitle(wins: number): string {
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
export function mockOpponentRecord(opponent: Chicken): CombatRecord {
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

export function StatCompareRow({
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

export function FighterPlate({
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

function FighterHud({ fighter, corner, record, align }: { fighter: Chicken; corner: string; record: CombatRecord; align: "left" | "right" }) {
  const rarity = topRarity(fighter.traits);
  // Both HUDs keep the numeric value at the outside edge, followed by the
  // flexible bar track and a fixed-width label column. The right HUD only
  // differs in text alignment; reordering its grid children would put the
  // value in the middle and squeeze the bar into the narrow value column.
  const statRowColumns = align === "right"
    ? "grid-cols-[2rem_minmax(0,1fr)_5.5rem]"
    : "grid-cols-[5.5rem_minmax(0,1fr)_2rem]";
  return (
    <section className={`matchup-fighter-hud matchup-fighter-hud-${align}`} style={{ "--corner": corner } as CSSProperties}>
      <p className="font-display text-2xl font-semibold tracking-wide text-(--foreground) sm:text-4xl">
        {align === "right" && <span className="mr-2 text-base">{RARITY_GEM[rarity]}</span>}{fighter.name}{align === "left" && <span className="ml-2 text-base">{RARITY_GEM[rarity]}</span>}
      </p>
      <p className="mt-1 text-xs font-semibold uppercase tracking-[0.16em] text-(--color-text-muted)">{fighter.fightingStyle} bloodline · Gen {fighter.generation}</p>
      <div className={`mt-3 flex flex-wrap gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
        <span className="matchup-badge">{rankTitle(record.wins)}</span>
        <span className="matchup-badge">{fighter.fightingStyle}</span>
        <span className="matchup-badge">{record.wins}W · {record.losses}L</span>
      </div>
      <div className="mt-4 space-y-1.5">
        {GENETIC_STAT_KEYS.map((stat) => {
          const value = Math.round(effectiveStat(fighter, stat));
          return <div className={`grid ${statRowColumns} items-center gap-2 text-[10px] uppercase tracking-wide`} key={stat}>
            <span className={`whitespace-nowrap ${align === "right" ? "text-right" : ""}`}>{STAT_LABEL[stat]}</span>
            <span className="block h-1.5 w-full min-w-0 overflow-hidden rounded-full bg-black/45"><span className={`block h-full rounded-full ${align === "right" ? "ml-auto" : ""}`} style={{ width: `${Math.min(100, value / STAT_SCALE_MAX * 100)}%`, background: corner }} /></span>
            <span>{value}</span>
          </div>;
        })}
      </div>
    </section>
  );
}

export function MatchupScreen({
  chicken,
  opponent,
  encounter,
  fighting,
  onFight,
  eyebrow,
  title,
  subtitle,
  matchInfo,
}: {
  chicken: Chicken;
  opponent: Chicken;
  encounter?: PveEncounterDefinition | null;
  fighting: boolean;
  onFight: () => void;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  matchInfo?: string;
}) {
  const opponentRecord = mockOpponentRecord(opponent);

  return <div className="matchup-scene">
    <div className="matchup-header text-center">
      <p className="text-[10px] font-bold uppercase tracking-[0.28em] text-(--color-gold-bright)">{eyebrow ?? "PVE Challenge"}</p>
      <h1 className="font-display text-2xl font-semibold tracking-[0.08em] text-(--foreground) sm:text-4xl">{title ?? encounter?.name ?? "The Veteran"}</h1>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-(--color-text-muted)">{subtitle ?? encounter?.description ?? "Let the bloodlines speak."}</p>
    </div>
    <div className="matchup-corner matchup-corner-left" /> <div className="matchup-corner matchup-corner-right" />
    <FighterHud fighter={chicken} corner="var(--color-azure)" record={chicken.record} align="left" />
    <FighterHud fighter={opponent} corner="var(--color-blood)" record={opponentRecord} align="right" />
    <div className="matchup-model matchup-model-left"><ChickenViewer chicken={chicken} interactive={false} cameraDistance={3.1} className="h-full w-full" /></div>
    <div className="matchup-model matchup-model-right"><ChickenViewer chicken={opponent} interactive={false} cameraDistance={3.1} className="h-full w-full" /></div>
    <div className="matchup-center">
      <div className="relative"><div className="vs-burst" /><span className="vs-mark font-display text-6xl sm:text-8xl">VS</span></div>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-(--color-gold-bright)">{matchInfo ?? "Exhibition match"}</p>
      <div className="matchup-comparison mt-3">{GENETIC_STAT_KEYS.map((key) => <StatCompareRow key={key} statKey={key} a={chicken} b={opponent} />)}</div>
      <button onClick={onFight} disabled={fighting} className="matchup-fight-button mt-4">{fighting ? "Entering arena..." : "Enter arena"}<span>Let the bloodlines speak.</span></button>
    </div>
  </div>;
}
