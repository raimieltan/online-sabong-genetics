"use client";

import { useState } from "react";
import type { Rooster } from "@/lib/types";
import { PRESET_ROOSTERS, generateRandomRooster } from "@/lib/roosterGenerator";
import StatsDisplay from "./StatsDisplay";

interface RoosterSelectorProps {
  corner: "red" | "blue";
  onSelect: (rooster: Rooster) => void;
  selectedRooster: Rooster | null;
}

const CORNER_STYLES = {
  red: {
    panel: "border-red-700 bg-red-950/25",
    title: "text-red-400",
    selectedCard: "border-red-500 bg-red-950/35 shadow-red-500/20",
  },
  blue: {
    panel: "border-blue-700 bg-blue-950/25",
    title: "text-blue-400",
    selectedCard: "border-blue-500 bg-blue-950/35 shadow-blue-500/20",
  },
} as const;

export default function RoosterSelector({
  corner,
  onSelect,
  selectedRooster,
}: RoosterSelectorProps) {
  const [contender, setContender] = useState<Rooster | null>(null);
  const styles = CORNER_STYLES[corner];

  const handleGenerateContender = () => {
    const newContender = generateRandomRooster();
    setContender(newContender);
    onSelect(newContender);
  };

  return (
    <section className={`${styles.panel} rounded-2xl border p-5 shadow-2xl`}>
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">
            Fighter Select
          </p>
          <h2 className={`${styles.title} text-2xl font-black uppercase tracking-wide`}>
            {corner} Corner
          </h2>
        </div>
        <span className="rounded-full border border-slate-700 bg-black/30 px-3 py-1 text-xs font-black uppercase tracking-widest text-slate-300">
          {selectedRooster ? "Locked" : "Open"}
        </span>
      </div>

      <div className="mb-6">
        <h3 className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
          Presets
        </h3>
        <div className="grid gap-3">
          {PRESET_ROOSTERS.map((rooster) => (
            <RoosterCard
              key={rooster.id}
              rooster={rooster}
              isSelected={selectedRooster?.id === rooster.id}
              onSelect={() => onSelect(rooster)}
              selectedClassName={styles.selectedCard}
            />
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-black uppercase tracking-[0.22em] text-slate-500">
          Procedural Contender
        </h3>
        <button
          type="button"
          onClick={handleGenerateContender}
          className="w-full rounded-xl bg-gradient-to-r from-fuchsia-600 to-cyan-500 px-4 py-3 text-sm font-black uppercase tracking-[0.18em] text-white shadow-lg shadow-fuchsia-950/40 transition hover:scale-[1.02] hover:from-fuchsia-500 hover:to-cyan-400"
        >
          Generate Fighter
        </button>
        {contender ? (
          <div className="mt-4">
            <RoosterCard
              rooster={contender}
              isSelected={selectedRooster?.id === contender.id}
              onSelect={() => onSelect(contender)}
              selectedClassName={styles.selectedCard}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}

interface RoosterCardProps {
  rooster: Rooster;
  isSelected: boolean;
  onSelect: () => void;
  selectedClassName: string;
}

function RoosterCard({
  rooster,
  isSelected,
  onSelect,
  selectedClassName,
}: RoosterCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-xl border-2 p-4 text-left transition hover:-translate-y-0.5 hover:border-slate-500 ${
        isSelected
          ? `${selectedClassName} shadow-lg`
          : "border-slate-800 bg-slate-950/80"
      }`}
    >
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h4 className="text-lg font-black text-white">{rooster.name}</h4>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-500">
            {rooster.type}
          </p>
        </div>
        <div className="flex gap-1.5">
          <ColorDot color={rooster.colorScheme.body} label="Body" />
          <ColorDot color={rooster.colorScheme.comb} label="Comb" />
          <ColorDot color={rooster.colorScheme.tail} label="Tail" />
        </div>
      </div>
      <StatsDisplay rooster={rooster} />
    </button>
  );
}

function ColorDot({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="h-4 w-4 rounded-full border border-slate-600 shadow-inner"
      style={{ backgroundColor: color }}
      title={label}
    />
  );
}
