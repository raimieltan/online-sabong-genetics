import type { ReactNode } from "react";
import Link from "next/link";

export function TournamentShell({
  children,
  context,
  footer,
}: {
  children: ReactNode;
  context?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="tournament-shell">
      <div className="tournament-vignette" />
      <div className="tournament-frame">
        <header className="tournament-topline">
          <Link href="/tournament" className="tournament-wordmark">Championship Circuit</Link>
          <div className="tournament-context">{context}</div>
        </header>
        {children}
        {footer && <footer className="tournament-footer">{footer}</footer>}
      </div>
    </main>
  );
}

export function TournamentAction({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`tournament-action ${className}`}>{children}</button>;
}
