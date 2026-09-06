/**
 * Battle personality (spec §24) — presentation-only fighter flavour.
 *
 * Derived from the backend `fightingStyle`. These multipliers shape *how* an
 * attack looks and paces, never what it does. Combat math (hit/damage/crit/
 * stagger) is untouched — see lib/combat.ts.
 *
 * This consolidates the ad-hoc `STYLE_ANIM_PARAMS` that used to live inline in
 * BattleCanvas so the choreography controller and the camera director read one
 * source of truth.
 */

import type { FightingStyle } from "@/lib/types";

export type PersonalityArchetype = "aggressive" | "defensive" | "balanced" | "heavy" | "agile";

export interface BattlePersonality {
  archetype: PersonalityArchetype;
  /** Scales attack anticipation + recovery duration. <1 snappier. */
  timingMul: number;
  /** Scales how far the bird throws itself into a lunge (fed to resolveLunge `commit`). */
  lungeCommit: number;
  /** Scales the neutral beat between exchanges. <1 = more aggressive pressure. */
  neutralBeatMul: number;
  /** Scales footwork speed when closing / separating. */
  footworkMul: number;
  /** Resting forward lean (rad) — aggressive leans in, defensive sits back. */
  idleLean: number;
  /** Scales idle bob amplitude. */
  idleBobMul: number;
  /** Scales the visual recoil the bird shows when hit (not the physics impulse). */
  recoilMul: number;
  /** How readily the defender uses a backstep/sidestep on a miss (0..1). */
  evadeBias: number;
}

const STYLE_TO_ARCHETYPE: Record<FightingStyle, PersonalityArchetype> = {
  aggressive: "aggressive",
  counter: "defensive",
  endurance: "heavy",
  balanced: "balanced",
};

const PERSONALITIES: Record<PersonalityArchetype, Omit<BattlePersonality, "archetype">> = {
  aggressive: {
    timingMul: 0.82,
    lungeCommit: 1.2,
    neutralBeatMul: 0.7,
    footworkMul: 1.15,
    idleLean: 0.1,
    idleBobMul: 1.25,
    recoilMul: 0.9,
    evadeBias: 0.15,
  },
  defensive: {
    timingMul: 1.18,
    lungeCommit: 0.85,
    neutralBeatMul: 1.3,
    footworkMul: 1.05,
    idleLean: -0.09,
    idleBobMul: 0.7,
    recoilMul: 1.05,
    evadeBias: 0.6,
  },
  balanced: {
    timingMul: 1,
    lungeCommit: 1,
    neutralBeatMul: 1,
    footworkMul: 1,
    idleLean: 0,
    idleBobMul: 1,
    recoilMul: 1,
    evadeBias: 0.3,
  },
  heavy: {
    timingMul: 1.22,
    lungeCommit: 1.05,
    neutralBeatMul: 1.15,
    footworkMul: 0.82,
    idleLean: -0.04,
    idleBobMul: 0.6,
    recoilMul: 0.7,
    evadeBias: 0.1,
  },
  agile: {
    timingMul: 0.8,
    lungeCommit: 0.95,
    neutralBeatMul: 0.85,
    footworkMul: 1.3,
    idleLean: 0.03,
    idleBobMul: 1.1,
    recoilMul: 1.15,
    evadeBias: 0.5,
  },
};

export function personalityForStyle(style: FightingStyle): BattlePersonality {
  const archetype = STYLE_TO_ARCHETYPE[style] ?? "balanced";
  return { archetype, ...PERSONALITIES[archetype] };
}

export function personalityForArchetype(archetype: PersonalityArchetype): BattlePersonality {
  return { archetype, ...(PERSONALITIES[archetype] ?? PERSONALITIES.balanced) };
}

export const NEUTRAL_PERSONALITY = personalityForArchetype("balanced");
