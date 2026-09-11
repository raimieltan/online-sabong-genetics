"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { ChickenViewer } from "@/components/chicken3d/ChickenViewer";
import { battleEligibility } from "@/lib/medical/eligibility";
import { describeMedicalStatus, medicalStatus } from "@/lib/medical/status";
import { emptyExperience } from "@/lib/combat/experience";
import { normalizeCombatCareer } from "@/lib/combat/evolution";
import { effectiveStat } from "@/lib/combat";
import { ageUpRequirements, canAgeUp, canChickenAgeUp, canRetire, canTrain, nextGrowthStage } from "@/lib/growth";
import { summarizeCareer } from "@/lib/career/retirement";
import { defaultTrainingState, MAX_EV } from "@/lib/training";
import { getMutationDefinition } from "@/lib/mutations";
import { topRarity } from "@/lib/rarity";
import { setPlayerCredits } from "@/lib/playerStore";
import {
  developmentPercent,
  deriveDossierArchetype,
  dossierBehavior,
  DOSSIER_STATS,
  physicalBand,
  physicalDossier,
  potentialGrade,
  recommendedDevelopment,
  temperamentSummary,
  valueBand,
} from "@/lib/chickenDossier";
import {
  GROWTH_STAGES,
  PHYSICAL_TRAIT_KEYS,
  PHYSICAL_TRAIT_RANGE,
  type Chicken,
  type CombatExperienceCategory,
  type GeneticStatKey,
} from "@/lib/types";

import styles from "./chicken-detail.module.css";

const TABS = ["Overview", "Development", "Combat", "Genetics", "Career"] as const;
type Tab = (typeof TABS)[number];

const TAB_MARK: Record<Tab, string> = { Overview: "OV", Development: "DV", Combat: "CB", Genetics: "GN", Career: "CR" };
const STAT_MARK: Record<GeneticStatKey, string> = { power: "PW", speed: "SP", stamina: "ST", defense: "DF", accuracy: "AC", agility: "AG" };
const EXPERIENCE_LABEL: Record<CombatExperienceCategory, string> = { offensive: "Offense", defensive: "Defense", evasion: "Evasion", counter: "Counter", pressure: "Pressure", recovery: "Recovery", adaptation: "Adaptation" };
const REGION_TRAITS = {
  Head: ["headSize", "combSize", "wattleSize", "beakLength"],
  Frame: ["scale", "bodyGirth", "bodyLength", "chest"],
  Neck: ["neckLength", "neckThick"],
  Wings: ["wingSpan", "wingSize"],
  Legs: ["legLength", "legThick", "footSize"],
  Tail: ["tailLength", "tailSpread", "tailArc"],
} as const;
type BodyRegion = keyof typeof REGION_TRAITS;
const STAGES = GROWTH_STAGES.filter((stage) => stage !== "retired");
const DEFAULT_CONFIDENCE = 50;
const DEFAULT_MORALE = 75;
const DEFAULT_STRESS = 0;

type ChickenApiPayload = Omit<Chicken, "parents" | "bloodlineId"> & {
  fatherId?: string | null;
  motherId?: string | null;
  parents?: Chicken["parents"];
  bloodlineId?: string;
};

function normalizeChickenPayload(payload: ChickenApiPayload): Chicken {
  return {
    ...payload,
    parents: payload.parents ?? {
      fatherId: payload.fatherId ?? null,
      motherId: payload.motherId ?? null,
    },
    bloodlineId: payload.bloodlineId ?? payload.id,
  };
}

function pretty(value: string): string { return value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase()); }
function pct(value: number, max = 100): number { return Math.min(100, Math.max(0, (value / max) * 100)); }

function Meter({ label, value, inverse = false }: { label: string; value: number; inverse?: boolean }) {
  return <div className={styles.meter}><span>{label}</span><i><b className={inverse ? styles.inverseFill : ""} style={{ width: `${pct(value)}%` }} /></i><strong>{Math.round(value)}</strong></div>;
}

function SectionHeading({ eyebrow, title, copy }: { eyebrow: string; title: string; copy?: string }) {
  return <header className={styles.sectionHeading}><span>{eyebrow}</span><h2>{title}</h2>{copy && <p>{copy}</p>}</header>;
}

function GlassCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`${styles.card} ${className}`}>{children}</section>;
}

function StatusPill({ children, tone = "gold" }: { children: React.ReactNode; tone?: "gold" | "green" | "red" }) {
  return <span className={`${styles.statusPill} ${styles[tone]}`}>{children}</span>;
}

