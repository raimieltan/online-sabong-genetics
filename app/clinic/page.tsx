"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ChickenThumbnail } from "@/components/chicken3d/ChickenThumbnail";
import type { ThumbnailSubject } from "@/components/chicken3d/thumbnailCache";
import { ClinicScene3D, type ClinicScenePatient } from "@/components/clinic/ClinicScene3D";
import {
  CLINIC_LEVELS,
  CLINIC_UPGRADE_COST,
  canTreatIllnessSeverity,
  canTreatSeverity,
} from "@/lib/medical/config";
import { describeMedicalStatus } from "@/lib/medical/status";
import { healthTreatmentPlan, illnessTreatmentPlan, treatmentPlan } from "@/lib/medical/treatment";
import { setPlayerCredits } from "@/lib/playerStore";
import type { IllnessRecord, InjuryRecord, InjurySeverity, MedicalStatus } from "@/lib/types";

import styles from "./clinic.module.css";

type ClinicDTO = {
  id: string;
  level: number;
  name: string;
  treatmentSpeed: number;
  maxSeverityTreatable: InjurySeverity;
  permanentDamageReduction: number;
  maxLevel: number;
  nextUpgradeCost?: number;
  nextLevelName?: string;
};

type TreatmentDTO = {
  id: string;
  targetId: string | null;
  type: "TREAT_INJURY" | "TREAT_ILLNESS" | "TREAT_HEALTH";
  startedAt: string;
  durationMinutes: number;
  cost: number;
};

type RosterEntry = {
  id: string;
  name: string;
  status: MedicalStatus;
  condition: number;
  health: number;
  stress: number;
  morale: number;
  injuries: InjuryRecord[];
  illnesses: IllnessRecord[];
  readiness: { state: "ready" | "restricted" | "unfit"; reasons: string[] };
  activeTreatments: TreatmentDTO[];
  visual: ThumbnailSubject;
};

type ClinicResponse = { clinic: ClinicDTO; roster: RosterEntry[]; credits: number };
type Category = "urgent" | "care" | "recovering" | "healthy";
type PaidCareRequest = {
  entry: RosterEntry;
  action: Record<string, string>;
  key: string;
  title: string;
  target: string;
  cost: number;
  durationMinutes: number;
  baseCost: number;
  baseMinutes: number;
};

const CATEGORY_META: Record<Category, { title: string; caption: string; className: string }> = {
  urgent: { title: "Urgent", caption: "Critical conditions and major trauma", className: styles.categoryUrgent },
  care: { title: "Needs care", caption: "Medical attention recommended", className: styles.categoryCare },
  recovering: { title: "Recovering", caption: "Treatment currently in progress", className: styles.categoryRecovering },
  healthy: { title: "Healthy roster", caption: "No current medical action required", className: styles.categoryHealthy },
};

const ERROR_COPY: Record<string, string> = {
  INSUFFICIENT_CREDITS: "You do not have enough credits for this care plan.",
  SEVERITY_NOT_TREATABLE: "Upgrade the clinic before treating this severity.",
  INJURY_ALREADY_IN_TREATMENT: "This care plan is already active.",
  ILLNESS_ALREADY_IN_TREATMENT: "This illness is already being treated.",
  NOTHING_TO_TREAT: "This rooster is already at full health.",
};

function categoryFor(entry: RosterEntry): Category {
  if (entry.activeTreatments.length > 0 || entry.status === "recovering") return "recovering";
  if (entry.status === "critical" || entry.status === "injured") return "urgent";
  if (entry.status !== "healthy" || entry.health < 100) return "care";
  return "healthy";
}

function issueSummary(entry: RosterEntry): string {
  if (entry.activeTreatments.length) return treatmentLabel(entry.activeTreatments[0], entry);
  if (entry.health < 25) return `Critical wounds · ${entry.health}/100 HP`;
  const injury = entry.injuries[0];
  if (injury) return `${injury.label} · ${injury.severity.replace("_", " ")}`;
  const illness = entry.illnesses[0];
  if (illness) return `${illness.label} · ${illness.severity}`;
  if (entry.health < 100) return `Wounds · ${entry.health}/100 HP`;
  if (entry.condition < 60) return `Low condition · ${entry.condition}/100`;
  return describeMedicalStatus(entry.status);
}

