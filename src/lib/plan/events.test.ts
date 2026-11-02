import { beforeEach, describe, expect, it } from "vitest";
import { openLocalDb } from "../db/local";
import { recipes } from "../db/schema";
import type { Db } from "../db/types";
import { loadRecipeFiles } from "../recipes/load-files";
import { deleteRecipe } from "../recipes/save";
import { readTemplateFixtures } from "../recipes/test-fixtures";
import { recordEvents, weekEvents } from "./events";

let db: Db;
let ids: string[];
beforeEach(async () => {
  db = await openLocalDb("memory://");
  await loadRecipeFiles(db, await readTemplateFixtures());
  ids = (await db.select({ id: recipes.id }).from(recipes).orderBy(recipes.title)).map((r) => r.id);
});

const counts = async (week: string) =>
  (await weekEvents(db, week)).map((e) => [ids.indexOf(e.recipeId), e.kind, e.count]).sort();

describe("recording what was shown, hidden and picked", () => {
  it("keeps one row per week, recipe and kind, counting repeats", async () => {
    await recordEvents(db, "2026-11-08", "shown", [ids[0], ids[1], ids[1]]);
    await recordEvents(db, "2026-11-08", "shown", [ids[0]]);
    await recordEvents(db, "2026-11-08", "dismissed", [ids[1]]);
    await recordEvents(db, "2026-11-08", "picked", [ids[0]]);
    await recordEvents(db, "2026-11-15", "shown", [ids[0]]);
    expect(await counts("2026-11-08")).toEqual([
      [0, "picked", 1],
      [0, "shown", 2],
      [1, "dismissed", 1],
      [1, "shown", 1],
    ]);
    expect(await counts("2026-11-15")).toEqual([[0, "shown", 1]]);
  });

  it("skips recipes that no longer exist, and forgets a recipe's events when it is deleted", async () => {
    const gone = "00000000-0000-4000-8000-000000000009";
    expect(await recordEvents(db, "2026-11-08", "shown", [gone])).toBe(0);
    expect(await recordEvents(db, "2026-11-08", "shown", [ids[0], gone, ids[2]])).toBe(2);
    await deleteRecipe(db, ids[0]);
    expect(await counts("2026-11-08")).toEqual([[2, "shown", 1]]);
  });

  it("is cleared by Reset everything", async () => {
    await recordEvents(db, "2026-11-08", "picked", [ids[0]]);
    await loadRecipeFiles(db, [], { reset: true });
    expect(await weekEvents(db, "2026-11-08")).toEqual([]);
  });
});
