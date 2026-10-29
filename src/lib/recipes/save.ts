// Saving recipes from the add/edit form. Each save is a single write.
import { eq, sql } from "drizzle-orm";
import { recipes } from "../db/schema";
import type { Db } from "../db/types";
import type { RecipeContent } from "./types";

export async function insertRecipe(db: Db, content: RecipeContent): Promise<string> {
  const [row] = await db
    .insert(recipes)
    .values({ ...content, origin: "app", isTemplate: false })
    .returning({ id: recipes.id });
  return row.id;
}

/**
 * Updates a recipe. A recipe that came from a file is marked "edited in the
 * app", so "Load recipes from files" won't overwrite the changes. Whether it is
 * an illustrative template stays as it was.
 */
export async function updateRecipe(db: Db, id: string, content: RecipeContent): Promise<boolean> {
  const changes: Partial<RecipeContent> = { ...content };
  delete changes.isTemplate;
  const updated = await db
    .update(recipes)
    .set({
      ...changes,
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
