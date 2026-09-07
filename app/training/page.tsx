"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

import { TRAINING_GYM_UPGRADES, TRAINING_PROGRAMS } from "@/lib/facilities/config";
import type { ProgramId } from "@/lib/facilities/types";
import { TRAINING_CATEGORIES, type Chicken, type InjuryRecord, type TrainingCategory } from "@/lib/types";
import { trainingLocks } from "@/lib/medical/rehab";
import { battleEligibility } from "@/lib/medical/eligibility";
import { describeMedicalStatus, medicalStatus } from "@/lib/medical/status";

type FacilityViewDTO = { id: string; level: number; capacity: number; efficiency: number; unlockedPrograms: ProgramId[] };
type SessionDTO = {
  id: string;
  chickenId: string;
  programId: ProgramId;
  startedAt: string;
  durationMinutes: number;
};

function remainingMinutes(session: SessionDTO): number {
  const dueAt = new Date(session.startedAt).getTime() + session.durationMinutes * 60_000;
  return Math.max(0, Math.ceil((dueAt - Date.now()) / 60_000));
}

export default function TrainingPage() {
  return (
    <Suspense fallback={null}>
      <TrainingPageContent />
    </Suspense>
  );
}

function TrainingPageContent() {
  const searchParams = useSearchParams();
  const preselectedChickenId = searchParams.get("chickenId") ?? "";

  const [facility, setFacility] = useState<FacilityViewDTO | null>(null);
  const [sessions, setSessions] = useState<SessionDTO[]>([]);
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [selectedChicken, setSelectedChicken] = useState(preselectedChickenId);
  const [selectedCategory, setSelectedCategory] = useState<TrainingCategory>("strength");
  const [error, setError] = useState<string | null>(null);

  async function refresh() {
    const [facilityRes, chickensRes] = await Promise.all([fetch("/api/facilities"), fetch("/api/chickens")]);
    const facilityBody = await facilityRes.json();
    setFacility(facilityBody.facility);
    setSessions(facilityBody.activeSessions);
    setChickens(await chickensRes.json());
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000); // offline-friendly: server is authoritative, this just refreshes the view
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function startTraining(programId: ProgramId) {
    setError(null);
    if (!selectedChicken) {
      setError("Select a chicken first.");
      return;
    }
    const program = TRAINING_PROGRAMS[programId];
    const body: Record<string, unknown> = { chickenId: selectedChicken, programId };
    if (program.category === "custom") body.category = selectedCategory;

    const res = await fetch("/api/training-sessions", { method: "POST", body: JSON.stringify(body) });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error);
      return;
    }
    await refresh();
  }

  async function cancel(sessionId: string) {
    await fetch(`/api/training-sessions/${sessionId}/cancel`, { method: "POST" });
    await refresh();
  }

  async function upgrade() {
    if (!facility) return;
    setError(null);
    const res = await fetch(`/api/facilities/${facility.id}/upgrade`, { method: "POST" });
    if (!res.ok) {
      const json = await res.json();
      setError(json.error);
      return;
    }
    await refresh();
  }

  if (!facility) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink)">
        <p className="text-(--color-text-muted)">🏋️ Loading Training Gym...</p>
      </main>
    );
  }

  const nextUpgradeCost = TRAINING_GYM_UPGRADES[facility.level + 1]?.cost;

  const selected = chickens.find((c) => c.id === selectedChicken) ?? null;
  const selectedActiveInjuries: InjuryRecord[] = (selected?.injuries ?? []).filter(
    (i) => i.permanent || i.recoveryRemaining > 0,
  );
  const locks = trainingLocks(selectedActiveInjuries);
  const selectedEligibility = selected ? battleEligibility(selected) : null;

  return (
    <main className="mx-auto min-h-screen max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <Link href="/coop" className="rounded bg-black/30 px-3 py-1.5 text-sm font-semibold hover:bg-black/50">
          ← Back to Coop
        </Link>
        <span className="signboard px-6 py-2 font-display text-lg font-semibold text-(--color-gold-bright)">
          Training Gym
        </span>
        <span className="w-[92px]" />
      </div>

      {error && <p className="mb-4 rounded bg-red-900/30 px-3 py-2 text-sm text-red-200">{error}</p>}

      <div className="panel-wood mb-6 rounded-lg p-5">
        <h1 className="font-display text-2xl font-semibold text-(--color-gold-bright)">Level {facility.level}</h1>
        <p className="mt-1 text-sm opacity-80">
          Capacity: {sessions.length} / {facility.capacity} · Efficiency: {Math.round(facility.efficiency * 100)}%
        </p>
        {nextUpgradeCost !== undefined && (
          <button
            onClick={upgrade}
            className="mt-3 rounded bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-4 py-2 text-sm font-semibold text-(--color-ink) hover:brightness-110"
          >
            Upgrade to Level {facility.level + 1} — {nextUpgradeCost} credits
          </button>
        )}
      </div>

      <div className="panel-parchment mb-6 rounded-lg p-5">
        <h2 className="mb-2 font-display text-lg font-semibold">Active Training</h2>
        {sessions.length === 0 ? (
          <p className="text-sm opacity-70">No active sessions.</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between rounded bg-black/10 px-3 py-2">
                <span className="text-sm">
                  {chickens.find((c) => c.id === session.chickenId)?.name ?? session.chickenId} ·{" "}
                  {TRAINING_PROGRAMS[session.programId].name} · {remainingMinutes(session)}m remaining
                </span>
                <button onClick={() => cancel(session.id)} className="text-xs font-semibold text-red-700 hover:underline">
                  Cancel
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel-parchment rounded-lg p-5">
        <h2 className="mb-3 font-display text-lg font-semibold">Start Training</h2>

        <div className="mb-4 flex flex-col gap-2 sm:flex-row">
          <select
            value={selectedChicken}
            onChange={(e) => setSelectedChicken(e.target.value)}
            className="flex-1 rounded border border-(--color-parchment-dark) bg-white/60 px-3 py-2 text-sm"
          >
            <option value="">Select a chicken...</option>
            {chickens.map((chicken) => (
              <option key={chicken.id} value={chicken.id}>
                {chicken.name}
              </option>
            ))}
          </select>
        </div>

        {selected && (
          <div className="mb-4 rounded-md border border-(--color-parchment-dark) bg-black/5 p-3 text-xs">
            <p>
              <span className="font-semibold">{selected.name}</span> · medical status:{" "}
              <span className="uppercase">{describeMedicalStatus(medicalStatus(selected))}</span> · fatigue{" "}
              {selected.trainingState?.trainingFatigue ?? 0}/100
            </p>
            {locks.size > 0 && (
              <p className="mt-1 text-red-700">
                🔒 Injury locks: {[...locks].join(", ")} training unavailable until healed.
              </p>
            )}
            {selectedEligibility && !selectedEligibility.eligible && (
              <p className="mt-1 text-amber-700">⚠ {selectedEligibility.reasons.join(" · ")}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {facility.unlockedPrograms.map((programId) => {
            const program = TRAINING_PROGRAMS[programId];
            const lockedCategory =
              program.category !== "custom" && locks.has(program.category as TrainingCategory);
            const customLocked = program.category === "custom" && locks.has(selectedCategory);
            const disabled = Boolean(lockedCategory || customLocked);
            return (
              <div
                key={programId}
                className={`rounded-md border border-(--color-parchment-dark) p-3 ${disabled ? "opacity-50" : ""}`}
              >
                <p className="font-display font-semibold">{program.name}</p>
                <p className="text-xs opacity-70">{program.description}</p>
                <p className="mt-1 text-xs opacity-80">
                  Duration: {program.durationMinutes}m · Energy: {program.energyCost} · Fatigue: {program.fatigueCost}
                </p>
                {program.category === "custom" && (
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value as TrainingCategory)}
                    className="mt-2 w-full rounded border border-(--color-parchment-dark) bg-white/60 px-2 py-1 text-xs"
                  >
                    {TRAINING_CATEGORIES.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => startTraining(programId)}
                  disabled={disabled}
                  className="mt-2 w-full rounded bg-black/10 px-3 py-1.5 text-xs font-semibold hover:bg-black/20 disabled:cursor-not-allowed disabled:hover:bg-black/10"
                >
                  {disabled ? "Locked by injury" : "Train"}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
