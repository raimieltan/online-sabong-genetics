import { NextResponse } from "next/server";

/** Archived turn endpoint. Tournament fights use the common session API. */
export async function POST() {
  return NextResponse.json({ error: "LEGACY_COMBAT_ROUTE", canonical: "/api/combat/sessions/:sessionId/sync" }, { status: 410 });
}
