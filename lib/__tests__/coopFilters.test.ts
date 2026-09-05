import assert from "node:assert/strict";
import { test } from "node:test";

import { filterChickens, type CoopFilterState } from "../coopFilters";
import { makeChicken } from "./testHelpers";

const NO_FILTER: CoopFilterState = {
  search: "",
  sex: "all",
  growthStage: "all",
  status: "all",
};

test("filterChickens returns all chickens when filters are default", () => {
  const chickens = [makeChicken({ id: "a" }), makeChicken({ id: "b" })];
  assert.deepEqual(filterChickens(chickens, NO_FILTER), chickens);
});

test("filterChickens matches search against name case-insensitively", () => {
  const chickens = [
    makeChicken({ id: "a", name: "Thunderbolt" }),
    makeChicken({ id: "b", name: "Shadow" }),
  ];
  const result = filterChickens(chickens, { ...NO_FILTER, search: "thunder" });
  assert.deepEqual(result.map((c) => c.id), ["a"]);
});

test("filterChickens filters by sex", () => {
  const chickens = [
    makeChicken({ id: "a", sex: "rooster" }),
    makeChicken({ id: "b", sex: "hen" }),
  ];
  const result = filterChickens(chickens, { ...NO_FILTER, sex: "hen" });
  assert.deepEqual(result.map((c) => c.id), ["b"]);
});

test("filterChickens filters by growth stage", () => {
  const chickens = [
    makeChicken({ id: "a", growthStage: "chick" }),
    makeChicken({ id: "b", growthStage: "adult" }),
  ];
  const result = filterChickens(chickens, { ...NO_FILTER, growthStage: "adult" });
  assert.deepEqual(result.map((c) => c.id), ["b"]);
});

test("filterChickens filters by status", () => {
  const chickens = [
    makeChicken({ id: "a", status: "active" }),
    makeChicken({ id: "b", status: "retired" }),
  ];
  const result = filterChickens(chickens, { ...NO_FILTER, status: "retired" });
  assert.deepEqual(result.map((c) => c.id), ["b"]);
});

test("filterChickens combines search, sex, growth stage and status", () => {
  const chickens = [
    makeChicken({ id: "a", name: "Thunderbolt", sex: "rooster", growthStage: "adult", status: "active" }),
    makeChicken({ id: "b", name: "Thunderstorm", sex: "hen", growthStage: "adult", status: "active" }),
    makeChicken({ id: "c", name: "Thunderclap", sex: "rooster", growthStage: "chick", status: "active" }),
  ];
  const result = filterChickens(chickens, {
    search: "thunder",
    sex: "rooster",
    growthStage: "adult",
    status: "all",
  });
  assert.deepEqual(result.map((c) => c.id), ["a"]);
});
