import test from "node:test";
import assert from "node:assert/strict";

import { buildAncestorTree, computeDescendantStats, type PedigreeChickenRow } from "../pedigree";

function chicken(overrides: Partial<PedigreeChickenRow> & { id: string }): PedigreeChickenRow {
  return {
    name: overrides.id,
    sex: "rooster",
    bloodlineId: "bloodline-1",
    generation: 0,
    fatherId: null,
    motherId: null,
    record: { wins: 0, losses: 0, championships: 0, koTko: 0, decisions: 0 },
    ...overrides,
  };
}

test("buildAncestorTree returns null for an unknown root", async () => {
  const tree = await buildAncestorTree("missing", async () => null);
  assert.equal(tree, null);
});

test("buildAncestorTree resolves a gen-0 chicken with no parents", async () => {
  const db = new Map([["a", chicken({ id: "a" })]]);
  const tree = await buildAncestorTree("a", async (id) => db.get(id) ?? null);
  assert.equal(tree?.id, "a");
  assert.equal(tree?.father, null);
  assert.equal(tree?.mother, null);
});

test("buildAncestorTree walks father/mother recursively", async () => {
  const db = new Map([
    ["child", chicken({ id: "child", fatherId: "dad", motherId: "mom" })],
    ["dad", chicken({ id: "dad", fatherId: "grandpa" })],
    ["mom", chicken({ id: "mom" })],
    ["grandpa", chicken({ id: "grandpa" })],
  ]);
  const tree = await buildAncestorTree("child", async (id) => db.get(id) ?? null);

  assert.equal(tree?.father?.id, "dad");
  assert.equal(tree?.mother?.id, "mom");
  assert.equal(tree?.father?.father?.id, "grandpa");
});

test("buildAncestorTree stops recursing at the given depth", async () => {
  const db = new Map([
    ["child", chicken({ id: "child", fatherId: "dad" })],
    ["dad", chicken({ id: "dad", fatherId: "grandpa" })],
    ["grandpa", chicken({ id: "grandpa" })],
  ]);
  const tree = await buildAncestorTree("child", async (id) => db.get(id) ?? null, 2);

  assert.equal(tree?.father?.id, "dad");
  assert.equal(tree?.father?.father, null);
});

test("buildAncestorTree yields a null branch for a parent id that can't be found", async () => {
  const db = new Map([["child", chicken({ id: "child", fatherId: "ghost" })]]);
  const tree = await buildAncestorTree("child", async (id) => db.get(id) ?? null);

  assert.equal(tree?.father, null);
});

test("computeDescendantStats counts zero descendants for a childless chicken", async () => {
  const stats = await computeDescendantStats("a", async () => []);
  assert.deepEqual(stats.byGeneration, []);
  assert.equal(stats.totalDescendants, 0);
  assert.equal(stats.championsDescended, 0);
});

test("computeDescendantStats counts children, grandchildren, and champions", async () => {
  const children = [chicken({ id: "c1" }), chicken({ id: "c2" })];
  const grandchildren = [
    chicken({ id: "g1", record: { wins: 0, losses: 0, championships: 1, koTko: 0, decisions: 0 } }),
  ];

  const stats = await computeDescendantStats("root", async (parentId) => {
    if (parentId === "root") return children;
    if (parentId === "c1") return grandchildren;
    return [];
  });

  assert.deepEqual(stats.byGeneration, [2, 1]);
  assert.equal(stats.totalDescendants, 3);
  assert.equal(stats.championsDescended, 1);
});

test("computeDescendantStats does not double-count a chicken reachable via both parents", async () => {
  const shared = chicken({ id: "shared" });
  const stats = await computeDescendantStats("root", async (parentId) =>
    parentId === "root" ? [shared] : [],
  );

  assert.equal(stats.totalDescendants, 1);
});
