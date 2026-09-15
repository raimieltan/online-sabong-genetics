import { NextResponse } from "next/server";

import { requirePlayer } from "@/lib/auth/player";
import { toErrorResponse } from "@/lib/auth/responses";
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

export async function handleGetPedigree(
  context: { params: Promise<{ id: string }> },
  deps: { requirePlayer: typeof requirePlayer } = { requirePlayer }
) {
  try {
    const player = await deps.requirePlayer();
    const { id } = await context.params;

    // Root rooster is private to its owner (spec §8.2 row 2); ancestors and
    // descendants pulled in by the tree/stat walk are unrestricted by owner.
    const root = await prisma.chicken.findFirst({ where: { id, playerId: player.id }, select: { id: true } });
    if (!root) {
      return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
    }

    const tree = await buildAncestorTree(id, lookup, 3);
    if (!tree) {
      return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
    }

    const descendants = await computeDescendantStats(id, findChildren);

    return NextResponse.json({ ancestry: tree, descendants });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  return handleGetPedigree(context);
}
