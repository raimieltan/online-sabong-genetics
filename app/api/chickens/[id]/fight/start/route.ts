import { NextResponse } from "next/server";

/** Archived transport. Use POST /api/combat/sessions with a server encounter. */
export async function POST() {
  return NextResponse.json({ error: "LEGACY_COMBAT_ROUTE", canonical: "/api/combat/sessions" }, { status: 410 });
}
