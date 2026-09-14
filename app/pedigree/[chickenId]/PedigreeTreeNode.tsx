import Link from "next/link";

import type { PedigreeNode } from "@/lib/pedigree";

function isChampion(node: PedigreeNode) {
  return node.record.championships > 0;
}

export function PedigreeTreeNode({ node, root = false }: { node: PedigreeNode | null; root?: boolean }) {
  if (!node) {
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="flex h-16 w-36 items-center justify-center rounded-md border border-dashed border-(--color-text-muted)/30 text-xs italic text-(--color-text-muted)">
          Unknown
        </div>
      </div>
    );
  }

  const card = (
    <div
      className={`flex h-16 w-36 flex-col items-center justify-center rounded-md border px-2 text-center transition ${
        isChampion(node)
          ? "border-(--color-gold) bg-(--color-gold)/10 text-(--color-gold-bright)"
          : "border-(--color-gold)/20 bg-black/10 text-(--foreground)"
      } ${root ? "" : "hover:border-(--color-gold)/60"}`}
    >
      <span className="truncate text-sm font-semibold">
        {node.sex === "rooster" ? "🐓" : "🐔"} {node.name}
      </span>
      <span className="text-[11px] opacity-70">
        Gen {node.generation}
        {isChampion(node) ? ` · 🏆×${node.record.championships}` : ""}
      </span>
    </div>
  );

  return (
    <div className="flex flex-col items-center gap-1">
      {root ? card : <Link href={`/pedigree/${node.id}`}>{card}</Link>}

      {(node.father || node.mother) && (
        <div className="flex flex-col items-center">
          <div className="h-4 w-px bg-(--color-gold)/25" />
          <div className="flex gap-6 border-t border-(--color-gold)/25 pt-4">
            <PedigreeTreeNode node={node.father} />
            <PedigreeTreeNode node={node.mother} />
          </div>
        </div>
      )}
    </div>
  );
}
