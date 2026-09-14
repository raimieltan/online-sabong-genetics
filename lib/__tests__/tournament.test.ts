import test from "node:test";
import assert from "node:assert/strict";

import {
  createTournament,
  resolveRound,
  tokensAwardedFor,
  TOURNAMENT_SIZES,
  type TournamentState,
} from "../tournament";
import { generateRandomChicken } from "../chickenGenerator";
import type { Chicken, CombatResult } from "../types";

function fakeResult(winnerId: string, loserId: string): CombatResult {
  return {
    winnerId,
    loserId,
    log: [],
    totalTurns: 1,
    outcomeReason: "ko",
    injuredChickenId: null,
  };
}

/** Always has the player's chicken win. */
function playerAlwaysWinsFight(player: Chicken) {
  return (a: Chicken, b: Chicken): CombatResult => {
    const opp = a.id === player.id ? b.id : a.id;
    return fakeResult(player.id, opp);
  };
}

/** Always has the player's chicken lose. */
function playerAlwaysLosesFight(player: Chicken) {
  return (a: Chicken, b: Chicken): CombatResult => {
    const opp = a.id === player.id ? b.id : a.id;
    return fakeResult(opp, player.id);
  };
}

for (const size of TOURNAMENT_SIZES) {
  test(`createTournament builds a full ${size}-slot bracket including the player`, () => {
    const player = generateRandomChicken({ name: "Player" });
    const state = createTournament(player, size, "rookie", () => generateRandomChicken());

    assert.equal(state.entrants.length, size);
    assert.equal(state.entrants.filter((e) => e.isPlayer).length, 1);
    assert.equal(state.totalRounds, Math.log2(size));
    assert.equal(state.status, "in_progress");
    assert.equal(state.currentRound, 0);
  });

  test(`resolveRound: winning every round of a ${size}-bracket places 1st`, () => {
    const player = generateRandomChicken({ name: "Player" });
    let state: TournamentState = createTournament(player, size, "rookie", () => generateRandomChicken());
    const fight = playerAlwaysWinsFight(player);

    for (let round = 0; round < state.totalRounds; round++) {
      const outcome = resolveRound(state, player, fight);
      state = outcome.state;
    }

    assert.equal(state.status, "complete");
    assert.equal(state.placement, 1);
    assert.ok(state.tokensAwarded > 0);
  });

  test(`resolveRound: an early loss in a ${size}-bracket ends the run without a top-3 placement`, () => {
    const player = generateRandomChicken({ name: "Player" });
    let state: TournamentState = createTournament(player, size, "rookie", () => generateRandomChicken());
    const outcome = resolveRound(state, player, playerAlwaysLosesFight(player));
    state = outcome.state;

    assert.equal(state.status, "complete");
    if (state.totalRounds <= 2) {
      // 8-bracket losing round 1 is still "early" (not semifinal/final) only when totalRounds > 2;
      // smaller brackets place immediately on any loss.
      assert.ok([2, 3].includes(state.placement as number));
    } else {
      assert.equal(state.placement, null);
    }
  });
}

test("resolveRound: losing the final places 2nd", () => {
  const player = generateRandomChicken({ name: "Player" });
  let state = createTournament(player, 8, "rookie", () => generateRandomChicken());
  const winFight = playerAlwaysWinsFight(player);
  const loseFight = playerAlwaysLosesFight(player);

  for (let round = 0; round < state.totalRounds - 1; round++) {
    state = resolveRound(state, player, winFight).state;
  }
  const final = resolveRound(state, player, loseFight);

  assert.equal(final.state.placement, 2);
});

test("resolveRound: losing the semifinal places 3rd", () => {
  const player = generateRandomChicken({ name: "Player" });
  let state = createTournament(player, 8, "rookie", () => generateRandomChicken());
  const winFight = playerAlwaysWinsFight(player);
  const loseFight = playerAlwaysLosesFight(player);

  state = resolveRound(state, player, winFight).state; // round 0 win
  const semifinal = resolveRound(state, player, loseFight); // round 1 = semifinal for size 8

  assert.equal(semifinal.state.placement, 3);
});

test("resolveRound throws once the tournament is already complete", () => {
  const player = generateRandomChicken({ name: "Player" });
  let state = createTournament(player, 8, "rookie", () => generateRandomChicken());
  const loseFight = playerAlwaysLosesFight(player);
  state = resolveRound(state, player, loseFight).state;

  assert.equal(state.status, "complete");
  assert.throws(() => resolveRound(state, player, loseFight));
});

test("tokensAwardedFor scales with tier and bracket size", () => {
  const base8Beginner = tokensAwardedFor(8, "beginner", 1, 3);
  const base8Champion = tokensAwardedFor(8, "champion", 1, 3);
  const base32Champion = tokensAwardedFor(32, "champion", 1, 3);

  assert.ok(base8Champion > base8Beginner);
  assert.ok(base32Champion > base8Champion);
});

test("tokensAwardedFor pays a consolation reward for an early elimination", () => {
  const tokens = tokensAwardedFor(16, "veteran", null, 2);
  assert.ok(tokens > 0);
});

test("simulated entrants retain their combat condition in the saved bracket", () => {
  const player = generateRandomChicken({ name: "Player" });
  const state = createTournament(player, 8, "rookie", () => generateRandomChicken());
  const result = resolveRound(state, player, (a, b) => ({
    ...fakeResult(a.id, b.id),
    conditionDelta: { [a.id]: -7, [b.id]: -11 },
  }));

  assert.equal(result.state.history[0].length, 4);
  for (const entrant of result.state.entrants) {
    assert.ok((entrant.chicken.condition ?? 100) < 100, "all round-one entrants keep their aftermath");
  }
});
