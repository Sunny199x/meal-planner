// Saving recipes from the add/edit form. Each save is a single write.
import { eq, inArray, sql } from "drizzle-orm";
import { recipes } from "../db/schema";
import type { Db } from "../db/types";
import type { RecipeContent, RecipeStatus } from "./types";

export async function insertRecipe(db: Db, content: RecipeContent, status: RecipeStatus = "rotation"): Promise<string> {
  const [row] = await db
    .insert(recipes)
    .values({ ...content, status, origin: "app", isTemplate: false })
    .returning({ id: recipes.id });
  return row.id;
}

/**
 * Updates a recipe. A recipe that came from a file is marked "edited in the
 * app", so "Load recipes from files" won't overwrite the changes. Whether it is
 * an illustrative template stays as it was.
 */
export async function updateRecipe(
  db: Db,
  id: string,
  content: RecipeContent,
  status: RecipeStatus | null = null,
): Promise<boolean> {
  const changes: Partial<RecipeContent> = { ...content };
  delete changes.isTemplate;
  const updated = await db
    .update(recipes)
    .set({
      ...changes,
      ...(status ? { status } : {}),
      editedInApp: sql`${recipes.origin} = 'file'`,
      updatedAt: sql`now()`,
    })
    .where(eq(recipes.id, id))
    .returning({ id: recipes.id });
  return updated.length > 0;
}

export async function deleteRecipe(db: Db, id: string): Promise<void> {
  await db.delete(recipes).where(eq(recipes.id, id));
}

/** Moves recipes into the rotation, the trial lane or out of the suggestions. Returns how many changed. */
export async function setRecipeStatus(db: Db, ids: string[], status: RecipeStatus): Promise<number> {
  if (ids.length === 0) return 0;
  const updated = await db.update(recipes).set({ status }).where(inArray(recipes.id, ids)).returning({ id: recipes.id });
  return updated.length;
}