function EmptyState({ title, copy, action }: { title: string; copy: string; action?: React.ReactNode }) {
  return <div className={styles.emptyState}><span>◇</span><h3>{title}</h3><p>{copy}</p>{action}</div>;
}

export default function ChickenDetailPage({ params }: { params: Promise<{ chickenId: string }> }) {
  return <Suspense fallback={null}><ChickenDetailPageContent params={params} /></Suspense>;
}

function ChickenDetailPageContent({ params }: { params: Promise<{ chickenId: string }> }) {
  const { chickenId } = use(params);
  const router = useRouter();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const firstTab = TABS.find((candidate) => candidate.toLowerCase() === requestedTab?.toLowerCase()) ?? "Overview";
  const [tab, setTab] = useState<Tab>(firstTab);
  const [region, setRegion] = useState<BodyRegion>("Frame");
  const [moreOpen, setMoreOpen] = useState(false);
  const [chicken, setChicken] = useState<Chicken | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [bossVictories, setBossVictories] = useState<string[]>([]);

  useEffect(() => {
    fetch(`/api/chickens/${chickenId}`).then(async (response) => {
      if (!response.ok) return setNotFound(true);
      setChicken(normalizeChickenPayload(await response.json()));
    }).finally(() => setLoading(false));
  }, [chickenId]);

  useEffect(() => {
    fetch("/api/pve/bosses").then((response) => response.json()).then((body: { bosses?: { boss: { name: string }; progress: { firstClearChickenId: string | null } }[] }) => {
      setBossVictories((body.bosses ?? []).filter((entry) => entry.progress.firstClearChickenId === chickenId).map((entry) => entry.boss.name));
    }).catch(() => {});
  }, [chickenId]);

  function chooseTab(next: Tab) {
    setTab(next);
    setMoreOpen(false);
    router.replace(`/chicken/${chickenId}?tab=${next.toLowerCase()}`, { scroll: false });
  }
  async function refreshFrom(response: Response) {
    if (response.ok) setChicken(normalizeChickenPayload(await response.json()));
  }
  async function handleRest() { await refreshFrom(await fetch(`/api/chickens/${chickenId}/rest`, { method: "POST" })); }
  async function handleAgeUp() { await refreshFrom(await fetch(`/api/chickens/${chickenId}/age-up`, { method: "POST" })); }
  async function handleRetire() { await refreshFrom(await fetch(`/api/chickens/${chickenId}/retire`, { method: "POST" })); setMoreOpen(false); }
  async function handleSell() {
    if (!chicken || !confirm(`Sell ${chicken.name} for Battle Credits? This can't be undone.`)) return;
    const response = await fetch(`/api/chickens/${chickenId}/sell`, { method: "POST" });
    if (!response.ok) return;
    setPlayerCredits(((await response.json()) as { credits: number }).credits);
    router.push("/coop");
  }

  if (loading) return <main className={styles.statePage}><span className={styles.loadingSigil}>◇</span><p>Opening fighter dossier…</p></main>;
  if (notFound || !chicken) return <main className={styles.statePage}><p>Fighter dossier not found.</p><Link href="/coop">Return to the coop</Link></main>;

  const rarity = topRarity(chicken.traits);
  const archetype = deriveDossierArchetype(chicken);
  const behavior = dossierBehavior(chicken);
  const experience = chicken.experience ?? emptyExperience();
  const training = chicken.trainingState ?? defaultTrainingState();
  const combatCareer = normalizeCombatCareer(chicken.combatCareer);
  const physical = physicalDossier(chicken);
  const recommendation = recommendedDevelopment(chicken);
  const eligibility = battleEligibility(chicken);
  const development = developmentPercent(chicken);
  const nextStage = nextGrowthStage(chicken.growthStage);
  const maturityRequirements = ageUpRequirements(chicken);
  const readyToMature = canChickenAgeUp(chicken);
  const expressedMutations = Object.entries(chicken.mutations).filter(([, gene]) => gene.expressed).map(([id]) => getMutationDefinition(id)).filter((definition): definition is NonNullable<typeof definition> => Boolean(definition));
  const totalExperience = Object.values(experience).reduce((sum, value) => sum + value, 0);
  const totalEv = DOSSIER_STATS.reduce((sum, stat) => sum + chicken.ev[stat], 0);
  const activeInjuries = (chicken.injuries ?? []).filter((injury) => injury.permanent || injury.recoveryRemaining > 0);

  return <main className={styles.page}>
    <div className={styles.vignette} />
    <div className={styles.shell}>
      <div className={styles.breadcrumbs}><Link href="/coop">← Back to coop</Link><span>Fighter archive / {chicken.bloodlineId.slice(0, 8)}</span></div>
      <section className={styles.hero}>
        <div className={styles.stage}>
          <div className={styles.stageGlow} />
          <ChickenViewer chicken={chicken} className={styles.viewer} cameraDistance={3.05} />
          <div className={styles.stagePlaque}><span>Stable fighter</span><strong>{chicken.name}</strong></div>
          <span className={styles.inspectHint}>Drag to inspect · scroll to zoom</span>
        </div>
        <div className={styles.identity}>
          <div className={styles.identityTopline}><span>Fighter dossier</span><StatusPill tone={eligibility.eligible ? "green" : "red"}>{eligibility.eligible ? "Battle ready" : describeMedicalStatus(medicalStatus(chicken))}</StatusPill></div>
          <h1>{chicken.name}</h1>
          <div className={styles.metaLine}><StatusPill>{rarity}</StatusPill><span>Gen {chicken.generation}</span><span>{pretty(chicken.growthStage)}</span><span>Development {development}%</span></div>
          <div className={styles.archetype}><span>Fighter type</span><h2>{archetype.name}</h2><p>{archetype.description}</p><div>{archetype.traits.map((trait) => <b key={trait}>{trait}</b>)}</div></div>
          <div className={styles.quickStats}>{DOSSIER_STATS.map((stat) => <div key={stat} title={`${pretty(stat)} current effective rating: ${Math.round(effectiveStat(chicken, stat))}`}><span>{STAT_MARK[stat]} {pretty(stat)}</span><strong>{Math.round(effectiveStat(chicken, stat))}</strong><i>{Array.from({ length: 5 }, (_, index) => <b key={index} className={index < Math.ceil(pct(effectiveStat(chicken, stat), 110) / 20) ? styles.segmentOn : ""} />)}</i></div>)}</div>
          <div className={styles.heroActions}>
            {canTrain(chicken.growthStage) ? <Link className={styles.primaryButton} href={`/training?chickenId=${chicken.id}`}>Train fighter</Link> : <button className={styles.primaryButton} disabled>Training locked</button>}
            <Link className={styles.secondaryButton} href={eligibility.eligible ? `/battle/${chicken.id}` : "/clinic"}>{eligibility.eligible ? "Prepare" : "Recovery"}</Link>
            <Link className={styles.secondaryButton} href={`/tournament/${chicken.id}`}>Tournament</Link>
            <Link className={styles.secondaryButton} href={`/pedigree/${chicken.id}`}>Pedigree</Link>
            <div className={styles.moreWrap}><button className={styles.moreButton} aria-label="More fighter actions" aria-expanded={moreOpen} onClick={() => setMoreOpen((open) => !open)}>•••</button>{moreOpen && <div className={styles.moreMenu}>{chicken.energy < 100 && <button onClick={handleRest}>Rest and recover</button>}{canRetire(chicken.growthStage) && <button onClick={handleRetire}>Retire fighter</button>}<button className={styles.dangerAction} onClick={handleSell}>Sell fighter</button></div>}</div>
          </div>
        </div>
      </section>
      <nav className={styles.tabs} aria-label="Fighter dossier sections">{TABS.map((item) => <button key={item} className={tab === item ? styles.activeTab : ""} onClick={() => chooseTab(item)}><span>{TAB_MARK[item]}</span>{item}</button>)}</nav>
      <div className={styles.content}>
        {tab === "Overview" && <Overview chicken={chicken} archetype={archetype} behavior={behavior} eligibility={eligibility} development={development} nextStage={nextStage} physicalName={physical.name} maturityRequirements={maturityRequirements} readyToMature={readyToMature} onRest={handleRest} onAgeUp={handleAgeUp} onTab={chooseTab} />}
        {tab === "Development" && <Development chicken={chicken} training={training} recommendation={recommendation} development={development} nextStage={nextStage} totalEv={totalEv} maturityRequirements={maturityRequirements} readyToMature={readyToMature} onAgeUp={handleAgeUp} />}
        {tab === "Combat" && <Combat chicken={chicken} archetype={archetype} behavior={behavior} experience={experience} totalExperience={totalExperience} combatCareer={combatCareer} />}
        {tab === "Genetics" && <Genetics chicken={chicken} physical={physical} region={region} onRegion={setRegion} expressedMutations={expressedMutations} />}
        {tab === "Career" && <Career chicken={chicken} bossVictories={bossVictories} combatCareer={combatCareer} activeInjuries={activeInjuries} />}
      </div>
    </div>
  </main>;
}

