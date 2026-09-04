import { NextResponse } from "next/server";

import { prisma } from "@/lib/db";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const chicken = await prisma.chicken.findUnique({ where: { id } });

  if (!chicken) {
    return NextResponse.json({ error: "Chicken not found" }, { status: 404 });
  }

  return NextResponse.json(chicken);
}