function treatmentLabel(treatment: TreatmentDTO, entry: RosterEntry): string {
  if (treatment.type === "TREAT_HEALTH") return "HP restoration";
  if (treatment.type === "TREAT_ILLNESS") return entry.illnesses.find((item) => item.id === treatment.targetId)?.label ?? "Illness treatment";
  return entry.injuries.find((item) => item.id === treatment.targetId)?.label ?? "Injury treatment";
}

function treatmentTiming(treatment: TreatmentDTO, now: number) {
  const started = new Date(treatment.startedAt).getTime();
  const duration = treatment.durationMinutes * 60_000;
  const remainingMs = Math.max(0, started + duration - now);
  return { remaining: Math.ceil(remainingMs / 1000), progress: Math.max(0, Math.min(100, ((now - started) / duration) * 100)) };
}

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

function ReadinessBadge({ readiness }: { readiness: RosterEntry["readiness"] }) {
  return <span className={`${styles.readiness} ${styles[readiness.state]}`}>{readiness.state}</span>;
}

function PatientCard({ entry, onSelect }: { entry: RosterEntry; onSelect: () => void }) {
  const category = categoryFor(entry);
  return (
    <button type="button" className={styles.patientCard} onClick={onSelect}>
      <ChickenThumbnail chicken={entry.visual} className={styles.patientThumb} />
      <span className={styles.patientSummary}>
        <span className={styles.patientHeading}><span className={styles.patientName}>{entry.name}</span><span className={`${styles.severity} ${styles[`severity_${category}`]}`}>{category === "care" ? "Attention" : category}</span></span>
        <span className={styles.patientIssue}>{issueSummary(entry)}</span>
        <span className={styles.patientVitals}>HP {entry.health} · COND {entry.condition} · STRESS {entry.stress}</span>
        <span className={styles.examineLabel}>Examine patient <span aria-hidden="true">→</span></span>
      </span>
      <ReadinessBadge readiness={entry.readiness} />
    </button>
  );
}