function Overview({ chicken, archetype, behavior, eligibility, development, nextStage, physicalName, maturityRequirements, readyToMature, onRest, onAgeUp, onTab }: any) {
  const fatigue = chicken.trainingState?.trainingFatigue ?? 0;
  const stress = chicken.stress ?? DEFAULT_STRESS;
  const morale = chicken.morale ?? DEFAULT_MORALE;
  return <div className={styles.overviewGrid}>
    <GlassCard>
      <div className={styles.cardTitle}><span>Condition monitor</span><StatusPill tone={eligibility.eligible ? "green" : "red"}>{describeMedicalStatus(medicalStatus(chicken))}</StatusPill></div>
      <div className={styles.meters}><Meter label="Health" value={chicken.health ?? 100} /><Meter label="Energy" value={chicken.energy ?? 100} /><Meter label="Morale" value={morale} /><Meter label="Fatigue" value={fatigue} inverse /><Meter label="Stress" value={stress} inverse /><Meter label="Condition" value={chicken.condition ?? 100} /></div>
      {chicken.energy < 100 && <button className={styles.textButton} onClick={onRest}>Rest fighter</button>}
      <div className={`${styles.eligibility} ${eligibility.eligible ? styles.cleared : styles.blocked}`}><strong>{eligibility.eligible ? "Cleared to compete" : "Not cleared to compete"}</strong><p>{eligibility.eligible ? "Condition is within competition requirements." : eligibility.reasons[0]}</p></div>
    </GlassCard>
    <GlassCard>
      <div className={styles.cardTitle}><span>Mental state</span><StatusPill>{valueBand(100 - stress)}</StatusPill></div>
      <dl className={styles.readableList}><div><dt>Confidence</dt><dd>{valueBand(chicken.confidence ?? DEFAULT_CONFIDENCE)}</dd></div><div><dt>Morale</dt><dd>{valueBand(morale)}</dd></div><div><dt>Stress</dt><dd>{valueBand(stress, true)}</dd></div><div><dt>Aggression</dt><dd>{valueBand(behavior.aggression * 100)}</dd></div><div><dt>Patience</dt><dd>{valueBand(behavior.patience * 100)}</dd></div><div><dt>Persistence</dt><dd>{valueBand(behavior.persistence * 100)}</dd></div></dl>
      <p className={styles.flavorCopy}>{temperamentSummary(chicken)}</p>
    </GlassCard>
    <GlassCard className={styles.recordCard}>
      <div className={styles.cardTitle}><span>Official record</span><b>{chicken.record.championships ? "Titled" : "Unranked"}</b></div>
      <div className={styles.record}><strong>{chicken.record.wins}W</strong><i>—</i><strong>{chicken.record.losses}L</strong></div>
      <div className={styles.recordSub}><span>{chicken.record.koTko} KO / TKO</span><span>{chicken.record.championships} championships</span></div>
      {chicken.record.wins + chicken.record.losses === 0 && <p className={styles.quote}>“Every legend starts somewhere.”</p>}
    </GlassCard>
    <GlassCard className={styles.growthCard}>
      <div className={styles.cardTitle}><span>Growth & development</span><StatusPill>{development === 100 ? "Realized" : "Developing"}</StatusPill></div>
      <div className={styles.growthRead}><div><small>Current stage</small><strong>{pretty(chicken.growthStage)}</strong><span>Age {chicken.age}</span></div><div><small>Development</small><strong>{development}%</strong></div></div>
      <div className={styles.progress}><b style={{ width: `${development}%` }} /></div>
      <div className={styles.nextMilestone}><span>{readyToMature ? "Ready to mature" : `${maturityRequirements.filter((item: { met: boolean }) => !item.met).length} requirements remaining`}</span><strong>{nextStage === chicken.growthStage ? "Lifecycle complete" : pretty(nextStage)}</strong>{canAgeUp(chicken.growthStage) && <button onClick={onAgeUp} disabled={!readyToMature}>Age up</button>}</div>
    </GlassCard>
    <GlassCard className={styles.specialtyCard}>
      <div className={styles.cardTitle}><span>Combat specialty</span><button className={styles.textButton} onClick={() => onTab("Combat")}>Full combat read →</button></div>
      <h3>{archetype.role}</h3><p>{archetype.description}</p><div className={styles.tags}>{archetype.traits.map((item: string) => <b key={item}>{item}</b>)}</div>
    </GlassCard>
    <GlassCard className={styles.geneticCard}>
      <div className={styles.cardTitle}><span>Genetic profile</span><button className={styles.textButton} onClick={() => onTab("Genetics")}>Inspect genes →</button></div>
      <h3>{physicalName}</h3><div className={styles.potentialSummary}>{archetype.strengths.map((stat: GeneticStatKey) => <div key={stat}><span>{pretty(stat)} potential</span><strong>{potentialGrade(chicken.iv[stat])}</strong></div>)}</div>
    </GlassCard>
  </div>;
}

