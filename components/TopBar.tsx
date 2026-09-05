import { mockPlayer } from "@/lib/mockPlayer";

function CurrencyPill({ icon, value }: { icon: string; value: number }) {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-(--color-gold)/25 bg-black/30 py-1 pl-2.5 pr-1.5">
      <span className="text-sm leading-none">{icon}</span>
      <span className="font-display text-xs font-semibold text-(--foreground)">
        {value.toLocaleString()}
      </span>
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-(--color-gold)/20 text-[10px] font-bold leading-none text-(--color-gold-bright)">
        +
      </span>
    </div>
  );
}

/**
 * Sticky top bar with player identity/level and currency readouts, matching the
 * Cockfight Chronicles concept art. Player level/energy/currency have no backing
 * system yet, so this reads from `mockPlayer` — see that file's note.
 */
export function TopBar() {
  const xpPct = Math.round((mockPlayer.xp / mockPlayer.xpToNext) * 100);

  return (
    <header className="panel-wood sticky top-0 z-20 flex items-center gap-4 border-b border-(--color-gold)/20 px-4 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-(--color-gold)/40 bg-black/30 text-lg leading-none">
          {mockPlayer.avatar}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-(--foreground)">{mockPlayer.name}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-(--color-gold-bright)">
              Lv. {mockPlayer.level}
            </span>
            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-black/40">
              <div
                className="h-full rounded-full bg-gradient-to-r from-(--color-gold) to-(--color-gold-bright)"
                style={{ width: `${xpPct}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <CurrencyPill icon="⚡" value={mockPlayer.energy} />
        <CurrencyPill icon="🪙" value={mockPlayer.coins} />
        <CurrencyPill icon="💎" value={mockPlayer.gems} />
        <button
          type="button"
          aria-label="Mail"
          className="flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-(--color-gold)/25 bg-black/30 text-sm text-(--color-text-muted)"
        >
          ✉️
        </button>
        <button
          type="button"
          aria-label="Settings"
          className="flex h-8 w-8 shrink-0 cursor-not-allowed items-center justify-center rounded-full border border-(--color-gold)/25 bg-black/30 text-sm text-(--color-text-muted)"
        >
          ⚙️
        </button>
      </div>
    </header>
  );
}
