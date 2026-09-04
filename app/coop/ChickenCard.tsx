import type { Chicken } from "@/lib/types";

export function ChickenCard({ chicken, onSelect }: { chicken: Chicken; onSelect: () => void }) {
  return (
    <button
      onClick={onSelect}
      className="rounded border border-neutral-800 bg-neutral-900 p-4 text-left hover:border-amber-500"
    >
      <p className="font-semibold text-neutral-100">{chicken.name}</p>
      <p className="text-sm text-neutral-400">
        {chicken.sex} · Gen {chicken.generation}
      </p>
    </button>
  );
}
