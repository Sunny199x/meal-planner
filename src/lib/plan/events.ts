// Recording what the choosing screen showed, hid and picked (see
// suggestionEvents in the schema). Nothing reads this yet in the app: it is
// collected from the first week of real use for a later recipe review.
import { eq, inArray, sql } from "drizzle-orm";
import { recipes, suggestionEvents, type SuggestionEventKind } from "../db/schema";
import type { Db } from "../db/types";

/** Counts one more of `kind` for each recipe in the week. Recipes that no longer exist are skipped. */
export async function recordEvents(db: Db, weekStart: string, kind: SuggestionEventKind, recipeIds: string[]): Promise<number> {
  const unique = [...new Set(recipeIds)];
  if (unique.length === 0) return 0;
  const existing = await db.select({ id: recipes.id }).from(recipes).where(inArray(recipes.id, unique));
  if (existing.length === 0) return 0;
  await db
    .insert(suggestionEvents)
    .values(existing.map(({ id }) => ({ weekStart, recipeId: id, kind })))
    .onConflictDoUpdate({
      target: [suggestionEvents.weekStart, suggestionEvents.recipeId, suggestionEvents.kind],
      set: { count: sql`${suggestionEvents.count} + 1`, lastAt: sql`now()` },
    });
  return existing.length;
}

/** The events of one week, for tests and a later review screen. */
export function weekEvents(db: Db, weekStart: string) {
  return db
    .select()
    .from(suggestionEvents)
    .where(eq(suggestionEvents.weekStart, weekStart));
}
