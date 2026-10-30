// A check of the recipe collection for things that stop the suggestion rules
// from working well: no make-ahead tasks (so no shared prep), ingredient lines
// the app couldn't read, missing cuisine or main protein, seafood, and
// make-ahead tasks that are probably the same but named differently.
import { prepKey } from "../plan/ingredients";
import { taskWords } from "../plan/prep";
import type { RecipeRow } from "../db/schema";
import { parseIngredientLine } from "./parse-ingredient-line";
import { checkRecipeForSeafood } from "./seafood";

type Recipe = Pick<RecipeRow, "id" | "title" | "origin" | "isTemplate" | "cuisine" | "mainProtein" | "ingredients" | "makeAhead">;

export type RecipeIssues = { id: string; title: string; fromFile: boolean; issues: string[] };
export type SimilarTasks = { names: { name: string; recipes: { id: string; title: string }[] }[] };

export function checkRecipes(recipes: Recipe[]): { recipes: RecipeIssues[]; similarTasks: SimilarTasks[] } {
  const withIssues = recipes.flatMap((recipe) => {
    const issues: string[] = [];
    const parsed = recipe.ingredients.map((i) => parseIngredientLine(i.line));
    const unread = parsed.filter((p) => p.problems.length > 0).map((p) => `“${p.line}”`);
    if (recipe.makeAhead.length === 0) issues.push("No make-ahead tasks, so it can never share prep with another dish.");
    if (unread.length) issues.push(`Lines the app couldn't fully read: ${unread.join(", ")}.`);
    if (!recipe.cuisine.trim()) issues.push("No cuisine, so the variety rules can't use it.");
    if (!recipe.mainProtein?.trim()) issues.push("No main protein, so the variety rules can't use it.");
    if (checkRecipeForSeafood({ title: recipe.title, ingredients: parsed }).some((f) => f.level === "contains")) {
      issues.push("Contains seafood, so it is never suggested.");
    }
    if (recipe.isTemplate) issues.push("An illustrative example, not one of your own recipes.");
    return issues.length ? [{ id: recipe.id, title: recipe.title, fromFile: recipe.origin === "file", issues }] : [];
  });

  // Tasks whose names differ but work on the same things ("Cook rice" / "Make rice").
  const groups = new Map<string, Map<string, { name: string; recipes: { id: string; title: string }[] }>>();
  for (const recipe of recipes) {
    for (const task of recipe.makeAhead) {
      const content = [...new Set(taskWords(task.name).flat())].sort().join(" ");
      if (!content) continue;
      const byName = groups.get(content) ?? new Map();
      const entry = byName.get(prepKey(task.name)) ?? { name: task.name, recipes: [] };
      entry.recipes.push({ id: recipe.id, title: recipe.title });
      byName.set(prepKey(task.name), entry);
      groups.set(content, byName);
    }
  }
  const similarTasks = [...groups.values()]
    .filter((byName) => byName.size > 1)
    .map((byName) => ({ names: [...byName.values()].sort((a, b) => b.recipes.length - a.recipes.length) }));

  return { recipes: withIssues, similarTasks };
}
