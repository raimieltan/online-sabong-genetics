"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";

import type { Chicken, CombatResult } from "@/lib/types";
import type { BattleReport } from "@/lib/combat/battleReport";

export type PostFightState =
  | "inactive"
  | "ko_confirm"
  | "winner_reaction"
  | "result_reveal"
  | "reward_reveal"
  | "xp_reveal"
  | "progression_reveal"
  | "condition_reveal"
  | "next_action";

const STEP_DELAY: Record<Exclude<PostFightState, "inactive">, number> = {
  ko_confirm: 850,
  winner_reaction: 900,
  result_reveal: 1050,
  reward_reveal: 900,
  xp_reveal: 1000,
  progression_reveal: 950,
  condition_reveal: 1050,
  next_action: 0,
};

const NEXT: Record<Exclude<PostFightState, "inactive" | "next_action">, PostFightState> = {
  ko_confirm: "winner_reaction",
  winner_reaction: "result_reveal",
  result_reveal: "reward_reveal",
  reward_reveal: "xp_reveal",
  xp_reveal: "progression_reveal",
  progression_reveal: "condition_reveal",
  condition_reveal: "next_action",
};

type Props = {
  result: CombatResult;
  playerChicken: Chicken;
  creditsEarned?: number;
  battleReport?: BattleReport;
  actionLabel?: string;
  onContinue: () => void;
  campaign?: { headline: string; copy: string; reputation: number; bossName: string; unlocked?: string };
};

/**
 * A presentation-only state machine. The result was persisted before this is
 * mounted; this component only reveals authoritative outcome data over the
 * still-mounted arena.
 */
