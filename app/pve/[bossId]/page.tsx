"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Chicken } from "@/lib/types";
import type { BossListEntry } from "@/lib/pve/types";

const BATTLE_STAGES = ["young_adult", "adult", "prime", "senior"];

function isEligible(c: Chicken): boolean {
  return c.sex === "rooster" && !c.injured && BATTLE_STAGES.includes(c.growthStage);
}

function stars(n: number): string {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-24 text-(--color-text-muted)">{label}</span>
      <span className="flex-1 tracking-[0.2em] text-(--color-gold-bright)">
        {"█".repeat(value)}
        <span className="text-black/40">{"░".repeat(Math.max(0, 10 - value))}</span>
      </span>
    </div>
  );
}

export default function BossDetailPage({ params }: { params: Promise<{ bossId: string }> }) {
  const { bossId } = use(params);
  const router = useRouter();

  const [entry, setEntry] = useState<BossListEntry | null>(null);
  const [chickens, setChickens] = useState<Chicken[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/pve/bosses").then((r) => r.json()),
      fetch("/api/chickens").then((r) => r.json()),
    ])
      .then(([b, c]: [{ bosses: BossListEntry[] }, Chicken[]]) => {
        setEntry(b.bosses.find((e) => e.boss.id === bossId) ?? null);
        setChickens(c);
      })
      .finally(() => setLoading(false));
  }, [bossId]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center bg-(--color-ink) text-(--color-text-muted)">Loading…</main>;
  }

  if (!entry) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-(--color-ink) p-6">
        <div className="panel-wood rounded-lg p-6 text-center">
          <p className="text-red-400">Boss not found.</p>
          <Link href="/pve" className="mt-3 inline-block text-(--color-gold-bright) hover:underline">← Back to PvE</Link>
        </div>
      </main>
    );
  }

  const { boss, progress } = entry;
  const eligible = chickens.filter(isEligible);

  return (
    <main className="min-h-screen bg-(--color-ink) p-6">
      <div className="mx-auto max-w-2xl">
        <div className="panel-wood mb-4 flex items-center justify-between rounded-lg p-4">
          <Link href="/pve" className="text-sm text-(--color-gold-bright) hover:underline">← PvE</Link>
          <h1 className="font-display text-xl font-semibold text-(--foreground)">{boss.name}</h1>
          <span className="w-12" />
        </div>

        {!progress.unlocked ? (
          <div className="panel-wood rounded-lg p-6 text-center text-(--color-text-muted)">
            🔒 Defeat the previous boss to unlock {boss.name}.
          </div>
        ) : (
          <>
            <div className="panel-wood rounded-lg p-5">
              <p className="text-(--color-gold-bright)">{stars(boss.difficulty)}</p>
              <p className="mt-1 text-xs uppercase tracking-[0.18em] text-(--color-text-muted)">
                {boss.styleLabel} · Behavior: {boss.behaviorLabel}
              </p>
              <p className="mt-3 text-sm text-(--foreground)">{boss.description}</p>

              <div className="mt-4 flex flex-col gap-1.5">
                <Bar label="Strength" value={boss.preview.strength} />
                <Bar label="Speed" value={boss.preview.speed} />
                <Bar label="Endurance" value={boss.preview.endurance} />
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <dt className="text-(--color-text-muted)">Recommended</dt>
                <dd className="text-(--foreground)">{boss.recommendation}</dd>
                <dt className="text-(--color-text-muted)">Previous victories</dt>
                <dd className="text-(--foreground)">{progress.clearCount}</dd>
                <dt className="text-(--color-text-muted)">Reward</dt>
                <dd className="text-(--foreground)">
                  {progress.completed
                    ? `${boss.rewards.repeatCredits} credits + combat experience`
                    : `${boss.rewards.firstClearCredits} credits (first clear) + combat experience`}
                </dd>
              </dl>
            </div>

            <div className="panel-wood mt-4 rounded-lg p-5">
              <h2 className="font-display text-lg font-semibold text-(--foreground)">Select a rooster</h2>
              {eligible.length === 0 ? (
                <p className="mt-2 text-sm text-(--color-text-muted)">
                  No battle-eligible roosters. Raise one to young-adult stage and keep it healthy.
                </p>
              ) : (
                <ul className="mt-3 flex flex-col gap-2">
                  {eligible.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => router.push(`/pve/${boss.id}/fight/${c.id}`)}
                        className="flex w-full items-center justify-between rounded-md border border-(--color-gold)/25 bg-black/25 px-4 py-3 text-left transition hover:bg-black/40"
                      >
                        <span className="font-display font-semibold text-(--foreground)">{c.name}</span>
                        <span className="text-xs text-(--color-text-muted)">
                          {c.fightingStyle} · {c.record.wins}W–{c.record.losses}L
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </main>
  );
}
