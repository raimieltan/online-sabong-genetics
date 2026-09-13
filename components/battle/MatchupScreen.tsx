import type { CSSProperties } from "react";

import type { Chicken, CombatRecord, GeneticStatKey } from "@/lib/types";
import { GENETIC_STAT_KEYS } from "@/lib/types";
import { effectiveStat, type PveEncounterDefinition } from "@/lib/combat";
import { RARITY_GEM, topRarity } from "@/lib/rarity";
import { ChickenViewer } from "@/components/chicken3d/ChickenViewer";
import { normalizeCombatCareer } from "@/lib/combat/evolution";

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

/**
 * Kept as a compatibility export for callers that previously requested a
 * presentation record. It now returns only server-provided facts; unknown
 * opponents stay 0-0/Unscouted rather than receiving invented history.
 */
export function mockOpponentRecord(opponent: Chicken): CombatRecord {
  return { ...opponent.record };
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

function FighterHud({ fighter, corner, record, align, recordKnown = true }: { fighter: Chicken; corner: string; record: CombatRecord; align: "left" | "right"; recordKnown?: boolean }) {
  const rarity = topRarity(fighter.traits);
  const career = normalizeCombatCareer(fighter.combatCareer);
  const knownTraits = career.evolutionTraits.filter(entry => entry.active).slice(0, 2);
  const signature = career.signatures.find(entry => entry.developed);
  const unlockedAwakenings = career.awakenings.filter(entry => entry.unlocked);
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
        <span className="matchup-badge">{recordKnown ? rankTitle(record.wins) : "Unscouted"}</span>
        <span className="matchup-badge">{fighter.fightingStyle}</span>
        <span className="matchup-badge">{recordKnown ? `${record.wins}W · ${record.losses}L` : "Record unknown"}</span>
        {knownTraits.map(trait => <span key={trait.id} className="matchup-badge">{trait.name} {trait.level > 1 ? trait.level : ''}</span>)}
        {signature && <span className="matchup-badge">Signature · {signature.name}</span>}
        {unlockedAwakenings.map(awakening => <span key={awakening.id} className="matchup-badge">Awakening · {awakening.name}</span>)}
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
  combatConfig,
  onCombatConfigChange,
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
  combatConfig?: { coachingMode: "MANUAL" | "AUTO"; openingCommand: "PRESS" | "WAIT" | "COUNTER" | "RECOVER"; disconnectPolicy: "KEEP_INSTRUCTION" | "AUTO_COACH" };
  onCombatConfigChange?: (config: { coachingMode: "MANUAL" | "AUTO"; openingCommand: "PRESS" | "WAIT" | "COUNTER" | "RECOVER"; disconnectPolicy: "KEEP_INSTRUCTION" | "AUTO_COACH" }) => void;
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
    <FighterHud fighter={opponent} corner="var(--color-blood)" record={opponentRecord} align="right" recordKnown={false} />
    <div className="matchup-model matchup-model-left"><ChickenViewer chicken={chicken} interactive={false} cameraDistance={3.1} className="h-full w-full" /></div>
    <div className="matchup-model matchup-model-right"><ChickenViewer chicken={opponent} interactive={false} cameraDistance={3.1} className="h-full w-full" /></div>
    <div className="matchup-center">
      <div className="relative"><div className="vs-burst" /><span className="vs-mark font-display text-6xl sm:text-8xl">VS</span></div>
      <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-(--color-gold-bright)">{matchInfo ?? "Exhibition match"}</p>
      <div className="matchup-comparison mt-3">{GENETIC_STAT_KEYS.map((key) => <StatCompareRow key={key} statKey={key} a={chicken} b={opponent} />)}</div>
      {combatConfig && onCombatConfigChange && <div className="mt-4 grid gap-2 text-left text-[10px] uppercase tracking-wider sm:grid-cols-3">
        <label>Coach<select value={combatConfig.coachingMode} onChange={event => onCombatConfigChange({ ...combatConfig, coachingMode: event.target.value as "MANUAL" | "AUTO" })} className="mt-1 block w-full rounded bg-black/60 p-2"><option value="MANUAL">Manual</option><option value="AUTO">Auto-Coach</option></select></label>
        <label>Opening<select value={combatConfig.openingCommand} onChange={event => onCombatConfigChange({ ...combatConfig, openingCommand: event.target.value as typeof combatConfig.openingCommand })} className="mt-1 block w-full rounded bg-black/60 p-2">{["PRESS", "WAIT", "COUNTER", "RECOVER"].map(command => <option key={command}>{command}</option>)}</select></label>
        <label>Disconnect<select value={combatConfig.disconnectPolicy} onChange={event => onCombatConfigChange({ ...combatConfig, disconnectPolicy: event.target.value as "KEEP_INSTRUCTION" | "AUTO_COACH" })} className="mt-1 block w-full rounded bg-black/60 p-2"><option value="KEEP_INSTRUCTION">Keep instruction</option><option value="AUTO_COACH">Auto-Coach</option></select></label>
      </div>}
      <button onClick={onFight} disabled={fighting} className="matchup-fight-button mt-4">{fighting ? "Entering arena..." : "Enter arena"}<span>Let the bloodlines speak.</span></button>
    </div>
  </div>;
}