export function PostFightOverlay({ result, playerChicken, creditsEarned = 0, battleReport, actionLabel = "Fight Again", onContinue, campaign }: Props) {
  const [state, setState] = useState<PostFightState>("ko_confirm");
  const didWin = result.winnerId === playerChicken.id;
  const playerInjured = result.injuredChickenId === playerChicken.id || Boolean(battleReport?.newInjuries.length);
  const next = () => setState(current => current === "next_action" ? current : NEXT[current as keyof typeof NEXT]);

  useEffect(() => {
    const activeState = state;
    if (activeState === "inactive" || activeState === "next_action") return;
    const timer = window.setTimeout(next, STEP_DELAY[activeState]);
    return () => window.clearTimeout(timer);
  }, [state]); // `next` intentionally reads only the state updater.

  useEffect(() => {
    const accelerate = (event: KeyboardEvent) => {
      if ((event.key === " " || event.key === "Enter") && state !== "ko_confirm") next();
    };
    window.addEventListener("keydown", accelerate);
    return () => window.removeEventListener("keydown", accelerate);
  }, [state]);

  const showResult = ["result_reveal", "reward_reveal", "xp_reveal", "progression_reveal", "condition_reveal", "next_action"].includes(state);
  const showRewards = ["reward_reveal", "xp_reveal", "progression_reveal", "condition_reveal", "next_action"].includes(state);
  const showExperience = ["xp_reveal", "progression_reveal", "condition_reveal", "next_action"].includes(state);
  const showProgression = ["progression_reveal", "condition_reveal", "next_action"].includes(state);
  const showCondition = ["condition_reveal", "next_action"].includes(state);

  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto p-4 sm:p-8" onClick={state === "ko_confirm" ? undefined : next}>
      {state === "ko_confirm" && <div className="pointer-events-none animate-postfight-ko text-center"><p className="font-comic text-3xl text-red-400 [-webkit-text-stroke:1px_#160806] sm:text-5xl">KALABOG!!</p><p className="mt-2 font-display text-6xl font-black tracking-[.14em] text-[#f4e3bb] drop-shadow-[0_5px_2px_rgba(0,0,0,.9)] sm:text-8xl">K.O.</p></div>}
      {state === "winner_reaction" && <div className="pointer-events-none text-center animate-postfight-rise"><p className="font-comic text-sm uppercase tracking-[.3em] text-(--color-gold-bright)">The arena erupts</p><p className="mt-2 font-display text-3xl text-(--foreground) sm:text-5xl">{didWin ? playerChicken.name : "Your fighter"} holds the moment.</p></div>}

      {showResult && <section className="postfight-glass my-auto w-full max-w-md animate-postfight-rise text-center" onClick={event => event.stopPropagation()}>
        <p className={`font-comic text-xs uppercase tracking-[.3em] ${didWin ? "text-(--color-gold-bright)" : "text-red-300"}`}>{didWin ? "Winner" : "Defeat"}</p>
        <h2 className="mt-2 font-display text-4xl font-bold tracking-[.08em] text-(--foreground) sm:text-5xl">{didWin ? "VICTORY" : "DEFEATED"}</h2>
        <p className="mt-1 font-display text-xl text-(--color-gold-bright)">{playerChicken.name}</p>
        <p className="mt-3 text-xs uppercase tracking-[.2em] text-(--color-text-muted)">{result.outcomeReason === "ko" ? "Knockout" : result.outcomeReason.replace("_", " ")} · Turn {result.totalTurns}</p>

        {showRewards && creditsEarned > 0 && <Reveal title="Rewards"><p className="font-display text-2xl text-(--color-gold-bright)">+{creditsEarned} <span className="text-base">CREDITS</span></p></Reveal>}
        {showExperience && battleReport && <Reveal title="Battle experience"><div className="grid grid-cols-2 gap-x-5 gap-y-1 text-sm">{Object.entries(battleReport.experienceGained).map(([name, value]) => <p key={name} className="flex justify-between uppercase text-(--color-text-muted)"><span>{name}</span><b className="text-(--color-gold-bright)">+{value}</b></p>)}{battleReport.totalExperienceGained > 0 && <p className="col-span-2 mt-1 border-t border-(--color-gold)/20 pt-2 font-display text-(--foreground)">+{battleReport.totalExperienceGained} XP</p>}</div></Reveal>}
        {showProgression && battleReport && battleReport.newTraits.length > 0 && <Reveal title="Trait developed">{battleReport.newTraits.map(trait => <p key={trait.id} className="font-display text-lg text-[#b899e8]">{trait.name} <span className="text-xs uppercase">{trait.rarity}</span></p>)}</Reveal>}
        {showProgression && campaign && <Reveal title="Campaign consequence"><p className="font-display text-xl text-(--color-gold-bright)">{campaign.headline}</p><p className="mt-1 text-sm text-(--color-text-muted)">{campaign.copy}</p>{campaign.reputation > 0 && <p className="mt-2 text-sm text-(--foreground)">+{campaign.reputation} reputation</p>}{campaign.unlocked && <p className="mt-2 text-xs font-semibold uppercase tracking-[.14em] text-(--color-gold-bright)">New unlock · {campaign.unlocked}</p>}</Reveal>}
        {showCondition && <Reveal title="Fight condition"><div className="space-y-1 text-sm text-(--color-text-muted)"><p>Condition <b className="ml-2 text-(--foreground)">{battleReport?.conditionDelta ?? 0}%</b></p><p>Morale <b className="ml-2 text-(--foreground)">{signed(battleReport?.moraleDelta)}</b> · Confidence <b className="text-(--foreground)">{signed(battleReport?.confidenceDelta)}</b></p>{battleReport?.newInjuries.map(injury => <p key={injury.id} className="mt-3 rounded-lg border border-red-400/35 bg-red-950/25 p-2 text-red-200">⚠ {injury.label} <span className="text-red-200/70">· {injury.severity.replace("_", " ")}</span></p>)}</div></Reveal>}

        {state === "next_action" && <div className="mt-6 flex gap-3"><Link href={playerInjured ? "/clinic" : "/coop"} className="flex-1 rounded-lg border border-(--color-gold)/35 bg-black/20 px-3 py-3 text-xs font-semibold uppercase tracking-[.12em] text-(--color-parchment) hover:bg-white/5">{playerInjured ? "Visit Clinic" : "Return to Coop"}</Link><button type="button" onClick={onContinue} className="flex-1 rounded-lg bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-3 py-3 font-display text-sm font-bold uppercase tracking-[.08em] text-(--color-ink) hover:brightness-110">{actionLabel}</button></div>}
        {state !== "next_action" && <p className="mt-5 text-[10px] uppercase tracking-[.18em] text-(--color-text-muted)">Click, Space, or Enter to continue</p>}
      </section>}
    </div>
  );
}

function Reveal({ title, children }: { title: string; children: ReactNode }) {
  return <div className="mt-5 border-t border-(--color-gold)/20 pt-4"><p className="mb-2 text-[10px] font-semibold uppercase tracking-[.24em] text-(--color-text-muted)">{title}</p>{children}</div>;
}

function signed(value = 0) { return `${value >= 0 ? "+" : ""}${value}`; }
