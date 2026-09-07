"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Home", icon: "🏠" },
  { href: "/coop", label: "Coop", icon: "🐔" },
  { href: "/breed", label: "Breeding", icon: "🥚" },
  { href: "/training", label: "Training", icon: "🏋️" },
  { href: "/clinic", label: "Clinic", icon: "🏥" },
  { href: "/market", label: "Market", icon: "🛒" },
  { href: "/live", label: "Live", icon: "🔴" },
] as const;

const SOON_LINKS = [
  { label: "Ranch", icon: "🏚️" },
  { label: "Quests", icon: "📜" },
  { label: "Leaderboard", icon: "🏆" },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <nav className="panel-wood flex shrink-0 flex-row items-center gap-4 overflow-x-auto border-b border-r-0 border-(--color-gold)/20 px-4 py-3 md:sticky md:top-0 md:h-screen md:w-56 md:flex-col md:items-stretch md:gap-1 md:overflow-visible md:border-b-0 md:border-r md:px-3 md:py-5">
      <Link
        href="/"
        className="mb-0 flex shrink-0 items-center gap-2 md:mb-6 md:flex-col md:items-start md:gap-0.5 md:px-2"
      >
        <span className="text-2xl leading-none">🐓</span>
        <span className="font-display text-sm font-semibold tracking-wide text-(--color-gold-bright) md:text-lg">
          Cockfight Chronicles
        </span>
        <span className="hidden text-[11px] uppercase tracking-[0.2em] text-(--color-text-muted) md:block">
          Breed. Fight. Rule.
        </span>
      </Link>

      <div className="flex flex-row gap-1 md:flex-col">
        {LINKS.map((link) => {
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition ${
                active
                  ? "bg-(--color-gold)/15 text-(--color-gold-bright) shadow-[inset_0_0_0_1px_rgba(212,162,78,0.35)]"
                  : "text-(--color-text-muted) hover:bg-white/5 hover:text-(--foreground)"
              }`}
            >
              <span className="text-base leading-none">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="hidden h-px bg-(--color-gold)/15 md:my-3 md:block" />

      <div className="flex flex-row gap-1 md:flex-col">
        {SOON_LINKS.map((link) => (
          <span
            key={link.label}
            className="flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm text-(--color-text-muted)/50"
          >
            <span className="text-base leading-none opacity-60">{link.icon}</span>
            <span className="hidden md:inline">{link.label}</span>
            <span className="ml-auto hidden rounded-full border border-(--color-text-muted)/25 px-1.5 py-0.5 text-[9px] uppercase tracking-wide md:inline">
              Soon
            </span>
          </span>
        ))}
      </div>
    </nav>
  );
}
