import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen w-full items-center justify-center bg-(--color-ink) p-6">
      <div className="panel-wood w-full rounded-2xl p-8 text-center">
        <p className="text-4xl">🐓</p>
        <h1 className="mt-3 font-display text-3xl font-semibold text-(--color-gold-bright)">
          Cockfight Chronicles
        </h1>
        <p className="mt-2 text-sm uppercase tracking-[0.2em] text-(--color-text-muted)">
          Breed. Fight. Rule.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/coop"
            className="rounded-md bg-gradient-to-b from-(--color-gold-bright) to-(--color-gold) px-6 py-3 font-display font-semibold text-(--color-ink) shadow-lg shadow-black/40 transition hover:brightness-110"
          >
            🐔 Enter the Coop
          </Link>
          <Link
            href="/breed"
            className="rounded-md border border-(--color-gold)/30 bg-black/25 px-6 py-3 font-display font-semibold text-(--foreground) transition hover:bg-black/40"
          >
            💞 Go to Breeding
          </Link>
          <Link
            href="/training"
            className="rounded-md border border-(--color-gold)/30 bg-black/25 px-6 py-3 font-display font-semibold text-(--foreground) transition hover:bg-black/40"
          >
            🏋️ Training Gym
          </Link>
          <Link
            href="/pve"
            className="rounded-md border border-(--color-gold)/30 bg-black/25 px-6 py-3 font-display font-semibold text-(--foreground) transition hover:bg-black/40"
          >
            🛡️ PvE Bosses
          </Link>
        </div>
      </div>
    </main>
  );
}
