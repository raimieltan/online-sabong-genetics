import test from "node:test";
import assert from "node:assert/strict";

import { UnauthenticatedError } from "../auth/errors";
import { requireAuthClaims, optionalAuthClaims } from "../auth/session";

function fakeClient(claims: Record<string, unknown> | null) {
  return {
    auth: {
      getClaims: async () => ({ data: { claims }, error: null }),
    },
  } as never;
}

test("requireAuthClaims returns claims for a valid UUID subject", async () => {
  const claims = await requireAuthClaims(
    async () => fakeClient({ sub: "11111111-1111-1111-1111-111111111111", email: "a@example.com" })
  );
  assert.equal(claims.authUserId, "11111111-1111-1111-1111-111111111111");
  assert.equal(claims.email, "a@example.com");
});

test("requireAuthClaims rejects a missing subject", async () => {
  await assert.rejects(() => requireAuthClaims(async () => fakeClient(null)), UnauthenticatedError);
});

test("requireAuthClaims rejects a non-UUID subject", async () => {
  await assert.rejects(
    () => requireAuthClaims(async () => fakeClient({ sub: "not-a-uuid" })),
    UnauthenticatedError
  );
});

test("optionalAuthClaims returns null instead of throwing", async () => {
  assert.equal(await optionalAuthClaims(async () => fakeClient(null)), null);
});
