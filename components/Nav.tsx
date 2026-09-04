"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Battle" },
  { href: "/coop", label: "Coop" },
  { href: "/breed", label: "Breed" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-4 border-b border-neutral-800 px-4 py-3">
      {LINKS.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={
            pathname === link.href
              ? "font-semibold text-amber-400"
              : "text-neutral-400 hover:text-neutral-200"
          }
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
