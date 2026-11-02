import { eq } from "drizzle-orm";
import { beforeEach, describe, expect, it } from "vitest";
import { openLocalDb } from "../db/local";
import { recipes } from "../db/schema";
import type { Db } from "../db/types";
import { parseRecipeForm, recipeToFormValues, EMPTY_FORM } from "./form";
import { parseRecipeFile } from "./parse-recipe-file";
import { loadRecipeFiles } from "./load-files";
import { readTemplateFixtures } from "./test-fixtures";
import { deleteRecipe, insertRecipe, setRecipeStatus, updateRecipe } from "./save";

const pasta = parseRecipeForm({
  ...EMPTY_FORM,
  title: "Pasta",
  source: "Own recipe",
  servings: "2",
  timeTotalMin: "20",
  cuisine: "Italian",
  diet: "vegetarian",
  ingredients: "200 g spaghetti",
}).recipe!;

let db: Db;
beforeEach(async () => {
  db = await openLocalDb("memory://");
});

describe("saving recipes from the app", () => {
  it("adds an app recipe", async () => {
    const id = await insertRecipe(db, pasta);
    const [row] = await db.select().from(recipes).where(eq(recipes.id, id));
    expect(row).toMatchObject({ title: "Pasta", origin: "app", fileSlug: null, editedInApp: false, isTemplate: false });
  });

  it("updates an app recipe without marking it as edited from a file", async () => {
    const id = await insertRecipe(db, pasta);
    expect(await updateRecipe(db, id, { ...pasta, title: "Pasta al limone" })).toBe(true);
    const [row] = await db.select().from(recipes).where(eq(recipes.id, id));
    expect(row).toMatchObject({ title: "Pasta al limone", origin: "app", editedInApp: false });
  });

  it("protects edits to a file recipe from the next file load, and keeps it marked as a template", async () => {
    await loadRecipeFiles(db, await readTemplateFixtures());
    const [daal] = await db.select().from(recipes).where(eq(recipes.fileSlug, "_template-tadka-daal"));

    const form = recipeToFormValues({ ...daal, isTemplate: daal.isTemplate });
    const edited = parseRecipeForm({ ...form, title: "Our tadka daal" }).recipe!;
    await updateRecipe(db, daal.id, edited);

    const report = await loadRecipeFiles(db, await readTemplateFixtures());
    expect(report.files.find((f) => f.fileName === "_template-tadka-daal.md")?.status).toBe("skipped-edited");
    const [after] = await db.select().from(recipes).where(eq(recipes.id, daal.id));
    expect(after).toMatchObject({ title: "Our tadka daal", editedInApp: true, isTemplate: true, origin: "file" });
  });

  it("reports when the recipe to update no longer exists", async () => {
    expect(await updateRecipe(db, "00000000-0000-0000-0000-000000000000", pasta)).toBe(false);
  });

  it("deletes a recipe", async () => {
    const id = await insertRecipe(db, pasta);
    await deleteRecipe(db, id);
    expect(await db.select().from(recipes)).toEqual([]);
  });
});

describe("recipe statuses", () => {
  it("adds recipes to the rotation unless told otherwise, and changes several at once", async () => {
    const db: Db = await openLocalDb("memory://");
    const [file] = await readTemplateFixtures();
    const content = parseRecipeFile(file.fileName, file.text).recipe!;
    const typed = await insertRecipe(db, content);
    const imported = await insertRecipe(db, { ...content, title: "Imported" }, "trial");
    const status = async () => (await db.select().from(recipes).orderBy(recipes.title)).map((r) => [r.title, r.status]);
    expect(await status()).toEqual([
      [content.title, "rotation"],
      ["Imported", "trial"],
    ]);
    expect(await setRecipeStatus(db, [typed, imported], "excluded")).toBe(2);
    // Editing keeps the status unless the form sends one.
    await updateRecipe(db, typed, content);
    await updateRecipe(db, imported, { ...content, title: "Imported" }, "rotation");
    expect(await status()).toEqual([
      [content.title, "excluded"],
      ["Imported", "rotation"],
    ]);
  });
});
