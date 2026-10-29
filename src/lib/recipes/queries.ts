import "server-only";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db";
import { recipes, type RecipeRow } from "../db/schema";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isRecipeId(value: string): boolean {
  return UUID.test(value);
}

export async function getAllRecipes(): Promise<RecipeRow[]> {
  const db = await getDb();
  return db.select().from(recipes).orderBy(sql`lower(${recipes.title})`);
}

export async function getRecipe(id: string): Promise<RecipeRow | null> {
  if (!isRecipeId(id)) return null;
  const db = await getDb();
  const [row] = await db.select().from(recipes).where(eq(recipes.id, id));
  return row ?? null;
}
