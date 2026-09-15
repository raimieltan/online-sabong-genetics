"use client";

import { useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { getPlayerSnapshot, refreshPlayer, signOut, subscribePlayer } from "@/lib/playerStore";

/** Level/XP/energy have no backing system yet — see spec §9.3. */
const PLACEHOLDER_PROGRESSION = {
  avatar: "🐓",
  level: 25,
  xp: 1350,
  xpToNext: 2500,
  energy: 120,
};

const AUTH_ONLY_PATHS = ["/login", "/forgot-password", "/reset-password"];

const NAV_ITEMS = [
  { href: "/", label: "Ranch", icon: "⌂" },
  { href: "/coop", label: "Coop", icon: "♞" },
  { href: "/breed", label: "Breeding", icon: "◒" },
  { href: "/training", label: "Training", icon: "⚔" },
  { href: "/clinic", label: "Clinic", icon: "✚" },
  { href: "/pve", label: "Road to Glory", icon: "𓆩☠︎︎𓆪" },
  { href: "/market", label: "Market", icon: "▣" },
  { href: "/tournament", label: "Tournament", icon: "♛" },
  { href: "/live", label: "Live", icon: "◉" },
] as const;

function CurrencyPill({
  icon,
  value,
  purchasable = true,
}: {
  icon: string;
  value: number;
  /** Tournament Tokens must never be purchasable — see lib/economy.ts. */
  purchasable?: boolean;
}) {
  return (
    <div className="hud-resource-pill flex items-center gap-1.5 rounded-full py-1.5 pl-2.5 pr-1.5">
      <span className="text-sm leading-none">{icon}</span>
      <span className="font-display text-xs font-semibold text-(--foreground)">
        {value.toLocaleString()}
      </span>
      {purchasable && (
        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-(--color-gold)/20 text-[10px] font-bold leading-none text-(--color-gold-bright)">
          +
        </span>
      )}
    </div>
  );
}

/**
 * Sticky top bar with player identity/level and currency readouts, matching the
 * Cockfight Chronicles concept art. Identity/wallet come from the real player
 * record; level/XP/energy have no backing system yet (see PLACEHOLDER_PROGRESSION).
 */
export function TopBar() {
  const pathname = usePathname();
  const { credits, tournamentTokens, displayName } = useSyncExternalStore(
    subscribePlayer,
    getPlayerSnapshot,
    getPlayerSnapshot,
  );
  const xpPct = Math.round((PLACEHOLDER_PROGRESSION.xp / PLACEHOLDER_PROGRESSION.xpToNext) * 100);
  const isAuthOnlyPath = AUTH_ONLY_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (isAuthOnlyPath) return;
    refreshPlayer();
  }, [isAuthOnlyPath]);

  if (isAuthOnlyPath) return null;

  return (
    <header className="smoked-glass-topbar sticky top-0 z-30 flex min-h-[5.5rem] items-center gap-3 px-3 py-2 sm:gap-5 sm:px-5">
      <Link href="/" aria-label="Cockfight Chronicles home" className="hidden shrink-0 items-center gap-2 border-r border-(--color-gold)/20 pr-5 2xl:flex">
        <span className="text-2xl leading-none text-(--color-gold-bright)">🐓</span>
        <span><span className="block font-display text-sm font-bold leading-none tracking-wide text-(--color-gold-bright)">Cockfight Chronicles</span><span className="mt-1 block text-[8px] font-semibold uppercase tracking-[0.25em] text-(--color-text-muted)">Breed. Fight. Rule.</span></span>
      </Link>
      <div className="flex min-w-0 items-center gap-2.5">
        <span className="hud-resource-pill flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-lg leading-none shadow-[0_0_0_3px_rgba(212,162,78,0.08)]">
          {PLACEHOLDER_PROGRESSION.avatar}
        </span>
        <div className="min-w-0">
          <p className="truncate text-xs font-semibold text-(--foreground)">{displayName ?? "Unnamed Breeder"}</p>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-(--color-gold-bright)">
              Lv. {PLACEHOLDER_PROGRESSION.level}
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

      <nav aria-label="Primary navigation" className="hidden min-w-0 flex-1 items-stretch self-stretch lg:flex">
        {NAV_ITEMS.map((item) => {
          const active = item.href === "/" ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group relative flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-1 border-l border-(--color-gold)/15 px-1 text-[9px] font-bold uppercase tracking-wide transition ${active ? "bg-[linear-gradient(180deg,rgba(215,164,65,.16),rgba(215,164,65,.03))] text-(--color-gold-bright) shadow-[inset_0_-2px_0_var(--color-gold-bright)]" : "text-(--color-text-muted) hover:bg-(--color-gold)/8 hover:text-(--color-parchment)"}`}
            >
              <span className="text-xl leading-none text-(--color-gold-bright)">{item.icon}</span>
              <span className="whitespace-nowrap">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        <span className="hidden sm:block"><CurrencyPill icon="⚡" value={PLACEHOLDER_PROGRESSION.energy} /></span>
        <CurrencyPill icon="🪙" value={credits} />
        <span className="hidden md:block"><CurrencyPill icon="🎟️" value={tournamentTokens} purchasable={false} /></span>
        <button
          type="button"
          aria-label="Mail"
          className="hud-icon-button flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-lg text-sm text-(--color-text-muted)"
        >
          ✉️
        </button>
        <button type="button" aria-label="Notifications" className="hud-icon-button relative flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-lg text-sm text-(--color-text-muted)">🔔<span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-red-500" /></button>
        <button
          type="button"
          aria-label="Settings"
          className="hud-icon-button flex h-10 w-10 shrink-0 cursor-not-allowed items-center justify-center rounded-lg text-sm text-(--color-text-muted)"
        >
          ⚙️
        </button>
        <button
          type="button"
          aria-label="Sign out"
          onClick={() => signOut()}
          className="hud-icon-button flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-sm text-(--color-text-muted) hover:text-(--color-gold-bright)"
        >
          ⏻
        </button>
      </div>
    </header>
  );
}
