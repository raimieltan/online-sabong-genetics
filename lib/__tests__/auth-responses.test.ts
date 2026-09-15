import test from "node:test";
import assert from "node:assert/strict";

import { UnauthenticatedError, ForbiddenError } from "../auth/errors";
import { toErrorResponse } from "../auth/responses";

test("UnauthenticatedError maps to 401 with UNAUTHENTICATED code", async () => {
  const res = toErrorResponse(new UnauthenticatedError());
  assert.equal(res.status, 401);
  const body = await res.json();
  assert.equal(body.error.code, "UNAUTHENTICATED");
});

test("ForbiddenError maps to 403 with FORBIDDEN code", async () => {
  const res = toErrorResponse(new ForbiddenError());
  assert.equal(res.status, 403);
  const body = await res.json();
  assert.equal(body.error.code, "FORBIDDEN");
});

test("unknown errors map to 500 without leaking internals", async () => {
  const res = toErrorResponse(new Error("some internal detail"));
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.error.code, "INTERNAL_ERROR");
  assert.ok(!JSON.stringify(body).includes("internal detail"));
});
