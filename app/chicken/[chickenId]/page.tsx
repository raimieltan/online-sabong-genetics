"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import type { Chicken, GeneticStatKey, MutationRarity } from "@/lib/types";
import { GENETIC_STAT_KEYS, PHYSICAL_TRAIT_KEYS, PHYSICAL_TRAIT_RANGE } from "@/lib/types";
import { canAgeUp, canRetire, canTrain } from "@/lib/growth";
import { canFight } from "@/lib/combat";
import { MAX_EV, defaultTrainingState } from "@/lib/training";
import { getMutationDefinition } from "@/lib/mutations";
import { RARITY_COLOR, RARITY_GEM, topRarity } from "@/lib/rarity";
import { ChickenViewer } from "@/components/chicken3d/ChickenViewer";
import { deriveBehaviorProfile } from "@/lib/combat/behavior";
import { emptyExperience } from "@/lib/combat/experience";
import { summarizeCareer } from "@/lib/career/retirement";
import { growthFactor } from "@/lib/growth";
import type { BehavioralProfile, CombatExperience, CombatExperienceCategory } from "@/lib/types";

import { StatBar } from "./StatBar";

const SEX_ICON: Record<Chicken["sex"], string> = { rooster: "🐓", hen: "🐔" };

const STAT_ICON: Record<GeneticStatKey, string> = {
  power: "⚔️",
  speed: "💨",
  stamina: "🌀",
  defense: "🛡️",
  accuracy: "🎯",
  agility: "🍀",
};

const PHYSICAL_ICON: Record<(typeof PHYSICAL_TRAIT_KEYS)[number], string> = {
  scale: "🐔",
  bodyGirth: "🫃",
  bodyLength: "📏",
  chest: "💪",
  neckLength: "🦢",
  neckThick: "🦢",
  headSize: "🗣️",
  combSize: "🔴",
  wattleSize: "🩸",
  beakLength: "🦜",
  wingSpan: "🦅",
  wingSize: "🪽",
  legLength: "🦵",
  legThick: "🦵",
  footSize: "🦶",
  tailLength: "🪶",
  tailSpread: "🦚",
  tailArc: "🌙",
};

const MUTATION_RARITY_GEM: Record<MutationRarity, string> = {
  common: "⚪",
  uncommon: "🟢",
  rare: "🔵",
  epic: "🟣",
  legendary: "⭐",
  anomalous: "💠",
};

const EXPERIENCE_ICON: Record<CombatExperienceCategory, string> = {
  offensive: "⚔️",
  defensive: "🛡️",
  evasion: "💨",
  counter: "🔁",
  pressure: "🔥",
  recovery: "💤",
  adaptation: "🧠",
};

const BEHAVIOR_ICON: Record<keyof BehavioralProfile, string> = {
  aggression: "😤",
  caution: "🧐",
  patience: "⏳",
  riskTolerance: "🎲",
  pressurePreference: "🥊",
  counterPreference: "🔁",
  recoveryPreference: "💤",
  persistence: "💪",
};

const EXPERIENCE_CAP = 500;

function conditionLabel(condition: number): string {
  if (condition >= 90) return "Peak";
  if (condition >= 75) return "Good";
  if (condition >= 50) return "Compromised";
  if (condition >= 25) return "Poor";
  return "Unfit";
}

const MUTATION_RARITY_COLOR: Record<MutationRarity, string> = {
  common: "border-neutral-600 text-neutral-300",
  uncommon: "border-emerald-600 text-emerald-300",
  rare: "border-sky-600 text-sky-300",
  epic: "border-fuchsia-600 text-fuchsia-300",
  legendary: "border-(--color-gold) text-(--color-gold-bright)",
  anomalous: "border-red-500 text-red-300",
};

const TABS = ["Info", "Stats", "Skills", "Genes", "Evolve"] as const;
type Tab = (typeof TABS)[number];

const TAB_ICON: Record<Tab, string> = {
  Info: "ℹ️",
  Stats: "📊",
  Skills: "✨",
  Genes: "🧬",
  Evolve: "🌱",
};

