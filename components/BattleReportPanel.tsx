"use client";

import type { BattleReport } from "@/lib/combat/battleReport";
import type { CombatExperienceCategory } from "@/lib/types";

const EXPERIENCE_ICON: Record<CombatExperienceCategory, string> = {
  offensive: "⚔️",
  defensive: "🛡️",
  evasion: "💨",
  counter: "🔁",
  pressure: "🔥",
  recovery: "💤",
  adaptation: "🧠",
};

/** Signed delta as "+8" / "-3" / "±0", colored green/red/neutral. */
function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  const good = invert ? value < 0 : value > 0;
  const bad = invert ? value > 0 : value < 0;
  const sign = value > 0 ? "+" : value < 0 ? "" : "±";
  return (
    <span className={good ? "text-emerald-400" : bad ? "text-red-400" : "text-(--color-text-muted)"}>
      {sign}
      {value}
    </span>
  );
}

/** Structured post-fight summary (spec §70) — renders `buildBattleReport()`'s output for a single chicken's side of a fight. */
export function BattleReportPanel({ report, title = "Battle Report" }: { report: BattleReport; title?: string }) {
  const xpEntries = Object.entries(report.experienceGained) as [CombatExperienceCategory, number][];
  const telemetryEntries = Object.entries(report.telemetryGained ?? {}).filter(([, amount]) => amount > 0).slice(0, 8);

  return (
    <div className="rounded-2xl border border-(--color-gold)/20 bg-black/25 p-4">
      <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-(--color-text-muted)">{title}</p>

      {xpEntries.length > 0 && (
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-semibold text-(--color-text-muted)">
            Combat XP <span className="text-(--color-gold-bright)">+{report.totalExperienceGained}</span>
          </p>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {xpEntries.map(([category, amount]) => (
              <span key={category} className="text-xs text-(--foreground)">
                {EXPERIENCE_ICON[category]} {category} +{amount}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mb-3 grid grid-cols-3 gap-3 border-t border-(--color-gold)/10 pt-3 text-center">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-(--color-text-muted)">Confidence</p>
          <p className="font-display text-sm font-semibold">
            <Delta value={report.confidenceDelta} />
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-(--color-text-muted)">Morale</p>
          <p className="font-display text-sm font-semibold">
            <Delta value={report.moraleDelta} />
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-(--color-text-muted)">Stress</p>
          <p className="font-display text-sm font-semibold">
            <Delta value={report.stressDelta} invert />
          </p>
        </div>
      </div>

      {report.newTraits.length > 0 && (
        <div className="mb-3 border-t border-(--color-gold)/10 pt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-(--color-gold-bright)">🏅 New Trait</p>
          {report.newTraits.map((trait) => (
            <p key={trait.id} className="text-sm text-(--foreground)">
              {trait.name}{" "}
              <span className="text-xs opacity-60">— {trait.description}</span>
            </p>
          ))}
        </div>
      )}

      {Boolean(report.development?.length) && (
        <div className="mb-3 border-t border-(--color-gold)/10 pt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-(--color-gold-bright)">Career Evolution</p>
          {report.development?.map((notice) => <p key={`${notice.kind}-${notice.id}`} className="text-sm text-(--foreground)"><span className="font-display text-[#d7b665]">{notice.title}</span> <span className="text-xs opacity-60">— {notice.detail}</span></p>)}
        </div>
      )}

      {telemetryEntries.length > 0 && (
        <div className="mb-3 border-t border-(--color-gold)/10 pt-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-(--color-text-muted)">What shaped this fighter</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">{telemetryEntries.map(([key, amount]) => <p key={key} className="flex justify-between gap-2 text-[11px] text-(--color-text-muted)"><span>{key.replace(/([A-Z])/g, " $1").toLowerCase()}</span><b className="text-(--foreground)">+{Math.round(amount * 10) / 10}</b></p>)}</div>
        </div>
      )}

      {report.newInjuries.length > 0 && (
        <div className="mb-3 border-t border-(--color-gold)/10 pt-3">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-red-400">🩹 New Injury</p>
          {report.newInjuries.map((injury) => (
            <p key={injury.id} className="text-sm text-(--foreground)">
              {injury.label}{" "}
              <span className="text-xs uppercase opacity-60">· {injury.severity.replace("_", " ")}</span>
            </p>
          ))}
        </div>
      )}

      {report.insight && (
        <div className="border-t border-(--color-gold)/10 pt-3">
          <p className="text-sm text-(--color-gold-bright)">💡 {report.insight}</p>
        </div>
      )}
    </div>
  );
}
