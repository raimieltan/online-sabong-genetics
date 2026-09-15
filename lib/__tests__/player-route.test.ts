import test from "node:test";
import assert from "node:assert/strict";

import { UnauthenticatedError } from "../auth/errors";
import { handleGetPlayer } from "../../app/api/player/route";

test("GET /api/player returns 401 when unauthenticated", async () => {
  const res = await handleGetPlayer({
    requirePlayer: async () => {
      throw new UnauthenticatedError();
    },
  });
  assert.equal(res.status, 401);
});

test("GET /api/player returns the player DTO when authenticated", async () => {
  const res = await handleGetPlayer({
    requirePlayer: async () =>
      ({
        id: "p1",
        authUserId: "auth-1",
        displayName: "Sean",
        onboardingState: "PROVISIONED",
        provisionedAt: new Date(),
        lastSeenAt: new Date(),
        createdAt: new Date(),
        credits: 1000,
        tournamentTokens: 0,
      }) as never,
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, "p1");
  assert.equal("authUserId" in body, false);
});