export default function ChickenDetailPage({ params }: { params: Promise<{ chickenId: string }> }) {
  return (
    <Suspense fallback={null}>
      <ChickenDetailPageContent params={params} />
    </Suspense>
  );
}

function ChickenDetailPageContent({ params }: { params: Promise<{ chickenId: string }> }) {
  const { chickenId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();

  const [chicken, setChicken] = useState<Chicken | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bossVictories, setBossVictories] = useState<string[]>([]);
  const requestedTab = searchParams.get("tab");
  const initialTab = (TABS as readonly string[]).includes(requestedTab ?? "") ? (requestedTab as Tab) : "Info";
  const [tab, setTab] = useState<Tab>(initialTab);

  useEffect(() => {
    fetch(`/api/chickens/${chickenId}`)
      .then(async (res) => {
        if (!res.ok) {
          setNotFound(true);
          return;
        }
        setChicken(await res.json());
      })
      .finally(() => setLoading(false));
  }, [chickenId]);

  useEffect(() => {
    fetch("/api/pve/bosses")
      .then((r) => r.json())
      .then((b: { bosses: { boss: { name: string }; progress: { firstClearChickenId: string | null } }[] }) => {
        setBossVictories(
          (b.bosses ?? [])
            .filter((e) => e.progress.firstClearChickenId === chickenId)
            .map((e) => e.boss.name),
        );
      })
      .catch(() => {});
  }, [chickenId]);

  async function handleRest() {
    const res = await fetch(`/api/chickens/${chickenId}/rest`, { method: "POST" });
    if (!res.ok) return;
    setChicken(await res.json());
  }

  async function handleHeal() {
    const res = await fetch(`/api/chickens/${chickenId}/heal`, { method: "POST" });
    if (!res.ok) return;
    setChicken(await res.json());
  }

  async function handleAgeUp() {
    const res = await fetch(`/api/chickens/${chickenId}/age-up`, { method: "POST" });
    if (!res.ok) return;
    setChicken(await res.json());
  }

  async function handleRetire() {
    const res = await fetch(`/api/chickens/${chickenId}/retire`, { method: "POST" });
    if (!res.ok) return;
    setChicken(await res.json());
  }

  async function handleSell() {
    if (!chicken) return;
    if (!confirm(`Sell ${chicken.name} for Battle Credits? This can't be undone.`)) return;
    const res = await fetch(`/api/chickens/${chickenId}/sell`, { method: "POST" });
    if (!res.ok) return;
    router.push("/coop");
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink)">
        <p className="text-(--color-text-muted)">🐔 Loading chicken...</p>
      </main>
    );
  }

  if (notFound || !chicken) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-(--color-ink)">
        <p className="text-(--color-text-muted)">Chicken not found.</p>
        <Link href="/coop" className="rounded bg-black/30 px-3 py-2 text-sm font-semibold hover:bg-black/50">
          ← Back to Coop
        </Link>
      </main>
    );
  }

  const rarity = topRarity(chicken.traits);
  const stars = Math.max(1, ["common", "uncommon", "rare", "epic", "legendary"].indexOf(rarity) + 1);
  const condition = chicken.condition ?? 100;
  const behavior: BehavioralProfile = chicken.behavior ?? deriveBehaviorProfile(chicken.fightingStyle, chicken.traits);
  const experience: CombatExperience = chicken.experience ?? emptyExperience();
  const injuries = chicken.injuries ?? [];
  const trainingState = chicken.trainingState ?? defaultTrainingState();
  const careerStory = summarizeCareer(chicken);
  const expressedMutations = Object.entries(chicken.mutations)
    .filter(([, gene]) => gene.expressed)
    .map(([id]) => getMutationDefinition(id))
    .filter((def): def is NonNullable<typeof def> => Boolean(def));

  return (
    <main className="mx-auto min-h-screen max-w-5xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/coop"
          className="rounded bg-black/30 px-3 py-1.5 text-sm font-semibold text-(--foreground) hover:bg-black/50"
        >
          ← Back to Coop
        </Link>
        <span className="signboard px-6 py-2 font-display text-lg font-semibold text-(--color-gold-bright)">
          Chicken Details
        </span>
        <span className="w-[92px]" />
      </div>

      {/* Hero panel: viewer + identity + stats + tab rail */}
      <div className="panel-wood grid grid-cols-1 gap-6 rounded-lg p-5 md:grid-cols-[1.1fr_1.4fr_auto]">
        <div className="model-stage h-64 md:h-full">
          <ChickenViewer chicken={chicken} className="h-full w-full" cameraDistance={3.2} />
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-(--foreground)">
              {SEX_ICON[chicken.sex]} {chicken.name}
            </h1>
            <span className="text-(--color-gold-bright)">{"★".repeat(stars)}</span>
            <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${RARITY_COLOR[rarity]}`}>
              {RARITY_GEM[rarity]} {rarity}
            </span>
          </div>
          <p className="mt-1 text-sm text-(--color-text-muted)">
            Gen {chicken.generation} · {chicken.growthStage.replace("_", " ")} · Age {chicken.age} · Development{" "}
            {Math.round(growthFactor(chicken.growthStage) * 100)}%
          </p>

          <div className="mt-4 space-y-2.5">
            {GENETIC_STAT_KEYS.map((stat) => (
              <StatBar
                key={stat}
                icon={STAT_ICON[stat]}
                label={stat}
                value={Math.round((chicken.iv[stat] + chicken.ev[stat]) * growthFactor(chicken.growthStage))}
                max={200}
              />
            ))}
          </div>

          {chicken.traits.length > 0 && (
            <div className="mt-4">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">Skills</p>
              <div className="flex flex-wrap gap-2">
                {chicken.traits.map((trait) => (
                  <span
                    key={trait.id}
                    title={trait.description}
                    className={`flex h-9 w-9 items-center justify-center rounded-md border text-base ${RARITY_COLOR[trait.rarity]}`}
                  >
                    ✨
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <nav className="flex flex-row gap-2 md:flex-col">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-left text-sm font-semibold transition ${
                tab === t
                  ? "bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) text-(--color-ink) shadow shadow-black/40"
                  : "bg-black/25 text-(--foreground) hover:bg-black/40"
              }`}
            >
              <span>{TAB_ICON[t]}</span>
              {t}
            </button>
          ))}
        </nav>
      </div>

      {/* Detail panel, driven by the active tab */}
      <div className="panel-parchment mt-6 rounded-lg p-5">
        {tab === "Info" && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">🏆 Record</h2>
            <p className="text-sm opacity-80">
              {chicken.record.wins}W - {chicken.record.losses}L · {chicken.record.championships} championships ·{" "}
              {chicken.record.koTko} KO/TKO
            </p>

            {bossVictories.length > 0 && (
              <p className="text-sm opacity-80">
                <span className="font-semibold">🛡️ Boss victories:</span> {bossVictories.join(", ")}
              </p>
            )}

            <div className="flex items-center justify-between border-t border-(--color-parchment-dark) pt-4">
              <div>
                <h3 className="font-display font-semibold">⚡ Energy</h3>
                <p className="text-sm opacity-70">{chicken.energy}/100</p>
              </div>
              {chicken.energy < 100 && (
                <button
                  onClick={handleRest}
                  className="rounded bg-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-black/20"
                >
                  Rest
                </button>
              )}
            </div>

            <div className="flex flex-col gap-2 border-t border-(--color-parchment-dark) pt-4 sm:flex-row">
              {canFight(chicken) && (
                <Link
                  href={`/battle/${chicken.id}`}
                  className="flex flex-1 items-center justify-center gap-1.5 rounded bg-black/10 px-3 py-2 text-sm font-semibold hover:bg-black/20"
                >
                  ⚔️ Fight
                </Link>
              )}
              <Link
                href={`/tournament/${chicken.id}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded bg-black/10 px-3 py-2 text-sm font-semibold hover:bg-black/20"
              >
                🏆 Enter Tournament
              </Link>
              <Link
                href={`/pedigree/${chicken.id}`}
                className="flex flex-1 items-center justify-center gap-1.5 rounded bg-black/10 px-3 py-2 text-sm font-semibold hover:bg-black/20"
              >
                🌳 View Pedigree
              </Link>
            </div>

            <div className="border-t border-(--color-parchment-dark) pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-display font-semibold">💚 Condition</h3>
                <span className="text-sm font-semibold opacity-70">
                  {condition}/100 · {conditionLabel(condition)}
                </span>
              </div>
              <div className="mt-2">
                <StatBar icon="💚" label="condition" value={condition} max={100} />
              </div>
            </div>

            {injuries.length > 0 && (
              <div className="border-t border-(--color-parchment-dark) pt-4">
                <div className="flex items-center justify-between">
                  <h3 className="mb-2 font-display font-semibold">🩹 Injuries</h3>
                  {injuries.some((i) => !i.permanent && i.recoveryRemaining > 0) && (
                    <button
                      onClick={handleHeal}
                      className="rounded bg-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-black/20"
                    >
                      Heal
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {injuries.map((injury) => (
                    <p key={injury.id} className="text-sm opacity-80">
                      {injury.label}{" "}
                      <span className="text-xs uppercase opacity-60">
                        · {injury.severity.replace("_", " ")}
                        {injury.permanent ? " · permanent" : ` · ${injury.recoveryRemaining} left to heal`}
                      </span>
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="border-t border-(--color-parchment-dark) pt-4">
              <h3 className="mb-2 font-display font-semibold">🧭 Behavior</h3>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-4">
                {(Object.keys(BEHAVIOR_ICON) as (keyof BehavioralProfile)[]).map((key) => (
                  <p key={key} className="text-xs opacity-80">
                    {BEHAVIOR_ICON[key]} {key}: {Math.round(behavior[key] * 100)}%
                  </p>
                ))}
              </div>
            </div>

            <div className="border-t border-(--color-parchment-dark) pt-4">
              <h3 className="mb-2 font-display font-semibold">📖 Combat Experience</h3>
              <div className="space-y-2">
                {(Object.keys(experience) as CombatExperienceCategory[]).map((key) => (
                  <StatBar
                    key={key}
                    icon={EXPERIENCE_ICON[key]}
                    label={key}
                    value={experience[key]}
                    max={EXPERIENCE_CAP}
                  />
                ))}
              </div>
            </div>

            <div className="border-t border-(--color-parchment-dark) pt-4">
              <h3 className="mb-1 font-display font-semibold">🎓 Training Capacity</h3>
              <p className="text-sm opacity-80">
                {trainingState.trainingPoints} training points remaining · {trainingState.trainingFatigue}/100 overtraining load
              </p>
            </div>

            <div className="border-t border-(--color-parchment-dark) pt-4">
              <h3 className="mb-1 font-display font-semibold">📜 Career Story</h3>
              <p className="whitespace-pre-line text-sm leading-relaxed opacity-80">{careerStory}</p>
            </div>
          </div>
        )}

        {tab === "Stats" && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">🧬 IV (genetic potential)</h2>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {GENETIC_STAT_KEYS.map((stat) => (
                <p key={stat} className="text-sm opacity-80">
                  {STAT_ICON[stat]} {stat}: {chicken.iv[stat]}
                </p>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-(--color-parchment-dark) pt-4">
              <h2 className="flex items-center gap-1 font-display text-lg font-semibold">
                💪 EV (trained) <span className="text-sm font-normal opacity-60">· ⚡ {chicken.energy}/100</span>
              </h2>
            </div>
            <div className="space-y-3">
              {GENETIC_STAT_KEYS.map((stat) => (
                <div key={stat} className="flex items-center gap-3">
                  <div className="flex-1">
                    <StatBar icon={STAT_ICON[stat]} label={stat} value={chicken.ev[stat]} max={MAX_EV} />
                  </div>
                </div>
              ))}
            </div>

            {canTrain(chicken.growthStage) && (
              <Link
                href={`/training?chickenId=${chicken.id}`}
                className="mt-2 flex items-center justify-center gap-1.5 rounded bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-3 py-2 text-sm font-semibold text-(--color-ink) hover:brightness-110"
              >
                🏋️ Go to Training Gym
              </Link>
            )}
          </div>
        )}

        {tab === "Skills" && (
          <div className="space-y-3">
            <h2 className="font-display text-lg font-semibold">✨ Skills</h2>
            {chicken.traits.length === 0 ? (
              <p className="text-sm opacity-70">No traits.</p>
            ) : (
              chicken.traits.map((trait) => (
                <div
                  key={trait.id}
                  className={`flex items-start gap-3 rounded-md border p-3 ${RARITY_COLOR[trait.rarity]}`}
                >
                  <span className="text-xl">✨</span>
                  <div>
                    <p className="font-display font-semibold">
                      {trait.name} <span className="text-xs font-normal uppercase opacity-70">· {trait.rarity}</span>
                    </p>
                    <p className="text-sm opacity-80">{trait.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {tab === "Genes" && (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div>
              <h2 className="mb-3 font-display text-lg font-semibold">🧬 Physical Genes</h2>
              <div className="space-y-3">
                {PHYSICAL_TRAIT_KEYS.map((key) => {
                  const range = PHYSICAL_TRAIT_RANGE[key];
                  return (
                    <StatBar
                      key={key}
                      icon={PHYSICAL_ICON[key]}
                      label={key}
                      value={chicken.physical[key] - range.min}
                      max={range.max - range.min}
                      display={chicken.physical[key].toFixed(2)}
                    />
                  );
                })}
              </div>

              <h2 className="mb-3 mt-6 font-display text-lg font-semibold">☢️ Mutations</h2>
              {expressedMutations.length === 0 ? (
                <p className="text-sm opacity-70">No expressed mutations.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {expressedMutations.map((def) => (
                    <span
                      key={def.id}
                      className={`rounded border px-2 py-1 text-xs font-medium ${MUTATION_RARITY_COLOR[def.rarity]}`}
                    >
                      {MUTATION_RARITY_GEM[def.rarity]} {def.name}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-3">
              <div className="model-stage-light h-56 w-full">
                <ChickenViewer chicken={chicken} interactive={false} className="h-full w-full" cameraDistance={3.5} />
              </div>
              <Link
                href={`/pedigree/${chicken.id}`}
                className="flex items-center justify-center gap-1.5 rounded bg-black/10 px-3 py-2 text-sm font-semibold hover:bg-black/20"
              >
                🌳 View Bloodline
              </Link>
            </div>
          </div>
        )}

        {tab === "Evolve" && (
          <div className="space-y-4">
            <h2 className="font-display text-lg font-semibold">🌱 Growth</h2>
            <p className="text-sm opacity-80">
              Currently <strong>{chicken.growthStage.replace("_", " ")}</strong> at age {chicken.age}.
            </p>
            <div className="flex flex-col gap-2 sm:flex-row">
              {canAgeUp(chicken.growthStage) && (
                <button
                  onClick={handleAgeUp}
                  className="flex-1 rounded bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-3 py-2 text-sm font-semibold text-(--color-ink) shadow shadow-black/40 hover:brightness-110"
                >
                  Age Up
                </button>
              )}
              {canRetire(chicken.growthStage) && (
                <button
                  onClick={handleRetire}
                  className="flex-1 rounded bg-black/10 px-3 py-2 text-sm font-semibold hover:bg-black/20"
                >
                  Retire
                </button>
              )}
            </div>

            <button
              onClick={handleSell}
              className="mt-4 flex w-full items-center justify-center gap-1.5 rounded bg-red-900/20 px-3 py-2 text-sm font-semibold text-red-800 hover:bg-red-900/30"
            >
              🪙 Sell Chicken
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
