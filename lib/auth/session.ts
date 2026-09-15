import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { UnauthenticatedError } from "./errors";

export type AuthClaims = {
  authUserId: string;
  email?: string;
};

type ClientFactory = () => Promise<SupabaseClient>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function optionalAuthClaims(
  createClient: ClientFactory = createServerSupabaseClient
): Promise<AuthClaims | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) return null;

  const sub = data.claims.sub as string | undefined;
  if (!sub || !UUID_RE.test(sub)) return null;

  return { authUserId: sub, email: data.claims.email as string | undefined };
}

export async function requireAuthClaims(
  createClient: ClientFactory = createServerSupabaseClient
): Promise<AuthClaims> {
  const claims = await optionalAuthClaims(createClient);
  if (!claims) throw new UnauthenticatedError();
  return claims;
}
