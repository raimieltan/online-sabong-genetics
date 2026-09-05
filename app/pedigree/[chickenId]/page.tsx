"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";

import type { DescendantStats, PedigreeNode } from "@/lib/pedigree";

import { PedigreeTreeNode } from "./PedigreeTreeNode";

type PedigreeResponse = {
  ancestry: PedigreeNode;
  descendants: DescendantStats;
};

export default function PedigreePage({ params }: { params: Promise<{ chickenId: string }> }) {
  const { chickenId } = use(params);
  const [data, setData] = useState<PedigreeResponse | null | "not-found">(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/chickens/${chickenId}/pedigree`)
      .then((res) => (res.ok ? res.json() : Promise.resolve("not-found" as const)))
      .then((result) => {
        if (!cancelled) setData(result);
      });
    return () => {
      cancelled = true;
    };
  }, [chickenId]);

  if (data === null) {
    return <main className="p-6 text-sm opacity-70">Loading pedigree...</main>;
  }

  if (data === "not-found") {
    return (
      <main className="p-6">
        <p className="text-sm opacity-70">Chicken not found.</p>
        <Link href="/coop" className="mt-2 inline-block text-sm underline">
          Back to Coop
        </Link>
      </main>
    );
  }

  const { ancestry, descendants } = data;
  const generationLabels = ["Children", "Grandchildren", "Great-grandchildren"];

  return (
    <main className="mx-auto max-w-4xl p-6">
      <div className="signboard mb-6 p-4">
        <h1 className="font-display text-2xl font-semibold text-(--color-gold-bright)">
          🌳 Pedigree — {ancestry.name}
        </h1>
        <p className="text-sm opacity-70">Bloodline {ancestry.bloodlineId.slice(0, 8)}</p>
      </div>

      <section className="panel-wood mb-6 overflow-x-auto rounded-lg p-6">
        <div className="flex min-w-max justify-center">
          <PedigreeTreeNode node={ancestry} root />
        </div>
      </section>

      <section className="panel-wood rounded-lg p-6">
        <h2 className="font-display mb-3 text-lg font-semibold">📈 Descendants</h2>
        {descendants.totalDescendants === 0 ? (
          <p className="text-sm opacity-70">No offspring recorded yet.</p>
        ) : (
          <>
            <ul className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
              {descendants.byGeneration.map((count, i) => (
                <li key={i} className="rounded bg-black/10 px-3 py-2">
                  <span className="block text-xs uppercase tracking-wide opacity-60">
                    {generationLabels[i] ?? `Generation +${i + 1}`}
                  </span>
                  <span className="font-display text-lg font-semibold">{count}</span>
                </li>
              ))}
            </ul>
            <p className="mt-3 text-sm opacity-80">
              Total descendants: <strong>{descendants.totalDescendants}</strong> · Champions
              descended: <strong>{descendants.championsDescended}</strong>
            </p>
          </>
        )}
      </section>

      <Link href="/coop" className="mt-6 inline-block text-sm underline opacity-70 hover:opacity-100">
        ← Back to Coop
      </Link>
    </main>
  );
}