function Development({ chicken, training, recommendation, development, nextStage, totalEv, maturityRequirements, readyToMature, onAgeUp }: any) {
  const stageIndex = STAGES.indexOf(chicken.growthStage);
  return <div>
    <SectionHeading eyebrow="Development file" title="Potential becomes craft" copy="Natural gifts, trained growth and the next meaningful milestone." />
    <div className={styles.twoColumn}>
      <GlassCard><div className={styles.cardTitle}><span>Natural potential</span><b>Inherited at birth</b></div><div className={styles.gradeGrid}>{DOSSIER_STATS.map((stat) => <div key={stat} title={`Exact natural potential: ${chicken.iv[stat]}`}><span>{STAT_MARK[stat]}</span><p>{pretty(stat)}<small>{chicken.iv[stat]} potential</small></p><strong>{potentialGrade(chicken.iv[stat])}</strong></div>)}</div></GlassCard>
      <GlassCard><div className={styles.cardTitle}><span>Trained development</span><b>{Math.round(totalEv)} / {MAX_EV * DOSSIER_STATS.length} invested</b></div><div className={styles.allocation}>{DOSSIER_STATS.map((stat) => <div key={stat}><span>{pretty(stat)}</span><i>{Math.round(chicken.ev[stat])}</i></div>)}</div>{canTrain(chicken.growthStage) ? <Link className={styles.primaryButton} href={`/training?chickenId=${chicken.id}`}>Go to training</Link> : <p className={styles.muted}>Training unlocks at Young Adult.</p>}</GlassCard>
      <GlassCard><div className={styles.cardTitle}><span>Training capacity</span><StatusPill tone={training.trainingFatigue >= 70 ? "red" : "green"}>{training.trainingFatigue >= 70 ? "Overtrained" : "Fresh"}</StatusPill></div><div className={styles.bigMetrics}><div><span>Available points</span><strong>{Math.round(training.trainingPoints)}</strong><small>remaining</small></div><div><span>Training load</span><strong>{Math.round(training.trainingFatigue)}</strong><small>of 100</small></div></div><Meter label="Overtraining load" value={training.trainingFatigue} inverse /><p className={styles.flavorCopy}>{training.trainingFatigue < 40 ? "Safe to begin a focused training block." : "Recovery will protect training quality."}</p></GlassCard>
      <GlassCard><div className={styles.cardTitle}><span>Recommended development</span><b>Coach's read</b></div><div className={styles.recommendation}><small>Primary focus</small><h3>{recommendation.primary}</h3><small>Supporting work</small><p>{recommendation.secondary.join(" · ")}</p><blockquote>{recommendation.reason}</blockquote></div></GlassCard>
    </div>
    <GlassCard className={styles.timelineCard}><div className={styles.cardTitle}><span>Life-stage progression</span><b>{development}% developed</b></div><div className={styles.stageTimeline}>{STAGES.map((stage, index) => <div key={stage} className={index <= stageIndex ? styles.stageReached : ""}><i /><span>{pretty(stage)}</span></div>)}</div>{canAgeUp(chicken.growthStage) && <div className={styles.maturityRequirements}><strong>{readyToMature ? "Ready to mature" : `Requirements for ${pretty(nextStage)}`}</strong>{maturityRequirements.map((requirement: { id: string; label: string; met: boolean }) => <span key={requirement.id} className={requirement.met ? styles.requirementMet : ""}>{requirement.met ? "✓" : "○"} {requirement.label}</span>)}</div>}<div className={styles.nextStageBar}><div><small>{canAgeUp(chicken.growthStage) ? "Next stage" : "Current stage"}</small><strong>{canAgeUp(chicken.growthStage) ? pretty(nextStage) : pretty(chicken.growthStage)}</strong></div>{canAgeUp(chicken.growthStage) && <button className={styles.primaryButton} onClick={onAgeUp} disabled={!readyToMature}>Mature fighter</button>}</div></GlassCard>
    <details className={styles.advanced}><summary>Advanced development details</summary><div className={styles.rawGrid}>{DOSSIER_STATS.map((stat) => <p key={stat}><span>{pretty(stat)}</span><b>IV {chicken.iv[stat]}</b><b>EV {chicken.ev[stat].toFixed(1)}</b><b>Effective {effectiveStat(chicken, stat).toFixed(1)}</b></p>)}</div></details>
  </div>;
}

