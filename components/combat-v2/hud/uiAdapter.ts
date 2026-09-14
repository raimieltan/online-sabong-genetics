import type { Chicken, InjuryRecord } from '@/lib/types';
import type { ReadTellType } from '@/lib/combat-v2';
import type { ExchangeResolvedPayload } from '@/lib/combat-v2/interpretation';
import { presentFighterIdentity } from '@/lib/combat/identityPresenter';

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
  return presentFighterIdentity(chicken).primaryLabel;
}

export type ExchangeRecapAssistance = 'onboarding' | 'standard' | 'advanced';
export type ExchangeRecapTone = 'positive' | 'neutral' | 'negative';

export type ExchangeRecapCopy = {
  kicker: string | null;
  action: string;
  result: string | null;
  detail: string | null;
  resultTone: ExchangeRecapTone;
  ariaLabel: string;
};

const RECAP_READ_COPY: Record<string, string> = {
  GOOD: 'Good read',
  NEUTRAL: 'Unclear read',
  BAD: 'Bad read',
};

const RECAP_COMPLIANCE_COPY: Record<string, string> = {
  FULL: 'Full compliance',
  PARTIAL: 'Partial compliance',
  RESISTED: 'Instinct overruled coaching',
};

const RECAP_OUTCOME_COPY: Record<string, string> = {
  MISSED: 'attack missed',
  BLOCKED: 'attack was blocked',
  GLANCING_HIT: 'glancing hit',
  CLEAN_HIT: 'clean hit',
  COUNTERED: 'caught by the counter',
  CANCELLED: 'commitment was stopped',
  DISENGAGED: 'created breathing room',
  NO_COMMITMENT: 'no commitment',
};

const RECAP_RESULT_COPY: Record<string, string> = {
  ADVANTAGE: 'Exchange advantage',
  EVEN: 'Even exchange',
  DISADVANTAGE: 'Exchange disadvantage',
  NO_DECISIVE_RESULT: 'No decisive result',
};

const RECAP_REASON_COPY: Record<string, string> = {
  TEMPERAMENT_MISMATCH: 'Temperament resisted the plan',
  TEMPERAMENT_ALIGNED: 'Temperament suited the plan',
  LOW_BALANCE: 'Poor balance limited the response',
  LOW_STAMINA: 'Low stamina slowed the response',
};

const SUCCESSFUL_OUTCOMES = new Set(['GLANCING_HIT', 'CLEAN_HIT', 'DISENGAGED']);
const FAILED_OUTCOMES = new Set(['MISSED', 'BLOCKED', 'COUNTERED', 'CANCELLED', 'NO_COMMITMENT']);

/** The only player-facing interpretation mapper. It relabels authoritative
 * semantics and deliberately never derives combat truth from damage or timing. */
export function describeExchangeRecap(
  payload: ExchangeResolvedPayload,
  assistance: ExchangeRecapAssistance = 'onboarding',
): ExchangeRecapCopy {
  const read = String(payload.read?.quality ?? '');
  const compliance = String(payload.coaching?.compliance ?? '');
  const command = ['PRESS', 'WAIT', 'COUNTER', 'RECOVER'].includes(String(payload.coaching?.command))
    ? String(payload.coaching.command)
    : 'INSTRUCTION';
  const outcome = String(payload.primaryOutcome ?? '');
  const result = String(payload.exchangeResult ?? '');
  const readLabel = RECAP_READ_COPY[read] ?? 'Read unavailable';
  const complianceLabel = RECAP_COMPLIANCE_COPY[compliance] ?? 'Compliance unavailable';
  const outcomeLabel = RECAP_OUTCOME_COPY[outcome] ?? 'action resolved';
  const resultLabel = RECAP_RESULT_COPY[result] ?? 'Exchange resolved';
  const knownReason = Array.isArray(payload.coaching?.reasons)
    ? payload.coaching.reasons.map(String).find(reason => RECAP_REASON_COPY[reason])
    : undefined;

  let detail = knownReason ? RECAP_REASON_COPY[knownReason] : null;
  if (!detail && read === 'GOOD' && FAILED_OUTCOMES.has(outcome)) detail = 'The decision was sound; execution fell short';
  if (!detail && read === 'BAD' && SUCCESSFUL_OUTCOMES.has(outcome)) detail = 'The read was poor; execution still succeeded';
  if (!detail && compliance === 'PARTIAL') detail = 'The instruction was only partly followed';
  if (!detail && compliance === 'RESISTED') detail = 'The fighter followed instinct instead';

  const kicker = assistance === 'advanced'
    ? null
    : assistance === 'standard'
      ? compliance === 'FULL' ? null : complianceLabel
      : `${readLabel} · ${complianceLabel}`;
  const visibleResult = assistance === 'advanced' ? null : resultLabel;
  const visibleDetail = assistance === 'advanced' ? null : assistance === 'onboarding' ? detail : compliance === 'FULL' ? null : detail;
  const action = `${command} → ${outcomeLabel}`;
  const resultTone: ExchangeRecapTone = result === 'ADVANTAGE' ? 'positive' : result === 'DISADVANTAGE' ? 'negative' : 'neutral';
  const ariaLabel = [kicker, action, visibleResult, visibleDetail].filter(Boolean).join('. ');

  return { kicker, action, result: visibleResult, detail: visibleDetail, resultTone, ariaLabel };
}
