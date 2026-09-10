import type { ReactNode } from "react";

/**
 * Canonical page-level header used across every screen: a small comic-style
 * eyebrow label, a display title, an optional muted description, and an
 * optional right-side slot for status text or actions. Mirrors the header
 * bar on the Arena Battle HUD so every page reads as the same game.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  right,
}: {
  eyebrow: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <header className="game-header mb-4 flex items-center justify-between gap-4 rounded-xl px-4 py-3 sm:px-5">
      <div className="min-w-0">
        <p className="game-header-eyebrow">{eyebrow}</p>
        <h1 className="mt-0.5 truncate font-display text-xl font-semibold text-(--color-gold-bright) sm:text-2xl">
          {title}
        </h1>
        {description && (
          <p className="mt-0.5 text-sm text-(--color-text-muted)">{description}</p>
        )}
      </div>
      {right && <div className="flex shrink-0 items-center gap-2">{right}</div>}
    </header>
  );
}
