import test from "node:test";
import assert from "node:assert/strict";

import { toPlayerDto } from "../auth/dto";

test("toPlayerDto omits authUserId and internal fields", () => {
  const player = {
    id: "p1",
    authUserId: "auth-uuid-should-not-leak",
    displayName: "Sean",
    onboardingState: "PROVISIONED",
    provisionedAt: new Date(),
    lastSeenAt: new Date(),
    createdAt: new Date(),
    credits: 1000,
    tournamentTokens: 0,
  };

  const dto = toPlayerDto(player as never);

  assert.equal(dto.id, "p1");
  assert.equal(dto.credits, 1000);
  assert.equal(dto.tournamentTokens, 0);
  assert.equal("authUserId" in dto, false);
});
