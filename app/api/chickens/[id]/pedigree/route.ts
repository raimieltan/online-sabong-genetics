import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";
import { buildAncestorTree, computeDescendantStats, type PedigreeChickenRow } from "@/lib/pedigree";

async function lookup(id: string): Promise<PedigreeChickenRow | null> {
  const chicken = await prisma.chicken.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      sex: true,
      bloodlineId: true,
      generation: true,
      fatherId: true,
      motherId: true,
      record: true,
    },
  });
  return chicken as unknown as PedigreeChickenRow | null;
}

async function findChildren(parentId: string): Promise<PedigreeChickenRow[]> {
  const children = await prisma.chicken.findMany({
    where: { OR: [{ fatherId: parentId }, { motherId: parentId }] },
    select: {
      id: true,
      name: true,
      sex: true,
      bloodlineId: true,
      generation: true,
      fatherId: true,
      motherId: true,
      record: true,
    },
  });
  return children as unknown as PedigreeChickenRow[];
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const tree = await buildAncestorTree(id, lookup, 3);
  if (!tree) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  const descendants = await computeDescendantStats(id, findChildren);

  return NextResponse.json({ ancestry: tree, descendants });
}
