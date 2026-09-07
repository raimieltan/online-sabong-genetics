"use client";

import type { Chicken } from "@/lib/types";
import { battleEligibility } from "@/lib/medical/eligibility";
import { describeMedicalStatus, medicalStatus, medicalStatusTone } from "@/lib/medical/status";
import { conditionTier } from "@/lib/career/condition";

type Tone = "ok" | "warn" | "bad";

const BAR_TONE: Record<Tone, string> = {
  ok: "from-emerald-500 to-emerald-400",
  warn: "from-amber-500 to-amber-400",
  bad: "from-red-600 to-red-500",
};

const PILL_TONE: Record<Tone, string> = {
  ok: "border-emerald-600 text-emerald-300",
  warn: "border-amber-600 text-amber-300",
  bad: "border-red-500 text-red-300",
};

function Meter({ label, icon, value, tone }: { label: string; icon: string; value: number; tone: Tone }) {
  const pct = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wide text-(--color-text-muted)">
          <span>{icon}</span>
          {label}
        </span>
        <span className="font-display font-semibold text-(--foreground)">{Math.round(value)}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-black/40">
        <div className={`h-full rounded-full bg-gradient-to-r ${BAR_TONE[tone]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function band(value: number, goodAbove: number, warnAbove: number): Tone {
  if (value >= goodAbove) return "ok";
  if (value >= warnAbove) return "warn";
  return "bad";
}

/** Inverse metric (fatigue, stress): low is good. */
function inverseBand(value: number, warnAbove: number, badAbove: number): Tone {
  if (value >= badAbove) return "bad";
  if (value >= warnAbove) return "warn";
  return "ok";
}

/** Spec §88 condition monitor — the at-a-glance readiness panel for one chicken. */
export function ConditionMonitor({ chicken }: { chicken: Chicken }) {
  const health = chicken.health ?? 100;
  const energy = chicken.energy ?? 100;
  const fatigue = chicken.trainingState?.trainingFatigue ?? 0;
  const stress = chicken.stress ?? 0;
  const morale = chicken.morale ?? 75;
  const condition = chicken.condition ?? 100;

  const status = medicalStatus(chicken);
  const eligibility = battleEligibility(chicken);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-display font-semibold">🩺 Condition Monitor</h3>
        <span className={`rounded border px-2 py-0.5 text-[10px] font-bold uppercase ${PILL_TONE[medicalStatusTone(status)]}`}>
          {describeMedicalStatus(status)}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        <Meter label="Health" icon="❤️" value={health} tone={band(health, 70, 40)} />
        <Meter label="Energy" icon="⚡" value={energy} tone={band(energy, 60, 30)} />
        <Meter label="Fatigue" icon="😮‍💨" value={fatigue} tone={inverseBand(fatigue, 40, 70)} />
        <Meter label="Stress" icon="🌡️" value={stress} tone={inverseBand(stress, 40, 70)} />
        <Meter label="Morale" icon="🔥" value={morale} tone={band(morale, 60, 35)} />
        <Meter label="Condition" icon="💪" value={condition} tone={band(condition, 75, 40)} />
      </div>

      <p className="text-xs uppercase tracking-wide text-(--color-text-muted)">
        Conditioning: <span className="text-(--foreground)">{conditionTier(condition)}</span>
      </p>

      {eligibility.eligible ? (
        <p className="rounded bg-emerald-900/20 px-3 py-1.5 text-xs font-semibold text-emerald-300">
          ✅ Cleared to compete
        </p>
      ) : (
        <div className="rounded bg-red-900/20 px-3 py-2 text-xs text-red-200">
          <p className="font-semibold">⛔ Not cleared to compete</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4">
            {eligibility.reasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
