import { NextResponse } from "next/server";

/** Archived turn endpoint. Boss fights use the common authoritative session. */
export async function POST() {
  return NextResponse.json({ error: "LEGACY_COMBAT_ROUTE", canonical: "/api/combat/sessions/:sessionId/sync" }, { status: 410 });
}
