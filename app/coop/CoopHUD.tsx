"use client";

import { PageHeader } from "@/components/PageHeader";

export type CoopMode = "village" | "manage";

/** Top bar: identity, egg/chicken counts, Generate action, and the Village/Manage toggle (spec §19-20). */
export function CoopHUD({
  eggCount,
  chickenCount,
  mode,
  onModeChange,
  onGenerate,
}: {
  eggCount: number;
  chickenCount: number;
  mode: CoopMode;
  onModeChange: (mode: CoopMode) => void;
  onGenerate: () => void;
}) {
  return (
    <PageHeader
      eyebrow="Fighter Stable"
      title="🐔 Coop"
      description={`🥚 ${eggCount} incubating · 🐔 ${chickenCount} chickens`}
      right={<div className="flex items-center gap-3">
        <div className="flex overflow-hidden rounded-md border border-(--color-gold)/30">
          <button
            onClick={() => onModeChange("village")}
            className={`px-3 py-1.5 text-sm font-semibold transition ${
              mode === "village" ? "bg-(--color-gold) text-(--color-ink)" : "text-(--color-text-muted) hover:bg-black/20"
            }`}
          >
            Village
          </button>
          <button
            onClick={() => onModeChange("manage")}
            className={`px-3 py-1.5 text-sm font-semibold transition ${
              mode === "manage" ? "bg-(--color-gold) text-(--color-ink)" : "text-(--color-text-muted) hover:bg-black/20"
            }`}
          >
            Manage
          </button>
        </div>

        <button
          onClick={onGenerate}
          className="rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-4 py-2 font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110"
        >
          + Generate Chicken
        </button>
      </div>}
    />
  );
}
