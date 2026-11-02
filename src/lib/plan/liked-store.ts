// Reading and saving the household's liked combinations.
import { desc, eq } from "drizzle-orm";
import { likedCombinations } from "../db/schema";
import type { Db } from "../db/types";
import { sameRecipes, type LikedCombination } from "./liked";

/** Newest first. */
export async function getLikedCombinations(db: Db): Promise<LikedCombination[]> {
  return db
    .select({ id: likedCombinations.id, recipeIds: likedCombinations.recipeIds, weekStart: likedCombinations.weekStart })
    .from(likedCombinations)
    .orderBy(desc(likedCombinations.createdAt));
}

/** Saves a combination; the same recipes saved again are kept once. Returns the full list. */
export async function saveLikedCombination(db: Db, recipeIds: string[], weekStart: string | null): Promise<LikedCombination[]> {
  const existing = await getLikedCombinations(db);
  if (existing.some((c) => sameRecipes(c.recipeIds, recipeIds))) return existing;
  await db.insert(likedCombinations).values({ recipeIds, weekStart });
  return getLikedCombinations(db);
}

export async function forgetLikedCombination(db: Db, id: string): Promise<LikedCombination[]> {
  await db.delete(likedCombinations).where(eq(likedCombinations.id, id));
  return getLikedCombinations(db);
}
