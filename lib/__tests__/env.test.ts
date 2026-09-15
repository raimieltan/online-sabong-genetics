import test from "node:test";
import assert from "node:assert/strict";

import { getSupabaseEnv } from "../env";

test("getSupabaseEnv throws when a required variable is missing", () => {
  const original = { ...process.env };
  delete process.env.NEXT_PUBLIC_SUPABASE_URL;
  assert.throws(() => getSupabaseEnv(), /NEXT_PUBLIC_SUPABASE_URL/);
  process.env = original;
});

test("getSupabaseEnv returns configured values", () => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-key";
  process.env.NEXT_PUBLIC_APP_URL = "http://localhost:3000";
  const env = getSupabaseEnv();
  assert.equal(env.url, "https://example.supabase.co");
  assert.equal(env.publishableKey, "test-key");
  assert.equal(env.appUrl, "http://localhost:3000");
});
