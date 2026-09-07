"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import type { BossListEntry } from "@/lib/pve/types";

function stars(n: number): string {
  return "★".repeat(n) + "☆".repeat(Math.max(0, 5 - n));
}

export default function PveLadderPage() {
  const [bosses, setBosses] = useState<BossListEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/pve/bosses")
      .then((r) => r.json())
      .then((b) => setBosses(b.bosses ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-(--color-ink) p-6">
      <div className="mx-auto max-w-2xl">
        <div className="panel-wood mb-4 flex items-center justify-between rounded-lg p-4">
          <Link href="/" className="text-sm text-(--color-gold-bright) hover:underline">
            ← Home
          </Link>
          <h1 className="font-display text-xl font-semibold text-(--foreground)">🛡️ PvE — Boss Progression</h1>
          <span className="w-12" />
        </div>

        {loading ? (
          <p className="text-center text-(--color-text-muted)">Loading bosses…</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {bosses.map(({ boss, progress }) => {
              const body = (
                <div
                  className={`panel-wood rounded-lg border-l-4 p-4 transition ${
                    progress.unlocked
                      ? "border-(--color-gold) hover:brightness-110"
                      : "border-black/40 opacity-55"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-lg font-semibold text-(--foreground)">
                        {progress.completed ? "✓ " : progress.unlocked ? "" : "🔒 "}
                        {boss.name}
                      </p>
                      <p className="text-xs uppercase tracking-[0.15em] text-(--color-text-muted)">
                        {boss.styleLabel} · {boss.behaviorLabel}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-(--color-gold-bright)">{stars(boss.difficulty)}</p>
                      {progress.clearCount > 0 && (
                        <p className="text-xs text-(--color-text-muted)">
                          {progress.clearCount} clear{progress.clearCount === 1 ? "" : "s"}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );

              return (
                <li key={boss.id}>
                  {progress.unlocked ? <Link href={`/pve/${boss.id}`}>{body}</Link> : body}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </main>
  );
}