function ActiveCareCard({ entry, treatment, now, onSelect }: { entry: RosterEntry; treatment: TreatmentDTO; now: number; onSelect: () => void }) {
  const timing = treatmentTiming(treatment, now);
  const label = treatmentLabel(treatment, entry);
  return (
    <button type="button" className={`${styles.activeCard} text-left`} onClick={onSelect}>
      <div className={styles.activeTop}><strong>{entry.name}</strong><span>{formatClock(timing.remaining)}</span></div>
      <p>{label} · {timing.remaining > 0 ? "In progress" : "Resolving"}</p>
      <div className={styles.progressTrack} role="progressbar" aria-label={`${entry.name}: ${label}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(timing.progress)} aria-valuetext={`${formatClock(timing.remaining)} remaining`}><div className={styles.progressFill} style={{ width: `${timing.progress}%` }} /></div>
    </button>
  );
}

function CostBreakdown({ baseCost, cost, baseMinutes, durationMinutes, clinic }: { baseCost: number; cost: number; baseMinutes: number; durationMinutes: number; clinic: ClinicDTO }) {
  const savedCredits = Math.max(0, baseCost - cost);
  const savedMinutes = Math.max(0, baseMinutes - durationMinutes);
  return (
    <div className={styles.costLine} title={`Base ${baseCost}c / ${baseMinutes}m · ${Math.round((1 - cost / baseCost) * 100)}% clinic discount · ×${clinic.treatmentSpeed.toFixed(1)} speed`}>
      <strong>{cost.toLocaleString()} credits · {durationMinutes}m</strong>
      <span>Clinic saves {savedCredits.toLocaleString()}c{savedMinutes > 0 ? ` · ${savedMinutes}m faster` : ""}</span>
    </div>
  );
}

function PatientDrawer({ entry, clinic, credits, busy, onClose, onAction, onRequestPaid }: { entry: RosterEntry; clinic: ClinicDTO; credits: number; busy: string | null; onClose: () => void; onAction: (entry: RosterEntry, action: Record<string, string>, key: string) => void; onRequestPaid: (request: PaidCareRequest) => void }) {
  const healthPlan = healthTreatmentPlan(100 - entry.health, clinic.level);
  const healthBase = healthTreatmentPlan(100 - entry.health, 1);
  const targetIsActive = (id: string) => entry.activeTreatments.some((t) => t.targetId === id);
  const healthActive = entry.activeTreatments.some((t) => t.type === "TREAT_HEALTH");

  return (
    <>
      <button className={styles.backdrop} aria-label="Close patient details" onClick={onClose} />
      <aside className={styles.drawer} role="dialog" aria-modal="true" aria-label={`${entry.name} medical record`}>
        <header className={styles.drawerHeader}>
          <div>
            <p className={styles.eyebrow}>Patient record</p>
            <h2>{entry.name}</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className={`${styles.readiness} ${styles[entry.readiness.state]}`}>{entry.readiness.state} for combat</span>
              <span className="text-[10px] uppercase tracking-widest text-[#a99a7a]">{describeMedicalStatus(entry.status)}</span>
            </div>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">×</button>
        </header>

        <div className={styles.drawerBody}>
          <section className={styles.drawerSection}>
            <h3>Medical readiness</h3>
            {entry.readiness.reasons.length ? <ul className="space-y-1 text-xs text-[#c8b997]">{entry.readiness.reasons.map((reason) => <li key={reason}>— {reason}</li>)}</ul> : <p className="text-xs text-[#73d994]">Cleared for combat.</p>}
          </section>

          <section className={styles.drawerSection}>
            <h3>Vitals</h3>
            {([ ["Health", entry.health], ["Condition", entry.condition], ["Morale", entry.morale], ["Stress", entry.stress] ] as const).map(([label, value]) => (
              <div key={label}>
                <div className={styles.vitalRow}><span>{label}</span><strong>{value} / 100</strong></div>
                <div className={styles.bar}><span style={{ width: `${label === "Stress" ? 100 - value : value}%`, background: label === "Stress" ? "linear-gradient(90deg,#dda63f,#55c778)" : undefined }} /></div>
              </div>
            ))}
          </section>

          {entry.injuries.length > 0 && <section className={styles.drawerSection}>
            <h3>Injuries</h3>
            {entry.injuries.map((injury) => {
              const plan = treatmentPlan(injury.severity, clinic.level);
              const base = treatmentPlan(injury.severity, 1);
              const allowed = canTreatSeverity(clinic.level, injury.severity);
              const active = targetIsActive(injury.id) || injury.inTreatment;
              const affordable = credits >= plan.cost;
              const actionBusy = busy === `${entry.id}:injury:${injury.id}`;
              return <div className={styles.careItem} key={injury.id}>
                <div className={styles.careItemTitle}><strong>{injury.label}</strong><span>{injury.severity.replace("_", " ")}</span></div>
                <p>{injury.location ? `${injury.location} trauma · ` : ""}{injury.permanent ? "Permanent damage management" : `${injury.recoveryRemaining} natural recovery cycles remaining`}</p>
                <div className={styles.careActions}>
                  <CostBreakdown baseCost={base.cost} cost={plan.cost} baseMinutes={base.durationMinutes} durationMinutes={plan.durationMinutes} clinic={clinic} />
                  <button className={styles.primaryButton} disabled={!allowed || !affordable || active || busy !== null} onClick={() => onRequestPaid({ entry, action: { action: "treat", injuryId: injury.id }, key: `injury:${injury.id}`, title: "Treat injury?", target: `${injury.label} · ${injury.severity.replace("_", " ")}`, cost: plan.cost, durationMinutes: plan.durationMinutes, baseCost: base.cost, baseMinutes: base.durationMinutes })}>{actionBusy ? "Starting…" : active ? "In treatment" : !allowed ? "Upgrade required" : !affordable ? "Need more credits" : "Review treatment"}</button>
                </div>
              </div>;
            })}
          </section>}

          {entry.health < 100 && <section className={styles.drawerSection}>
            <h3>General health</h3>
            <div className={styles.careItem}>
              <div className={styles.careItemTitle}><strong>Restore HP</strong><span>{100 - entry.health} HP missing</span></div>
              <p>Clinical wound care restores health to 100 when the timer completes. It does not remove injury records.</p>
              <div className={styles.careActions}>
                <CostBreakdown baseCost={healthBase.cost} cost={healthPlan.cost} baseMinutes={healthBase.durationMinutes} durationMinutes={healthPlan.durationMinutes} clinic={clinic} />
                <button className={styles.primaryButton} disabled={credits < healthPlan.cost || healthActive || busy !== null} onClick={() => onRequestPaid({ entry, action: { action: "treat_health" }, key: "health", title: "Restore health?", target: `${100 - entry.health} missing HP`, cost: healthPlan.cost, durationMinutes: healthPlan.durationMinutes, baseCost: healthBase.cost, baseMinutes: healthBase.durationMinutes })}>{healthActive ? "Restoring" : credits < healthPlan.cost ? "Need more credits" : "Review treatment"}</button>
              </div>
            </div>
          </section>}

          {entry.illnesses.length > 0 && <section className={styles.drawerSection}>
            <h3>Illnesses</h3>
            {entry.illnesses.map((illness) => {
              const plan = illnessTreatmentPlan(illness.severity, clinic.level);
              const base = illnessTreatmentPlan(illness.severity, 1);
              const allowed = canTreatIllnessSeverity(clinic.level, illness.severity);
              const active = targetIsActive(illness.id);
              const affordable = credits >= plan.cost;
              return <div className={styles.careItem} key={illness.id}>
                <div className={styles.careItemTitle}><strong>{illness.label}</strong><span>{illness.severity}</span></div>
                <p>{illness.recoveryRemaining} natural recovery cycles remaining. Timed treatment clears this illness when completed.</p>
                <div className={styles.careActions}>
                  <CostBreakdown baseCost={base.cost} cost={plan.cost} baseMinutes={base.durationMinutes} durationMinutes={plan.durationMinutes} clinic={clinic} />
                  <button className={styles.primaryButton} disabled={!allowed || !affordable || active || busy !== null} onClick={() => onRequestPaid({ entry, action: { action: "treat_illness", illnessId: illness.id }, key: `illness:${illness.id}`, title: "Treat illness?", target: `${illness.label} · ${illness.severity}`, cost: plan.cost, durationMinutes: plan.durationMinutes, baseCost: base.cost, baseMinutes: base.durationMinutes })}>{active ? "In treatment" : !allowed ? "Upgrade required" : !affordable ? "Need more credits" : "Review treatment"}</button>
                </div>
              </div>;
            })}
          </section>}

          <section className={styles.drawerSection}>
            <h3>Recovery</h3>
            <div className={styles.careItem}>
              <div className={styles.careItemTitle}><strong>Medical Rest</strong><span>Free · Immediate cycle</span></div>
              <p>Restores energy and improves condition, fatigue, stress, morale, and natural illness recovery. It does not directly restore HP or remove permanent damage.</p>
              <div className="mt-3 flex justify-end"><button className={styles.secondaryButton} disabled={busy !== null} onClick={() => onAction(entry, { action: "medical_rest" }, "rest")}>Begin medical rest</button></div>
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}

function UpgradeModal({ clinic, credits, busy, onClose, onUpgrade }: { clinic: ClinicDTO; credits: number; busy: boolean; onClose: () => void; onUpgrade: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const nextLevel = clinic.level < clinic.maxLevel ? CLINIC_LEVELS[clinic.level + 1] : null;
  return <>
    <button className={`${styles.backdrop} ${styles.modalBackdrop}`} aria-label="Close clinic development" onClick={onClose} />
    <section className={styles.modal} role="dialog" aria-modal="true" aria-label="Clinic development">
      <header className={styles.modalHeader}><div><p className={styles.eyebrow}>Facility progression</p><h2>Clinic Development</h2></div><button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">×</button></header>
      <div className={styles.levelTrack}>
        {Object.values(CLINIC_LEVELS).map((level) => {
          const state = level.level < clinic.level ? "Built" : level.level === clinic.level ? "Current" : "Locked";
          const cost = CLINIC_UPGRADE_COST[level.level];
          return <article key={level.level} className={`${styles.levelCard} ${level.level === clinic.level ? styles.levelCardCurrent : ""}`}>
            <div className={styles.levelNumber}>{level.level}</div>
            <div><h3>{level.name}</h3><p>Up to {level.maxSeverityTreatable.replace("_", " ")} trauma · ×{level.treatmentSpeed.toFixed(1)} speed · {Math.round(level.costDiscount * 100)}% discount · {Math.round(level.permanentDamageReduction * 100)}% permanent-damage reduction{cost ? ` · ${cost.toLocaleString()}c` : ""}</p></div>
            <span className={styles.levelState}>{state}</span>
          </article>;
        })}
      </div>
      <footer className={styles.modalFooter}>
        {confirming && nextLevel && clinic.nextUpgradeCost !== undefined ? <div className={styles.upgradeConfirm}><div><strong>Upgrade to {nextLevel.name}?</strong><p>Unlocks {nextLevel.maxSeverityTreatable.replace("_", " ")} trauma care, ×{nextLevel.treatmentSpeed.toFixed(1)} speed, {Math.round(nextLevel.costDiscount * 100)}% treatment discount, and {Math.round(nextLevel.permanentDamageReduction * 100)}% permanent-damage reduction.</p></div><div className={styles.confirmActions}><button className={styles.secondaryButton} type="button" onClick={() => setConfirming(false)}>Cancel</button><button className={styles.primaryButton} disabled={busy} onClick={() => { setConfirming(false); onUpgrade(); }}>{busy ? "Building…" : `Confirm · ${clinic.nextUpgradeCost.toLocaleString()}c`}</button></div></div> : <><p>{clinic.nextLevelName ? `Next: ${clinic.nextLevelName}. The clinic environment and care capabilities improve immediately.` : "The clinic has reached its final development tier."}</p>{clinic.nextUpgradeCost !== undefined && <button className={styles.primaryButton} disabled={busy || credits < clinic.nextUpgradeCost} onClick={() => setConfirming(true)}>{credits < clinic.nextUpgradeCost ? "Insufficient credits" : `Review upgrade · ${clinic.nextUpgradeCost.toLocaleString()}c`}</button>}</>}
      </footer>
    </section>
  </>;
}

function CareConfirmation({ request, clinic, onClose, onConfirm }: { request: PaidCareRequest; clinic: ClinicDTO; onClose: () => void; onConfirm: () => void }) {
  const savedCredits = request.baseCost - request.cost;
  const savedMinutes = request.baseMinutes - request.durationMinutes;
  return <>
    <button className={`${styles.backdrop} ${styles.modalBackdrop}`} aria-label="Cancel treatment" onClick={onClose} />
    <section className={`${styles.modal} ${styles.confirmModal}`} role="alertdialog" aria-modal="true" aria-label={request.title}>
      <header className={styles.modalHeader}><div><p className={styles.eyebrow}>Care authorization</p><h2>{request.title}</h2></div><button type="button" className={styles.closeButton} onClick={onClose} aria-label="Close">×</button></header>
      <div className={styles.confirmBody}>
        <div><span>Patient</span><strong>{request.entry.name}</strong></div><div><span>Treatment</span><strong>{request.target}</strong></div><div><span>Final cost</span><strong>{request.cost.toLocaleString()} credits</strong></div><div><span>Estimated time</span><strong>{request.durationMinutes} minutes</strong></div>
        <p>Level {clinic.level} clinic benefit: save {savedCredits.toLocaleString()} credits{savedMinutes > 0 ? ` and ${savedMinutes} minutes` : ""} from base care.</p>
      </div>
      <footer className={styles.confirmFooter}><button type="button" className={styles.secondaryButton} onClick={onClose}>Cancel</button><button type="button" className={styles.primaryButton} onClick={onConfirm}>Confirm treatment</button></footer>
    </section>
  </>;
}

export default function ClinicPage() {
  const [data, setData] = useState<ClinicResponse | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [completion, setCompletion] = useState<string | null>(null);
  const [pendingCare, setPendingCare] = useState<PaidCareRequest | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const activeRef = useRef<Map<string, string> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/clinic", { cache: "no-store" });
      if (!response.ok) throw new Error("Clinic records are temporarily unavailable.");
      const next = (await response.json()) as ClinicResponse;
      setData(next);
      setPlayerCredits(next.credits);
      const active = new Map<string, string>();
      next.roster.forEach((entry) => entry.activeTreatments.forEach((treatment) => active.set(treatment.id, `${entry.name} · ${treatmentLabel(treatment, entry)}`)));
      if (activeRef.current) {
        const completed = [...activeRef.current].find(([id]) => !active.has(id));
        if (completed) setCompletion(`${completed[1]} completed. Medical readiness has been recalculated.`);
      }
      activeRef.current = active;
      setError(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Clinic records are temporarily unavailable.");
    }
  }, []);

  useEffect(() => {
    const initial = window.setTimeout(() => void refresh(), 0);
    const poll = window.setInterval(() => void refresh(), 15_000);
    const clock = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => { window.clearTimeout(initial); window.clearInterval(poll); window.clearInterval(clock); };
  }, [refresh]);

  useEffect(() => {
    if (!completion) return;
    const timeout = window.setTimeout(() => setCompletion(null), 6_000);
    return () => window.clearTimeout(timeout);
  }, [completion]);

  const grouped = useMemo(() => {
    const result: Record<Category, RosterEntry[]> = { urgent: [], care: [], recovering: [], healthy: [] };
    data?.roster.forEach((entry) => result[categoryFor(entry)].push(entry));
    return result;
  }, [data]);
  const activeCare = useMemo(() => data?.roster.flatMap((entry) => entry.activeTreatments.map((treatment) => ({ entry, treatment }))) ?? [], [data]);
  const selected = data?.roster.find((entry) => entry.id === selectedId) ?? null;
  const needsCareCount = (data?.roster ?? []).filter((entry) => categoryFor(entry) !== "healthy").length;
  const criticalCount = (data?.roster ?? []).filter((entry) => entry.status === "critical").length;
  const illCount = (data?.roster ?? []).filter((entry) => entry.illnesses.length > 0).length;

  const scenePatients = useMemo<ClinicScenePatient[]>(() => {
    if (!data) return [];
    const candidates = activeCare.length ? activeCare.map(({ entry }) => entry) : [...grouped.urgent, ...grouped.care];
    return [...new Map(candidates.map((entry) => [entry.id, entry])).values()].slice(0, 3).map((entry) => ({
      id: entry.id,
      name: entry.name,
      careLabel: entry.activeTreatments.length ? treatmentLabel(entry.activeTreatments[0], entry) : issueSummary(entry),
      careKind: entry.activeTreatments.length ? "treatment" as const : entry.status === "recovering" ? "recovery" as const : "assessment" as const,
      visual: entry.visual,
    }));
  }, [activeCare, data, grouped]);

  async function medicalAction(entry: RosterEntry, action: Record<string, string>, key: string) {
    setBusy(`${entry.id}:${key}`);
    setError(null);
    try {
      const response = await fetch(`/api/chickens/${entry.id}/medical`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(action) });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(ERROR_COPY[body.error ?? ""] ?? body.error ?? "Medical action failed.");
        return;
      }
      await refresh();
    } catch {
      setError("The clinic could not reach the medical service. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function upgrade() {
    setBusy("upgrade");
    setError(null);
    try {
      const response = await fetch("/api/clinic/upgrade", { method: "POST" });
      if (!response.ok) {
        const body = (await response.json()) as { error?: string };
        setError(ERROR_COPY[body.error ?? ""] ?? body.error ?? "Clinic upgrade failed.");
        return;
      }
      await refresh();
    } catch {
      setError("The clinic upgrade service is unavailable. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  if (!data) return <main className={styles.page}><div className={`${styles.glassHeavy} mx-auto mt-[18vh] max-w-md p-8 text-center`}><p className={styles.eyebrow}>Medical ward</p><h1 className="mt-2 font-display text-2xl text-[#f1e4c2]">Preparing clinic records</h1><p className="mt-3 text-sm text-[#a99a7a]">Assessing roster condition and active care...</p>{error && <p className={styles.error}>{error}</p>}</div></main>;

  return <main className={styles.page}>
    <div className={styles.shell}>
      <section className={`${styles.glass} ${styles.cornered}`}>
        <header className={styles.commandHeader}>
          <div><p className={styles.eyebrow}>Medical ward · <Link href="/coop" className="hover:text-[#e1b65c]">Return to coop</Link></p><h1 className={styles.title}>{data.clinic.name} · Level {data.clinic.level}</h1><p className={styles.subline}>Roster medical command · facility care · combat readiness</p></div>
          <div className={styles.credits}><span>Credits</span><strong>{data.credits.toLocaleString()}</strong></div>
        </header>
        <div className={styles.metrics}>
          <div className={`${styles.metric} ${styles.metricWarn}`}><strong>{needsCareCount}</strong><span>Need care</span></div>
          <div className={`${styles.metric} ${styles.metricUrgent}`}><strong>{criticalCount}</strong><span>Critical</span></div>
          <div className={`${styles.metric} ${styles.metricWarn}`}><strong>{illCount}</strong><span>Ill</span></div>
          <div className={styles.metric}><strong>{activeCare.length}</strong><span>Active care</span></div>
          <div className={`${styles.metric} ${styles.metricGood}`}><strong>{grouped.healthy.length}</strong><span>Healthy</span></div>
        </div>
      </section>
      {error && <p className={styles.error}>{error}</p>}

      <section className={`${styles.sceneFrame} ${styles.cornered}`}>
        <ClinicScene3D level={data.clinic.level} patients={scenePatients} selectedPatientId={selectedId} onPatientSelect={setSelectedId} />
        <div className={styles.sceneVignette} />
        <div className={styles.sceneHud}><p className={styles.sceneCaption}>Level {data.clinic.level} · ×{data.clinic.treatmentSpeed.toFixed(1)} treatment speed · up to {data.clinic.maxSeverityTreatable.replace("_", " ")} trauma</p><button type="button" className={styles.primaryButton} onClick={() => setShowUpgrade(true)}>Clinic development</button></div>
      </section>

      <div className={styles.content}>
        <section className={`${styles.section} ${styles.glass}`}>
          <div className={styles.sectionHeading}><div><p className={styles.sectionEyebrow}>Treatment queue</p><h2>Active Care</h2></div><p>Persistent treatments · updates every 15 seconds</p></div>
          {activeCare.length ? <div className={styles.activeGrid}>{activeCare.map(({ entry, treatment }) => <ActiveCareCard key={treatment.id} entry={entry} treatment={treatment} now={now} onSelect={() => setSelectedId(entry.id)} />)}</div> : <div className={styles.empty}>No timed treatments are active. Select a patient below to begin care.</div>}
        </section>

        <section className={`${styles.section} ${styles.glass}`}>
          <div className={styles.sectionHeading}><div><p className={styles.sectionEyebrow}>Roster triage</p><h2>Medical Overview</h2></div><p>Select a patient to examine and prescribe care</p></div>
          {(["urgent", "care", "recovering"] as Category[]).map((category) => {
            const entries = grouped[category];
            if (!entries.length) return null;
            const meta = CATEGORY_META[category];
            return <div className={styles.categoryBlock} key={category}><div className={`${styles.categoryTitle} ${meta.className}`}><span>{entries.length}</span><div>{meta.title}<small className="ml-2 hidden font-normal normal-case tracking-normal text-[#a99a7a] sm:inline">{meta.caption}</small></div></div><div className={styles.patientGrid}>{entries.map((entry) => <PatientCard key={entry.id} entry={entry} onSelect={() => setSelectedId(entry.id)} />)}</div></div>;
          })}
          {!grouped.urgent.length && !grouped.care.length && !grouped.recovering.length && <div className={styles.empty}>Every bird in the roster is medically stable.</div>}
        </section>

        {grouped.healthy.length > 0 && <section className={`${styles.section} ${styles.glassLight}`}><div className={styles.sectionHeading}><div><p className={styles.sectionEyebrow}>Cleared roster</p><h2>In Good Health</h2></div><p>{grouped.healthy.length} stable</p></div><div className={styles.healthyStrip}>{grouped.healthy.map((entry) => <button type="button" className={styles.healthyChip} key={entry.id} onClick={() => setSelectedId(entry.id)}>{entry.name}</button>)}</div></section>}
      </div>
    </div>

    {selected && <PatientDrawer entry={selected} clinic={data.clinic} credits={data.credits} busy={busy} onClose={() => setSelectedId(null)} onAction={(entry, action, key) => void medicalAction(entry, action, key)} onRequestPaid={setPendingCare} />}
    {showUpgrade && <UpgradeModal clinic={data.clinic} credits={data.credits} busy={busy === "upgrade"} onClose={() => setShowUpgrade(false)} onUpgrade={() => void upgrade()} />}
    {pendingCare && <CareConfirmation request={pendingCare} clinic={data.clinic} onClose={() => setPendingCare(null)} onConfirm={() => { const request = pendingCare; setPendingCare(null); void medicalAction(request.entry, request.action, request.key); }} />}
    {completion && <div className={styles.toast} role="status" aria-live="polite"><strong>Treatment complete</strong><p>{completion}</p></div>}
  </main>;
}
