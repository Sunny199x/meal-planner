import { beforeEach, describe, expect, it } from "vitest";
import { openLocalDb } from "../db/local";
import type { Db } from "../db/types";
import { readLikedIds, sameRecipes, usableCombinations } from "./liked";
import { forgetLikedCombination, getLikedCombinations, saveLikedCombination } from "./liked-store";

const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

describe("checking a liked combination", () => {
  it("takes two or three different recipes, sorted", () => {
    expect(readLikedIds([ID(2), ID(1)])).toEqual([ID(1), ID(2)]);
    expect(readLikedIds([ID(3), ID(1), ID(2)])).toEqual([ID(1), ID(2), ID(3)]);
    expect(readLikedIds([ID(1).toUpperCase(), ID(2)])).toEqual([ID(1), ID(2)]);
  });

  it("refuses one, four, the same recipe twice, or anything that isn't a recipe id", () => {
    expect(readLikedIds([ID(1)])).toBeNull();
    expect(readLikedIds([ID(1), ID(2), ID(3), ID(4)])).toBeNull();
    expect(readLikedIds([ID(1), ID(1)])).toBeNull();
    expect(readLikedIds([ID(1), "korma"])).toBeNull();
    expect(readLikedIds("korma")).toBeNull();
  });

  it("compares combinations in any order", () => {
    expect(sameRecipes([ID(1), ID(2)], [ID(2), ID(1)])).toBe(true);
    expect(sameRecipes([ID(1), ID(2)], [ID(1), ID(2), ID(3)])).toBe(false);
  });
});

describe("which combinations can be used", () => {
  const recipes = new Map(
    [
      { id: ID(1), seafood: null },
      { id: ID(2), seafood: null },
      { id: ID(3), seafood: "contains" as const },
      { id: ID(4), seafood: "may contain" as const },
    ].map((r) => [r.id, r]),
  );

  it("leaves out deleted recipes and recipes now containing seafood, and drops a combination left with one dish", () => {
    const combinations = [
      { id: "a", recipeIds: [ID(1), ID(2), ID(9)], weekStart: null }, // one deleted
      { id: "b", recipeIds: [ID(1), ID(3)], weekStart: null }, // seafood: one left
      { id: "c", recipeIds: [ID(2), ID(4)], weekStart: "2026-10-25" }, // "may contain" is a warning, not a ban
    ];
    expect(usableCombinations(combinations, recipes)).toEqual([
      { id: "a", recipeIds: [ID(1), ID(2)], weekStart: null },
      { id: "c", recipeIds: [ID(2), ID(4)], weekStart: "2026-10-25" },
    ]);
  });
});

describe("storing liked combinations", () => {
  let db: Db;
  beforeEach(async () => {
    db = await openLocalDb("memory://");
  });

  it("saves, keeps the same recipes once, lists newest first and forgets", async () => {
    await saveLikedCombination(db, [ID(1), ID(2)], "2026-10-25");
    const twice = await saveLikedCombination(db, [ID(1), ID(2)], "2026-11-01");
    expect(twice).toEqual([{ id: expect.any(String), recipeIds: [ID(1), ID(2)], weekStart: "2026-10-25" }]);
    const both = await saveLikedCombination(db, [ID(2), ID(3), ID(4)], null);
    expect(both.map((c) => c.recipeIds)).toEqual([
      [ID(2), ID(3), ID(4)],
      [ID(1), ID(2)],
    ]);
    expect(await forgetLikedCombination(db, both[0].id)).toEqual([twice[0]]);
    expect(await getLikedCombinations(db)).toEqual([twice[0]]);
  });
});
