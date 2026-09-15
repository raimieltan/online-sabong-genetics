import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";

function isSameOriginRelativePath(next: string | null): next is string {
  if (!next) return false;
  if (!next.startsWith("/")) return false;
  if (next.startsWith("//")) return false;
  if (/^\/[a-zA-Z][a-zA-Z\d+\-.]*:/.test(next)) return false;
  return true;
}

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const rawNext = searchParams.get("next");
  const next = isSameOriginRelativePath(rawNext) ? rawNext : "/";

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=invalid_confirm_link", request.url));
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (error) {
    return NextResponse.redirect(new URL("/login?error=confirm_failed", request.url));
  }

  return NextResponse.redirect(new URL(next, request.url));
}
