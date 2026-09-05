import test from "node:test";
import assert from "node:assert/strict";

import {
  generateBracketOpponents,
  PRIZE_TOKENS,
  runTournament,
  TOURNAMENT_SIZE,
} from "../tournament";
import { generateRandomChicken } from "../chickenGenerator";
import type { Chicken, CombatResult } from "../types";

function opponent(id: string): Chicken {
  return generateRandomChicken({ name: id });
}

function opponents(count: number): Chicken[] {
  return Array.from({ length: count }, (_, i) => opponent(`opp-${i}`));
}

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

test("generateBracketOpponents produces TOURNAMENT_SIZE - 1 opponents", () => {
  const player = generateRandomChicken({ name: "Player" });
  const bracket = generateBracketOpponents(player, () => generateRandomChicken());
  assert.equal(bracket.length, TOURNAMENT_SIZE - 1);
});

test("runTournament throws if given the wrong number of opponents", () => {
  const player = generateRandomChicken({ name: "Player" });
  assert.throws(() => runTournament(player, opponents(2)));
});

test("runTournament: winning every match places 1st and awards the 1st-place token prize", () => {
  const player = generateRandomChicken({ name: "Player" });
  const fight = (a: Chicken, b: Chicken) => fakeResult(player.id, a.id === player.id ? b.id : a.id);

  const result = runTournament(player, opponents(TOURNAMENT_SIZE - 1), fight);

  assert.equal(result.placement, 1);
  assert.equal(result.tokensAwarded, PRIZE_TOKENS[1]);
  assert.equal(result.matches.length, Math.log2(TOURNAMENT_SIZE));
});

test("runTournament: losing the final places 2nd", () => {
  const player = generateRandomChicken({ name: "Player" });
  let matchCount = 0;
  const fight = (a: Chicken, b: Chicken) => {
    matchCount += 1;
    const opp = a.id === player.id ? b.id : a.id;
    // Win every round except the last.
    return matchCount === Math.log2(TOURNAMENT_SIZE) ? fakeResult(opp, player.id) : fakeResult(player.id, opp);
  };

  const result = runTournament(player, opponents(TOURNAMENT_SIZE - 1), fight);

  assert.equal(result.placement, 2);
  assert.equal(result.tokensAwarded, PRIZE_TOKENS[2]);
});

test("runTournament: losing the semifinal places 3rd", () => {
  const player = generateRandomChicken({ name: "Player" });
  let matchCount = 0;
  const fight = (a: Chicken, b: Chicken) => {
    matchCount += 1;
    const opp = a.id === player.id ? b.id : a.id;
    return matchCount === Math.log2(TOURNAMENT_SIZE) - 1
      ? fakeResult(opp, player.id)
      : fakeResult(player.id, opp);
  };

  const result = runTournament(player, opponents(TOURNAMENT_SIZE - 1), fight);

  assert.equal(result.placement, 3);
  assert.equal(result.tokensAwarded, PRIZE_TOKENS[3]);
});

test("runTournament: an early loss (before the semifinal) does not place", () => {
  const player = generateRandomChicken({ name: "Player" });
  const fight = (a: Chicken, b: Chicken) => {
    const opp = a.id === player.id ? b.id : a.id;
    return fakeResult(opp, player.id);
  };

  const result = runTournament(player, opponents(TOURNAMENT_SIZE - 1), fight);

  assert.equal(result.placement, null);
  assert.equal(result.tokensAwarded, 0);
  assert.equal(result.matches.length, 1);
});
