import test from "node:test";
import assert from "node:assert/strict";

import { UnauthenticatedError, ForbiddenError } from "../auth/errors";

test("UnauthenticatedError carries a stable code", () => {
  const err = new UnauthenticatedError();
  assert.equal(err.code, "UNAUTHENTICATED");
  assert.ok(err instanceof Error);
});

test("ForbiddenError carries a stable code", () => {
  const err = new ForbiddenError();
  assert.equal(err.code, "FORBIDDEN");
  assert.ok(err instanceof Error);
});
