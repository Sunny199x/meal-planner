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

/** Cuisines and make-ahead names already in use, to suggest the same spelling. */
export async function getFormSuggestions(): Promise<{ cuisines: string[]; prepNames: string[] }> {
  const db = await getDb();
  const rows = await db.select({ cuisine: recipes.cuisine, makeAhead: recipes.makeAhead }).from(recipes);
  const unique = (values: string[]) => {
    const seen = new Map<string, string>();
    for (const value of values) if (!seen.has(value.toLowerCase())) seen.set(value.toLowerCase(), value);
    return [...seen.values()].sort((a, b) => a.localeCompare(b));
  };
  return {
    cuisines: unique(rows.map((r) => r.cuisine)),
    prepNames: unique(rows.flatMap((r) => r.makeAhead.map((t) => t.name)).filter(Boolean)),
  };
}

export async function getRecipe(id: string): Promise<RecipeRow | null> {
  if (!isRecipeId(id)) return null;
  const db = await getDb();
  const [row] = await db.select().from(recipes).where(eq(recipes.id, id));
  return row ?? null;
}