function Combat({ chicken, archetype, behavior, experience, totalExperience, combatCareer }: any) {
  const hardening = chicken.battleHardening ?? 0;
  const maturity = hardening >= 40 ? "Elite" : hardening >= 25 ? "Veteran" : hardening >= 10 ? "Seasoned" : "Rookie";
  return <div>
    <SectionHeading eyebrow="Combat file" title={archetype.name} copy={archetype.description} />
    <div className={styles.twoColumn}>
      <GlassCard className={styles.combatIdentity}><div className={styles.cardTitle}><span>Fighting identity</span><StatusPill>{pretty(chicken.fightingStyle)}</StatusPill></div><h3>{archetype.role}</h3><div className={styles.tags}>{archetype.traits.map((trait: string) => <b key={trait}>{trait}</b>)}</div><div className={styles.strengthRead}><div><span>Natural strengths</span><strong>{archetype.strengths.map(pretty).join(" · ")}</strong></div><div><span>Development risks</span><strong>{archetype.weaknesses.map(pretty).join(" · ")}</strong></div></div></GlassCard>
      <GlassCard><div className={styles.cardTitle}><span>Temperament</span><b>{valueBand(behavior.aggression * 100)} drive</b></div><dl className={styles.readableList}>{Object.entries(behavior).map(([key, value]) => <div key={key}><dt>{pretty(key)}</dt><dd>{valueBand((value as number) * 100)}</dd></div>)}</dl><p className={styles.flavorCopy}>{temperamentSummary(chicken)}</p></GlassCard>
    </div>
    <GlassCard className={styles.masteryCard}><div className={styles.cardTitle}><span>Combat mastery</span><b>{Math.round(totalExperience)} total XP</b></div>{totalExperience === 0 ? <EmptyState title="No established combat instincts" copy={`${chicken.name} will develop a distinct mastery profile through sparring and competition.`} action={<Link className={styles.secondaryButton} href={`/spar/${chicken.id}`}>Begin sparring</Link>} /> : <div className={styles.masteryWheel}><div className={styles.wheelCore}><span>{chicken.name}</span><strong>{maturity}</strong></div>{Object.entries(experience).map(([key, value]) => <div key={key} className={styles.masteryNode}><span>{EXPERIENCE_LABEL[key as CombatExperienceCategory]}</span><strong>{Math.round(value as number)}</strong><small>{potentialGrade(Math.min(100, (value as number) / 5))}</small></div>)}</div>}</GlassCard>
    <div className={styles.twoColumn}>
      <GlassCard><div className={styles.cardTitle}><span>Combat maturity</span><StatusPill>{maturity}</StatusPill></div><div className={styles.maturityTrack}><i style={{ width: `${pct(hardening, 40)}%` }} /><span>Rookie</span><span>Seasoned</span><span>Veteran</span><span>Elite</span></div><p className={styles.flavorCopy}>{hardening} qualifying fights survived. {hardening < 10 ? `${10 - hardening} more to Seasoned.` : "Experience is now part of this fighter's identity."}</p></GlassCard>
      <GlassCard><div className={styles.cardTitle}><span>Matchup read</span><b>Derived tendencies</b></div><div className={styles.matchup}><div><span>Best against</span><strong>{archetype.name.includes("Counter") ? "Committed pressure · predictable entries" : archetype.name.includes("Pressure") ? "Passive guards · slow starters" : archetype.name.includes("Endurance") ? "Front-loaded attacks · impatient fighters" : "Single-plan opponents"}</strong></div><div><span>Needs care against</span><strong>{archetype.weaknesses.map(pretty).join(" · ")} specialists</strong></div></div></GlassCard>
    </div>
    <GlassCard><div className={styles.cardTitle}><span>Earned traits & evolution</span><b>{chicken.traits.length + combatCareer.evolutionTraits.length} recorded</b></div>{chicken.traits.length + combatCareer.evolutionTraits.length === 0 ? <EmptyState title="No learned traits yet" copy="Defining traits emerge from repeated choices, adversity and successful patterns." /> : <div className={styles.traitGrid}>{chicken.traits.map((trait: any) => <article key={trait.id}><StatusPill>{trait.rarity}</StatusPill><h3>{trait.name}</h3><p>{trait.description}</p></article>)}{combatCareer.evolutionTraits.map((trait: any) => <article key={trait.id} className={!trait.active ? styles.inactiveTrait : ""}><StatusPill>{trait.stage}</StatusPill><h3>{trait.name} {"I".repeat(trait.level)}</h3><p>{trait.advantages.join(" · ")}</p><small>{trait.tradeoffs.join(" · ")}</small></article>)}</div>}</GlassCard>
    <details className={styles.advanced}><summary>Advanced behavioral data</summary><div className={styles.rawGrid}>{Object.entries(behavior).map(([key, value]) => <p key={key}><span>{pretty(key)}</span><b>{Math.round((value as number) * 100)}%</b></p>)}</div></details>
  </div>;
}

