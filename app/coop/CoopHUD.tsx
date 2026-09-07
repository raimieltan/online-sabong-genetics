"use client";

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
    <div className="panel-wood flex flex-wrap items-center justify-between gap-4 rounded-lg p-4">
      <div>
        <h1 className="flex items-center gap-2 font-display text-2xl font-semibold text-(--color-gold-bright)">
          🐔 Coop
        </h1>
        <p className="mt-1 text-sm text-(--color-text-muted)">
          🥚 {eggCount} incubating · 🐔 {chickenCount} chickens
        </p>
      </div>

      <div className="flex items-center gap-3">
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
      </div>
    </div>
  );
}
