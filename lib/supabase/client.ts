"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "@/lib/env";

export function createBrowserSupabaseClient() {
  const env = getSupabaseEnv();
  return createBrowserClient(env.url, env.publishableKey);
}