function Genetics({ chicken, physical, region, onRegion, expressedMutations }: any) {
  const regionKeys = REGION_TRAITS[region as BodyRegion] as readonly (typeof PHYSICAL_TRAIT_KEYS[number])[];
  return <div>
    <SectionHeading eyebrow="Bloodline archive" title="Genetics inspection" copy="Read the fighter's build through form, inheritance and expressed traits." />
    <section className={styles.geneticsStage}>
      <div className={styles.geneticsViewer}><ChickenViewer chicken={chicken} className={styles.viewer} cameraDistance={3.15} /><span>Live physical expression</span></div>
      <div className={styles.regionPanel}><div className={styles.cardTitle}><span>Body-zone inspector</span><b>{region}</b></div><div className={styles.regionTabs}>{(Object.keys(REGION_TRAITS) as BodyRegion[]).map((item) => <button className={region === item ? styles.activeRegion : ""} onClick={() => onRegion(item)} key={item}>{item}</button>)}</div><div className={styles.regionRead}>{regionKeys.map((key) => <div key={key} title={`Exact inherited scalar: ${chicken.physical[key].toFixed(3)}`}><span>{pretty(key)}</span><strong>{physicalBand(chicken.physical[key])}</strong><small>{chicken.physical[key].toFixed(2)}</small></div>)}</div></div>
    </section>
    <div className={styles.twoColumn}>
      <GlassCard><div className={styles.cardTitle}><span>Physical archetype</span><StatusPill>{physical.name}</StatusPill></div><div className={styles.physicalRatings}>{Object.entries(physical.profile).map(([key, value]) => <div key={key}><span>{pretty(key)}</span><i>{Array.from({ length: 5 }, (_, index) => <b key={index} className={index < Math.round(pct(value as number, 1.2) / 20) ? styles.segmentOn : ""} />)}</i><strong>{physicalBand(value as number)}</strong></div>)}</div><p className={styles.flavorCopy}>{chicken.name}'s build is read from real body proportions; mass, reach, mobility and stability all affect how the fighter moves through combat.</p></GlassCard>
      <GlassCard><div className={styles.cardTitle}><span>Bloodline</span><b>Generation {chicken.generation}</b></div><dl className={styles.bloodline}><div><dt>Sire</dt><dd>{chicken.parents.fatherId ? "Recorded in pedigree" : "Foundation record"}</dd></div><div><dt>Dam</dt><dd>{chicken.parents.motherId ? "Recorded in pedigree" : "Foundation record"}</dd></div><div><dt>Bloodline ID</dt><dd>{chicken.bloodlineId.slice(0, 12)}</dd></div></dl><Link className={styles.secondaryButton} href={`/pedigree/${chicken.id}`}>View full bloodline</Link></GlassCard>
    </div>
    <GlassCard><div className={styles.cardTitle}><span>Expressed mutations</span><b>{expressedMutations.length} detected</b></div>{expressedMutations.length === 0 ? <EmptyState title="No expressed mutations" copy="This fighter's visible form follows the recorded physical genome without an active mutation expression." /> : <div className={styles.mutationGrid}>{expressedMutations.map((mutation: any) => <article key={mutation.id}><StatusPill>{mutation.rarity}</StatusPill><h3>{mutation.name}</h3><p>{mutation.description}</p></article>)}</div>}</GlassCard>
    <details className={styles.advanced}><summary>Advanced genetic data</summary><div className={styles.rawGrid}>{PHYSICAL_TRAIT_KEYS.map((key) => <p key={key}><span>{pretty(key)}</span><b>{chicken.physical[key].toFixed(3)}</b><small>{PHYSICAL_TRAIT_RANGE[key].min}–{PHYSICAL_TRAIT_RANGE[key].max}</small></p>)}</div></details>
  </div>;
}

