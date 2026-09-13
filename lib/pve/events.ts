import type { PveBossDefinition } from "./types";
import type { RivalryStatus } from "./rivalry";
import type { SideEncounterDefinition } from "./types";

export type NewCampaignEvent = {
  kind: "callout" | "rivalry_decider" | "invitational_unlocked" | "special_encounter_unlocked" | "milestone";
  bossId: string | null;
  headline: string;
  detail: string;
};

const REPUTATION_MILESTONES = [100, 250, 500, 1000, 2000];

/**
 * Purely state-based derivation (parent spec §22: "content should derive
 * from actual game state") — no scripted narrative branches. Called once
 * inside finishBossFight's transaction so events never desync from the fight
 * that caused them.
 */
export function deriveCampaignEvents(ctx: {
  boss: PveBossDefinition;
  won: boolean;
  priorHistory: { wins: number; losses: number } | null;
  rivalry: RivalryStatus;
  wasRivalryDeciderDueBefore: boolean;
  reputationBefore: number;
  reputationAfter: number;
  newlyUnlockedSideEncounters: readonly SideEncounterDefinition[];
}): NewCampaignEvent[] {
  const events: NewCampaignEvent[] = [];
  const priorStreak = ctx.priorHistory ? ctx.priorHistory.losses - ctx.priorHistory.wins : 0;

  // A boss that has been beating the player loses that streak.
  if (ctx.won && priorStreak >= 2) {
    events.push({
      kind: "callout",
      bossId: ctx.boss.id,
      headline: `${ctx.boss.name.toUpperCase()}'S STREAK ENDS`,
      detail: `${ctx.boss.name} had won ${priorStreak} straight against this fighter. Not anymore.`,
    });
  }

  if (!ctx.wasRivalryDeciderDueBefore && ctx.rivalry.deciderDue) {
    events.push({
      kind: "rivalry_decider",
      bossId: ctx.boss.id,
      headline: `${ctx.boss.name.toUpperCase()} — NEXT FIGHT: DECIDER`,
      detail: `The record between this fighter and ${ctx.boss.name} is even. Neither side is calling it settled.`,
    });
  }

  for (const encounter of ctx.newlyUnlockedSideEncounters) {
    events.push({
      kind: encounter.kind === "invitational" ? "invitational_unlocked" : "special_encounter_unlocked",
      bossId: encounter.id,
      headline: encounter.kind === "invitational" ? `INVITATION RECEIVED: ${encounter.name.toUpperCase()}` : `SPECIAL ENCOUNTER APPEARS: ${encounter.name.toUpperCase()}`,
      detail: encounter.description,
    });
  }

  const crossed = REPUTATION_MILESTONES.find((m) => ctx.reputationBefore < m && ctx.reputationAfter >= m);
  if (crossed) {
    events.push({
      kind: "milestone",
      bossId: null,
      headline: `REPUTATION MILESTONE: ${crossed}`,
      detail: "The circuit is beginning to pay closer attention to this fighter.",
    });
  }

  return events;
}
