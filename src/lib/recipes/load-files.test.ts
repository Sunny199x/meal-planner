import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openLocalDb } from "../db/local";
import { groceryItems, likedCombinations, prepLimits, recipes, weekPlans } from "../db/schema";
import { DEFAULT_SETUP } from "../plan/types";
import type { Db } from "../db/types";
import { loadRecipeFiles } from "./load-files";

function recipeFile(title: string, extraIngredient = "") {
  return [
    "---",
    `title: ${title}`,
    "source: Own recipe",
    "servings: 2",
    "time_total_min: 20",
    "cuisine: Indian",
    "diet: vegetarian",
    "freezer_friendly: false",
    "good_as_leftovers: true",
    "---",
    "",
    "## Ingredients",
    "",
    "- 1 onion",
    extraIngredient,
    "",
    "## Instructions",
    "",
    "1. Cook.",
  ].join("\n");
}

const daal = { fileName: "daal.md", text: recipeFile("Daal") };
const tacos = { fileName: "tacos.md", text: recipeFile("Tacos") };

let db: Db;
beforeEach(async () => {
  db = await openLocalDb("memory://");
});

async function titles() {
  const rows = await db.select({ title: recipes.title }).from(recipes).orderBy(recipes.title);
  return rows.map((r) => r.title);
}

describe("loadRecipeFiles", () => {
  it("adds new recipes", async () => {
    const report = await loadRecipeFiles(db, [daal, tacos]);
    expect(report.files.map((f) => [f.fileName, f.status])).toEqual([
      ["daal.md", "added"],
      ["tacos.md", "added"],
    ]);
    expect(report.totalRecipes).toBe(2);
    const [row] = await db.select().from(recipes).where(eq(recipes.fileSlug, "daal"));
    expect(row).toMatchObject({ origin: "file", title: "Daal", servings: 2, editedInApp: false });
    expect(row.ingredients).toEqual([{ line: "1 onion", group: null }]);
  });

  it("updates recipes and keeps favourites", async () => {
    await loadRecipeFiles(db, [daal]);
    await db.update(recipes).set({ isFavourite: true }).where(eq(recipes.fileSlug, "daal"));

    const changed = { fileName: "daal.md", text: recipeFile("Daal", "- 100 g spinach") };
    const report = await loadRecipeFiles(db, [changed]);

    expect(report.files[0].status).toBe("updated");
    const [row] = await db.select().from(recipes);
    expect(row.isFavourite).toBe(true);
    expect(row.ingredients.map((i) => i.line)).toEqual(["1 onion", "100 g spinach"]);
  });

  it("leaves recipes edited in the app alone", async () => {
    await loadRecipeFiles(db, [daal]);
    await db
      .update(recipes)
      .set({ editedInApp: true, title: "Our daal" })
      .where(eq(recipes.fileSlug, "daal"));

    const report = await loadRecipeFiles(db, [{ fileName: "daal.md", text: recipeFile("Daal v2") }]);

    expect(report.files[0]).toMatchObject({ status: "skipped-edited", title: "Our daal" });
    expect(await titles()).toEqual(["Our daal"]);
  });

  it("removes recipes whose file was deleted, but keeps edited ones as app recipes", async () => {
    await loadRecipeFiles(db, [daal, tacos]);
    await db.update(recipes).set({ editedInApp: true }).where(eq(recipes.fileSlug, "tacos"));

    const report = await loadRecipeFiles(db, []);

    expect(report.removed).toEqual(["Daal"]);
    expect(report.keptAsAppRecipes).toEqual(["Tacos"]);
    const rows = await db.select().from(recipes);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ title: "Tacos", origin: "app", fileSlug: null });
  });

  it("keeps the previous version when a file can no longer be read", async () => {
    await loadRecipeFiles(db, [daal]);
    const broken = { fileName: "daal.md", text: "---\ntitle: Daal\n---\n" };

    const report = await loadRecipeFiles(db, [broken]);

    expect(report.files[0]).toMatchObject({ status: "not-loaded", title: "Daal" });
    expect(report.files[0].problems.some((p) => p.level === "error")).toBe(true);
    expect(report.removed).toEqual([]);
    expect(await titles()).toEqual(["Daal"]);
  });

  it("never touches recipes added in the app", async () => {
    await db.insert(recipes).values({
      origin: "app",
      title: "Pasta",
      source: "Own recipe",
      servings: 2,
      timeTotalMin: 15,
      cuisine: "Italian",
      diet: "vegetarian",
      freezerFriendly: false,
      goodAsLeftovers: false,
      ingredients: [],
      instructions: [],
      makeAhead: [],
    });
    await loadRecipeFiles(db, [daal]);
    await loadRecipeFiles(db, []);
    expect(await titles()).toEqual(["Pasta"]);
  });

  it("reset wipes everything, including favourites and app recipes, then reloads", async () => {
    await loadRecipeFiles(db, [daal]);
    await db.update(recipes).set({ isFavourite: true });
    await db.update(recipes).set({ editedInApp: true, title: "Our daal" });

    const report = await loadRecipeFiles(db, [daal, tacos], { reset: true });

    expect(report.files.map((f) => f.status)).toEqual(["added", "added"]);
    const rows = await db.select().from(recipes).orderBy(recipes.title);
    expect(rows.map((r) => [r.title, r.isFavourite])).toEqual([
      ["Daal", false],
      ["Tacos", false],
    ]);
  });

  it("keeps a recipe's status in the weekly suggestions when the files are loaded again", async () => {
    await loadRecipeFiles(db, [daal]);
    expect((await db.select().from(recipes))[0].status).toBe("rotation");
    await db.update(recipes).set({ status: "excluded" });
    await loadRecipeFiles(db, [daal]);
    expect((await db.select().from(recipes))[0].status).toBe("excluded");
  });

  it("reset also clears planned weeks and liked combinations, but keeps the grocery list and prep limits", async () => {
    await loadRecipeFiles(db, [daal]);
    const [recipe] = await db.select().from(recipes);
    await db.insert(weekPlans).values({
      weekStart: "2026-11-08",
      setup: DEFAULT_SETUP,
      dishes: [{ recipeId: recipe.id, day: 1, addedAt: "2026-11-02T10:00:00.000Z", via: "start" }],
    });
    await db.insert(likedCombinations).values({ recipeIds: [recipe.id, recipe.id] });
    await db.insert(groceryItems).values({ text: "milk" });
    await db.insert(prepLimits).values({ key: "pickle onion", name: "Pickle onions", days: 3 });

    await loadRecipeFiles(db, [], { reset: true });

    expect(await db.select().from(recipes)).toEqual([]);
    expect(await db.select().from(weekPlans)).toEqual([]);
    expect(await db.select().from(likedCombinations)).toEqual([]);
    expect((await db.select().from(groceryItems)).map((g) => g.text)).toEqual(["milk"]);
    expect(await db.select().from(prepLimits)).toHaveLength(1);
  });

  it("loads the real template files", async () => {
    const { readTemplateFixtures } = await import("./test-fixtures");
    const report = await loadRecipeFiles(db, await readTemplateFixtures());
    expect(report.files.every((f) => f.status === "added" && f.problems.length === 0)).toBe(true);
    const rows = await db.select().from(recipes);
    expect(rows.every((r) => r.isTemplate)).toBe(true);
  });
});
