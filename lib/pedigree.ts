import type { ChickenSex, CombatRecord } from "./types";

/** Minimal chicken projection needed to build a pedigree tree. */
export type PedigreeChickenRow = {
  id: string;
  name: string;
  sex: ChickenSex;
  bloodlineId: string;
  generation: number;
  fatherId: string | null;
  motherId: string | null;
  record: CombatRecord;
};

export type PedigreeNode = {
  id: string;
  name: string;
  sex: ChickenSex;
  bloodlineId: string;
  generation: number;
  record: CombatRecord;
  father: PedigreeNode | null;
  mother: PedigreeNode | null;
};

/**
 * Recursively assembles an ancestor tree up to `depth` generations back.
 * A missing/unknown ancestor (no id, or id not found by `lookup`) yields
 * `null` for that branch rather than throwing — gen-0 chickens have no
 * recorded parents at all.
 */
export async function buildAncestorTree(
  rootId: string,
  lookup: (id: string) => Promise<PedigreeChickenRow | null>,
  depth = 3,
): Promise<PedigreeNode | null> {
  const chicken = await lookup(rootId);
  if (!chicken) return null;

  const [father, mother] =
    depth <= 1
      ? [null, null]
      : await Promise.all([
          chicken.fatherId ? buildAncestorTree(chicken.fatherId, lookup, depth - 1) : null,
          chicken.motherId ? buildAncestorTree(chicken.motherId, lookup, depth - 1) : null,
        ]);

  return {
    id: chicken.id,
    name: chicken.name,
    sex: chicken.sex,
    bloodlineId: chicken.bloodlineId,
    generation: chicken.generation,
    record: chicken.record,
    father,
    mother,
  };
}

export type DescendantStats = {
  /** Descendant counts keyed by generation distance from the root (1 = children). */
  byGeneration: number[];
  totalDescendants: number;
  championsDescended: number;
};

/**
 * Walks the descendant graph breadth-first via `findChildren` (chickens whose
 * fatherId or motherId matches the given parent id), counting descendants per
 * generation and how many have at least one championship on record.
 */
export async function computeDescendantStats(
  rootId: string,
  findChildren: (parentId: string) => Promise<PedigreeChickenRow[]>,
  maxGenerations = 5,
): Promise<DescendantStats> {
  const byGeneration: number[] = [];
  let championsDescended = 0;
  const seen = new Set<string>([rootId]);
  let frontier = [rootId];

  for (let gen = 0; gen < maxGenerations && frontier.length > 0; gen++) {
    const childLists = await Promise.all(frontier.map((id) => findChildren(id)));
    const children = childLists.flat().filter((c) => !seen.has(c.id));

    for (const child of children) seen.add(child.id);
    if (children.length === 0) break;

    byGeneration.push(children.length);
    championsDescended += children.filter((c) => c.record.championships > 0).length;
    frontier = children.map((c) => c.id);
  }

  return {
    byGeneration,
    totalDescendants: byGeneration.reduce((sum, n) => sum + n, 0),
    championsDescended,
  };
}
