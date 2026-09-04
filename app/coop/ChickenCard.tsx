import type { Chicken } from "@/lib/types";
import { canAgeUp, canRetire } from "@/lib/growth";

export function ChickenCard({
  chicken,
  onSelect,
  onAgeUp,
  onRetire,
}: {
  chicken: Chicken;
  onSelect: () => void;
  onAgeUp?: () => void;
  onRetire?: () => void;
}) {
  return (
    <div className="rounded border border-neutral-800 bg-neutral-900 p-4 text-left hover:border-amber-500">
      <button onClick={onSelect} className="block w-full text-left">
        <p className="font-semibold text-neutral-100">{chicken.name}</p>
        <p className="text-sm text-neutral-400">
          {chicken.sex} · Gen {chicken.generation}
        </p>
        <span className="mt-2 inline-block rounded bg-neutral-800 px-2 py-0.5 text-xs uppercase tracking-wide text-amber-400">
          {chicken.growthStage.replace("_", " ")}
        </span>
      </button>

      {(canAgeUp(chicken.growthStage) || canRetire(chicken.growthStage)) && (
        <div className="mt-3 flex gap-2">
          {canAgeUp(chicken.growthStage) && onAgeUp && (
            <button
              onClick={onAgeUp}
              className="rounded bg-neutral-800 px-2 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
            >
              Age Up
            </button>
          )}
          {canRetire(chicken.growthStage) && onRetire && (
            <button
              onClick={onRetire}
              className="rounded bg-neutral-800 px-2 py-1 text-xs font-semibold text-neutral-200 hover:bg-neutral-700"
            >
              Retire
            </button>
          )}
        </div>
      )}
    </div>
  );
}
