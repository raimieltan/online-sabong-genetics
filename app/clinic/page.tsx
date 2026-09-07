"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { canTreatSeverity } from "@/lib/medical/config";
import { describeMedicalStatus, medicalStatusTone } from "@/lib/medical/status";
import { treatmentPlan } from "@/lib/medical/treatment";
import type { IllnessRecord, InjuryRecord, InjurySeverity, MedicalStatus } from "@/lib/types";

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
  activeTreatment: { id: string; injuryId: string | null; startedAt: string; durationMinutes: number } | null;
};

const PILL_TONE = {
  ok: "border-emerald-600 text-emerald-300",
  warn: "border-amber-600 text-amber-300",
  bad: "border-red-500 text-red-300",
} as const;

function treatmentRemaining(t: { startedAt: string; durationMinutes: number }): number {
  const dueAt = new Date(t.startedAt).getTime() + t.durationMinutes * 60_000;
  return Math.max(0, Math.ceil((dueAt - Date.now()) / 60_000));
}

export default function ClinicPage() {
  const [clinic, setClinic] = useState<ClinicDTO | null>(null);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const res = await fetch("/api/clinic");
    const body = await res.json();
    setClinic(body.clinic);
    setRoster(body.roster);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function treat(chickenId: string, injuryId: string) {
    setError(null);
    setBusy(`${chickenId}:${injuryId}`);
    const res = await fetch(`/api/chickens/${chickenId}/medical`, {
      method: "POST",
      body: JSON.stringify({ action: "treat", injuryId }),
    });
    setBusy(null);
    if (!res.ok) {
      setError((await res.json()).error ?? "Treatment failed");
      return;
    }
    await refresh();
  }

  async function medicalRest(chickenId: string) {
    setError(null);
    setBusy(`${chickenId}:rest`);
    const res = await fetch(`/api/chickens/${chickenId}/medical`, {
      method: "POST",
      body: JSON.stringify({ action: "medical_rest" }),
    });
    setBusy(null);
    if (!res.ok) {
      setError((await res.json()).error ?? "Rest failed");
      return;
    }
    await refresh();
  }

  async function upgrade() {
    setError(null);
    const res = await fetch("/api/clinic/upgrade", { method: "POST" });
    if (!res.ok) {
      setError((await res.json()).error ?? "Upgrade failed");
      return;
    }
    await refresh();
  }

  if (!clinic) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink)">
        <p className="text-(--color-text-muted)">🏥 Loading Rooster Clinic...</p>
      </main>
    );
  }

  const needsCare = roster.filter((r) => r.status !== "healthy" && r.status !== "minor_issue");
  const healthy = roster.filter((r) => r.status === "healthy" || r.status === "minor_issue");

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/coop" className="rounded bg-black/30 px-3 py-1.5 text-sm font-semibold hover:bg-black/50">
          ← Back to Coop
        </Link>
        <span className="signboard px-6 py-2 font-display text-lg font-semibold text-(--color-gold-bright)">
          Rooster Clinic
        </span>
        <span className="w-[92px]" />
      </div>

      {error && <p className="mb-4 rounded bg-red-900/30 px-3 py-2 text-sm text-red-200">{error}</p>}

      <div className="panel-wood mb-6 rounded-lg p-5">
        <h1 className="font-display text-2xl font-semibold text-(--color-gold-bright)">
          {clinic.name} · Level {clinic.level}
        </h1>
        <p className="mt-1 text-sm opacity-80">
          Treatment speed ×{clinic.treatmentSpeed.toFixed(2)} · Can treat up to{" "}
          <span className="font-semibold">{clinic.maxSeverityTreatable.replace("_", "-")}</span> injuries ·{" "}
          {Math.round(clinic.permanentDamageReduction * 100)}% permanent-damage reduction
        </p>
        {clinic.nextUpgradeCost !== undefined ? (
          <button
            onClick={upgrade}
            className="mt-3 rounded bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-4 py-2 text-sm font-semibold text-(--color-ink) hover:brightness-110"
          >
            Upgrade to {clinic.nextLevelName} — {clinic.nextUpgradeCost} credits
          </button>
        ) : (
          <p className="mt-3 text-xs uppercase tracking-wide text-(--color-text-muted)">Max level reached</p>
        )}
      </div>

      {needsCare.length === 0 ? (
        <p className="panel-parchment rounded-lg p-5 text-sm opacity-70">Every rooster is in good health. 🐔</p>
      ) : (
        <div className="space-y-4">
          {needsCare.map((entry) => (
            <div key={entry.id} className="panel-parchment rounded-lg p-5">
              <div className="flex items-center justify-between">
                <Link href={`/chicken/${entry.id}`} className="font-display text-lg font-semibold hover:underline">
                  {entry.name}
                </Link>
                <span
                  className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${
                    PILL_TONE[medicalStatusTone(entry.status)]
                  }`}
                >
                  {describeMedicalStatus(entry.status)}
                </span>
              </div>

              <p className="mt-1 text-xs opacity-70">
                Condition {entry.condition} · Health {entry.health} · Stress {entry.stress} · Morale {entry.morale}
              </p>

              {entry.activeTreatment && (
                <p className="mt-2 rounded bg-sky-900/20 px-3 py-1.5 text-xs text-sky-200">
                  🔧 Under treatment · ~{treatmentRemaining(entry.activeTreatment)}m remaining
                </p>
              )}

              {entry.injuries.length > 0 && (
                <div className="mt-3 space-y-2">
                  {entry.injuries.map((injury) => {
                    const treatable = canTreatSeverity(clinic.level, injury.severity);
                    const plan = treatmentPlan(injury.severity, clinic.level);
                    const key = `${entry.id}:${injury.id}`;
                    return (
                      <div
                        key={injury.id}
                        className="flex items-center justify-between rounded border border-(--color-parchment-dark) px-3 py-2"
                      >
                        <div className="text-sm">
                          <span className="font-semibold">{injury.label}</span>
                          <span className="ml-2 text-xs uppercase opacity-60">
                            {injury.severity.replace("_", "-")}
                            {injury.location ? ` · ${injury.location}` : ""}
                            {injury.permanent ? " · permanent" : ` · ${injury.recoveryRemaining} cycles left`}
                          </span>
                        </div>
                        {injury.inTreatment ? (
                          <span className="text-xs font-semibold text-sky-600">In treatment</span>
                        ) : treatable ? (
                          <button
                            onClick={() => treat(entry.id, injury.id)}
                            disabled={busy === key}
                            className="rounded bg-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-black/20 disabled:opacity-50"
                          >
                            Treat · {plan.cost}c / {plan.durationMinutes}m
                          </button>
                        ) : (
                          <span className="text-xs text-red-700">Needs higher clinic level</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {entry.illnesses.length > 0 && (
                <div className="mt-2 space-y-1">
                  {entry.illnesses.map((illness) => (
                    <p key={illness.id} className="text-sm opacity-80">
                      🤧 {illness.label}{" "}
                      <span className="text-xs uppercase opacity-60">
                        · {illness.severity} · {illness.recoveryRemaining} cycles left
                      </span>
                    </p>
                  ))}
                </div>
              )}

              <button
                onClick={() => medicalRest(entry.id)}
                disabled={busy === `${entry.id}:rest`}
                className="mt-3 rounded bg-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-black/20 disabled:opacity-50"
              >
                🛌 Medical Rest (free)
              </button>
            </div>
          ))}
        </div>
      )}

      {healthy.length > 0 && (
        <div className="panel-parchment mt-6 rounded-lg p-5">
          <h2 className="mb-2 font-display text-lg font-semibold">In good health</h2>
          <div className="flex flex-wrap gap-2">
            {healthy.map((entry) => (
              <Link
                key={entry.id}
                href={`/chicken/${entry.id}`}
                className="rounded bg-black/10 px-3 py-1 text-sm hover:bg-black/20"
              >
                {entry.name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
