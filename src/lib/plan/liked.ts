// Combinations the household liked: two or three dishes from a week that went
// well together. Their own judgement, shown apart from the suggestion rules.
import type { PlanRecipe } from "./suggest";

export const LIKED_MIN = 2;
export const LIKED_MAX = 3;

export type LikedCombination = {
  id: string;
  recipeIds: string[];
  /** The week they were picked from, if any. */
  weekStart: string | null;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Checks recipe ids sent from the browser: two or three different recipes. Returns them sorted, or null. */
export function readLikedIds(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length < LIKED_MIN || input.length > LIKED_MAX) return null;
  if (!input.every((id) => typeof id === "string" && UUID.test(id))) return null;
  const ids = (input as string[]).map((id) => id.toLowerCase());
  return new Set(ids).size === ids.length ? [...ids].sort() : null;
}

/** Whether two lists hold the same recipes, in any order. */
export function sameRecipes(a: string[], b: string[]): boolean {
  return a.length === b.length && a.every((id) => b.includes(id));
}

/**
 * The combinations that can still be used: their recipes that still exist and
 * don't contain seafood, kept only while at least two are left.
 */
export function usableCombinations(
  combinations: LikedCombination[],
  recipes: Map<string, Pick<PlanRecipe, "id" | "seafood">>,
): LikedCombination[] {
  return combinations.flatMap((combination) => {
    const recipeIds = combination.recipeIds.filter((id) => {
      const recipe = recipes.get(id);
      return recipe && recipe.seafood !== "contains";
    });
    return recipeIds.length >= LIKED_MIN ? [{ ...combination, recipeIds }] : [];
  });
}
