import type { CombatLogEntry, CombatResult, StaggerLevel } from "@/lib/types";

/**
 * Comic-book color commentary for the /live feed — a sabong announcer
 * hyping the crowd in Taglish, plus onomatopoeia bursts timed to impacts.
 * Pure functions only; the UI (ComicCommentary) owns display/timing.
 */

export type CommentaryLine = {
  /** Onomatopoeia burst rendered at the impact point (comic sound-effect style). */
  burst: string | null;
  /** Announcer caption line, comic-caption-box style. */
  caption: string | null;
};

function pick<T>(pool: readonly T[]): T {
  return pool[Math.floor(Math.random() * pool.length)];
}

const MISS_BURSTS = ["SILIP!", "WALA!", "LIHIS!", "HAWAK LANG!"] as const;
const MISS_CAPTIONS = [
  "Ay hindi tumama! Palag lang 'yon!",
  "Wala sa oras — nakaiwas!",
  "Suntok sa hangin lang 'yan, boss!",
] as const;

const CRIT_BURSTS = ["PAK!!", "BLAM!!", "TAMA!!", "KALABOG!!"] as const;
const CRIT_CAPTIONS = [
  "DIYOS KO PO — malakas 'yan!",
  "Sugat na sugat! Sugod pa rin!",
  "Sinong maglalakas ng loob after n'yan?!",
] as const;

const HIT_BURSTS = ["PAK!", "TAG!", "BAT!", "SIPA!"] as const;
const HIT_CAPTIONS = [
  "Sipa na naman — kulang pa 'yan!",
  "Tama! Kunti-kunti lang pero tumatama!",
  "Sugod, sugod — walang atrasan dito!",
] as const;

const STAGGER_BURSTS: Partial<Record<StaggerLevel, readonly string[]>> = {
  stumble: ["BUGSO!", "DAPA-DAPA!"],
  medium: ["HAGIS!", "IGTAD!"],
  heavy: ["BUWAL!", "GUHO!"],
  knockdown: ["BAGSAK!!", "LUPA!!"],
};

const KNOCKDOWN_CAPTIONS = [
  "BAGSAK! Nadapa siya sa sabungan!",
  "Timbuwang! Kaya pa kaya bumangon?!",
  "Lupa ang lamig — grabe ang tama!",
] as const;

const KO_CAPTIONS = [
  "TAPOS NA! KNOCKOUT DITO SA SABUNGAN!",
  "Habang buhay 'yan mararanasan — KO!",
  "Wala nang bumangon! Tapos na ang laban!",
] as const;

const DECISION_CAPTIONS = [
  "Hanggang huling sandali — desisyon ang laban!",
  "Pareho lumaban nang husto — sa puntos na 'to napunta!",
] as const;

/** Announcer intro when a bout's matchup is revealed. */
export function commentaryForBoutStart(
  nameA: string,
  nameB: string,
  mode: "pve" | "pvp" | "exhibition",
): string {
  if (mode === "exhibition") {
    return pick([
      `Habang naghihilom ang manok mo, panoorin muna natin sina ${nameA} at ${nameB}!`,
      `Exhibition match! ${nameA} laban kay ${nameB} — sugod na!`,
    ]);
  }
  if (mode === "pvp") {
    return pick([
      `Kapit-bahay na away! ${nameA} laban sa sarili niyang kasamahan na si ${nameB}!`,
      `Sibling rivalry sa sabungan — ${nameA} vs ${nameB}!`,
    ]);
  }
  return pick([
    `Narito na sila! ${nameA} laban kay ${nameB} — sino ang uuwing bayani?!`,
    `Sugod na! ${nameA} vs ${nameB} — ang taya ay handa na!`,
  ]);
}

/** Called on every resolved impact (CombatLogEntry) to get the comic burst + caption for it. */
export function commentaryForImpact(entry: CombatLogEntry): CommentaryLine {
  if (entry.isMiss) {
    return { burst: pick(MISS_BURSTS), caption: Math.random() < 0.4 ? pick(MISS_CAPTIONS) : null };
  }

  if (entry.stagger === "knockdown") {
    return { burst: pick(STAGGER_BURSTS.knockdown!), caption: pick(KNOCKDOWN_CAPTIONS) };
  }

  if (entry.isCritical) {
    return { burst: pick(CRIT_BURSTS), caption: pick(CRIT_CAPTIONS) };
  }

  const staggerBursts = STAGGER_BURSTS[entry.stagger];
  if (entry.isCrit || staggerBursts) {
    return {
      burst: staggerBursts ? pick(staggerBursts) : pick(CRIT_BURSTS),
      caption: Math.random() < 0.5 ? pick(HIT_CAPTIONS) : null,
    };
  }

  return { burst: pick(HIT_BURSTS), caption: Math.random() < 0.2 ? pick(HIT_CAPTIONS) : null };
}

/** Called once the bout resolves — the closing announcer line. */
export function commentaryForResult(result: CombatResult, winnerName: string): string {
  if (result.outcomeReason === "ko" || result.outcomeReason === "critical_injury") {
    return `${pick(KO_CAPTIONS)} Panalo si ${winnerName}!`;
  }
  return `${pick(DECISION_CAPTIONS)} Panalo si ${winnerName} sa desisyon!`;
}