function Career({ chicken, bossVictories, combatCareer, activeInjuries }: any) {
  const hasFightHistory = chicken.record.wins + chicken.record.losses > 0;
  const events = [
    { label: "Entered the stable", date: new Date(chicken.createdAt).toLocaleDateString(), detail: `Generation ${chicken.generation} · ${pretty(chicken.growthStage)}` },
    ...(hasFightHistory ? [{ label: "Official competition record", date: `${chicken.record.wins + chicken.record.losses} bouts`, detail: `${chicken.record.wins} wins · ${chicken.record.losses} losses · ${chicken.record.koTko} KO/TKO` }] : []),
    ...combatCareer.recentDevelopment.map((item: any) => ({ label: item.title, date: pretty(item.kind), detail: item.detail })),
    ...activeInjuries.map((item: any) => ({ label: item.label, date: pretty(item.severity), detail: item.permanent ? "Permanent career mark" : `${item.recoveryRemaining} recovery cycles remaining` })),
  ];
  return <div>
    <SectionHeading eyebrow="Career archive" title={`${chicken.name}'s story`} copy="A persistent record of competition, development, adversity and legacy." />
    <div className={styles.careerHero}><div><span>Official record</span><strong>{chicken.record.wins}—{chicken.record.losses}</strong><small>{chicken.record.koTko} KO/TKO</small></div><div><span>Championships</span><strong>{chicken.record.championships}</strong><small>{chicken.record.championships ? "Titles secured" : "No titles earned yet"}</small></div><div><span>Boss victories</span><strong>{bossVictories.length}</strong><small>{bossVictories.length ? bossVictories.join(" · ") : "No boss clear recorded"}</small></div><div><span>Battle hardening</span><strong>{chicken.battleHardening ?? 0}</strong><small>Qualifying fights</small></div></div>
    <div className={styles.twoColumn}>
      <GlassCard><div className={styles.cardTitle}><span>Career timeline</span><b>{events.length} milestones</b></div><div className={styles.careerTimeline}>{events.map((event, index) => <article key={`${event.label}-${index}`}><i /><span>{event.date}</span><h3>{event.label}</h3><p>{event.detail}</p></article>)}</div></GlassCard>
      <div className={styles.careerSide}>
        <GlassCard><div className={styles.cardTitle}><span>Career story</span><b>Stable record</b></div><p className={styles.story}>{summarizeCareer(chicken)}</p></GlassCard>
        <GlassCard><div className={styles.cardTitle}><span>Rivalries</span><b>{combatCareer.rivalries.length} recorded</b></div>{combatCareer.rivalries.length === 0 ? <EmptyState title="No rival has emerged" copy="Repeated meetings with the same opponent can turn competition into a lasting rivalry." /> : <div className={styles.rivalries}>{combatCareer.rivalries.map((rival: any) => <article key={rival.opponentId}><h3>{rival.opponentName}</h3><p>{rival.fights} meetings · {rival.wins}W—{rival.losses}L</p><span>{Math.round(rival.familiarity)}% familiarity</span></article>)}</div>}</GlassCard>
        <GlassCard><div className={styles.cardTitle}><span>Legacy marks</span><b>{activeInjuries.length} active</b></div>{activeInjuries.length === 0 ? <p className={styles.muted}>No active scars or injuries are shaping this chapter.</p> : activeInjuries.map((injury: any) => <p className={styles.injury} key={injury.id}><strong>{injury.label}</strong><span>{pretty(injury.severity)} · {injury.location ? pretty(injury.location) : "Recorded injury"}</span></p>)}</GlassCard>
      </div>
    </div>
  </div>;
}
