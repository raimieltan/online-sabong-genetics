import type { Chicken, InjuryRecord } from '@/lib/types';
import type { ReadTellType } from '@/lib/combat-v2';
import type { BattleHudVisibility } from '@/lib/animation/battleDirector';

/** UI-only phase label — a relabeling of `engagement.phase`, not a new state machine. */
export type CombatUiPhase = 'circle' | 'read' | 'clash' | 'disengage';

const ENGAGEMENT_TO_UI_PHASE: Record<string, CombatUiPhase> = {
  stalking: 'circle',
  resetting: 'circle',
  committing: 'read',
  clashing: 'clash',
  breaking: 'disengage',
};

export function engagementToUiPhase(engagementPhase: string): CombatUiPhase {
  return ENGAGEMENT_TO_UI_PHASE[engagementPhase] ?? 'circle';
}

export type TellUiState = {
  id: number;
  fighterSide: 'left' | 'right';
  label: string;
  interpretation: string;
  icon: string;
  /** 0..1 ramp — drives HUD opacity/scale and gates whether the subtitle shows yet. */
  strength: number;
  secondary?: { label: string; icon: string };
  /** Live world->screen projection of the fighter's head, in viewport percent.
   * Falls back to the static side-lane position when the camera has the
   * fighter off-frame (`visible: false`) or the projection isn't wired up. */
  anchor?: { xPct: number; yPct: number; visible: boolean };
};

/**
 * Canonical tell vocabulary (docs/combat/tell-revamped.md §7-§20, §58-§59).
 * These describe observable body language only — never the underlying
 * action the simulator actually chose. Subtitles stay under four words and
 * are optional; most tells read fine on the label + icon alone.
 */
const READ_TELL_META: Record<ReadTellType, { label: string; interpretation: string; icon: string }> = {
  weight_forward: { label: 'Weight Forward', interpretation: 'Likely to commit', icon: '↗' },
  closing_distance: { label: 'Closing Distance', interpretation: 'Cutting the angle', icon: '↑' },
  wing_adjust: { label: 'Wing Adjust', interpretation: '', icon: '🪽' },
  head_low: { label: 'Head Low', interpretation: '', icon: '⌄' },
  guard_open: { label: 'Guard Open', interpretation: '', icon: '◇' },
  rear_leg_loaded: { label: 'Rear Leg Loaded', interpretation: '', icon: '⚡' },
  hesitating: { label: 'Hesitating', interpretation: '', icon: '?' },
  recovering: { label: 'Recovering', interpretation: 'Movement slowed', icon: '⬡' },
  angle_shift: { label: 'Angle Shift', interpretation: '', icon: '↔' },
  side_on_stance: { label: 'Side-On Stance', interpretation: '', icon: '⟂' },
  overextended: { label: 'Overextended', interpretation: '', icon: '!' },
  resetting: { label: 'Resetting', interpretation: '', icon: '↺' },
};

/** Only surface the subtitle once the tell is a strong, HUD-readable read
 * (docs §22 — "0.55 HUD may recognize tell"). Below that the label alone
 * (or nothing, for a barely-forming tell) is shown. */
export function describeReadTell(type: ReadTellType, strength: number): { label: string; interpretation: string; icon: string } {
  const meta = READ_TELL_META[type];
  return { ...meta, interpretation: strength >= .55 ? meta.interpretation : '' };
}

export type StatusIconUi = {
  id: string;
  icon: string;
  label: string;
  tooltip: string;
};

const SEVERITY_ICON: Record<string, string> = {
  minor: '●',
  serious: '◆',
  career_altering: '☠',
};

/** Adapts a chicken's *pre-existing* injury records (real data, from before this fight) into HUD status chips. Does not invent in-fight injuries — combat-v2 does not yet track those on the fighter snapshot. */
export function injuriesToStatusIcons(injuries: InjuryRecord[] | undefined): StatusIconUi[] {
  if (!injuries?.length) return [];
  return injuries.map(injury => ({
    id: injury.id,
    icon: SEVERITY_ICON[injury.severity] ?? '●',
    label: injury.label,
    tooltip: injury.label,
  }));
}

export function fighterSubtitle(chicken: Chicken): string {
  return chicken.breed ? `${chicken.breed} Line` : `Gen ${chicken.generation} Bloodline`;
}
