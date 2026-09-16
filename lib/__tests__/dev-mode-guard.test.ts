import test from "node:test";
import assert from "node:assert/strict";

import { isDevModeEnabled } from "../dev";

test("dev mode is disabled in production regardless of allowlist", () => {
  const original = { ...process.env };
  process.env.NODE_ENV = "production";
  process.env.DEV_MODE_ALLOWLIST = "11111111-1111-1111-1111-111111111111";
  assert.equal(isDevModeEnabled("11111111-1111-1111-1111-111111111111"), false);
  process.env = original;
});

test("dev mode requires an allowlisted authUserId outside production", () => {
  const original = { ...process.env };
  process.env.NODE_ENV = "development";
  process.env.DEV_MODE_ALLOWLIST = "11111111-1111-1111-1111-111111111111";
  assert.equal(isDevModeEnabled("11111111-1111-1111-1111-111111111111"), true);
  assert.equal(isDevModeEnabled("22222222-2222-2222-2222-222222222222"), false);
  assert.equal(isDevModeEnabled(null), false);
  process.env = original;
});
