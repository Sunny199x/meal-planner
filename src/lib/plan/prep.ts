// The Sunday prep list: the make-ahead tasks of the week's dishes, with the
// same task in several dishes merged into one batch (matched by name, as the
// recipe files write them), and for each evening what is left to do then:
// what was done on Sunday, leftovers, lunch boxes to pack, portions to freeze.
// Nothing here says how long prepared food keeps.
import { scaleLine } from "../recipes/scale";
import { ingredientKey, prepKey } from "./ingredients";
import type { DishPortions } from "./portions";
import { shoppingKey, shoppingSection } from "./shopping";
import type { PlanRecipe } from "./suggest";
import type { PlannedDish, WeekSetup } from "./types";

type Recipe = Pick<PlanRecipe, "id" | "title" | "servings" | "timeTotalMin" | "ingredients" | "makeAhead">;

export type PrepTask = {
  key: string;
  name: string;
  dishes: { recipeId: string; title: string; day: number | null; portions: number; description: string }[];
  /** For a shared task: the ingredient lines it works on, scaled per dish ("410 g basmati rice"). */
  amounts: { recipeId: string; day: number | null; line: string }[];
};

/** Words in task names that say what to do rather than what with. */
const VERBS = new Set([
  "cook", "make", "prep", "prepare", "chop", "slice", "dice", "cut", "wash", "peel", "grate", "deseed", "pickle",
  "pickled", "marinate", "mix", "toast", "roast", "boil", "bake", "blend", "whisk", "quick", "the", "and", "for",
  "with", "fry", "base",
]);

/** "Cut potato fries" → ["fry", "potato"]: what the task works on, main word first. */
function taskWords(name: string): string[][] {
  return name
    .split(/\band\b|,/i)
    .map((part) => ingredientKey(part.replace(/-/g, " ")).split(" ").filter((w) => w.length >= 3 && !VERBS.has(w)).reverse())
    .filter((words) => words.length > 0);
}

/** The ingredient lines a task works on: per part of its name, the main word that any line mentions. */
function amountsFor(name: string, dishes: { recipe: Recipe; day: number | null; factor: number }[]) {
  const lines = dishes.flatMap(({ recipe, day, factor }) =>
    recipe.ingredients
      .filter((item) => shoppingSection(shoppingKey(item).key, item.unit) !== "Check the cupboard")
      .map((item) => ({ recipeId: recipe.id, day, words: ingredientKey(item.name).split(" "), line: scaleLine(item, factor).text })),
  );
  const found = new Set<(typeof lines)[number]>();
  for (const words of taskWords(name)) {
    const word = words.find((w) => lines.some((l) => l.words.includes(w)));
    if (word) lines.filter((l) => l.words.includes(word)).forEach((l) => found.add(l));
  }
  return lines.filter((l) => found.has(l)).map(({ recipeId, day, line }) => ({ recipeId, day, line }));
}

export function buildPrepList(
  dishes: PlannedDish[],
  recipes: Map<string, Recipe>,
  portions: Map<string, DishPortions>,
): PrepTask[] {
  const tasks = new Map<string, PrepTask & { cooks: { recipe: Recipe; day: number | null; factor: number }[] }>();
  const ordered = [...dishes].sort((a, b) => (a.day ?? 7) - (b.day ?? 7));
  for (const dish of ordered) {
    const recipe = recipes.get(dish.recipeId);
    const total = portions.get(dish.recipeId)?.total;
    if (!recipe || !total) continue;
    for (const task of recipe.makeAhead) {
      const key = prepKey(task.name);
      const entry = tasks.get(key) ?? { key, name: task.name, dishes: [], amounts: [], cooks: [] };
      entry.dishes.push({ recipeId: recipe.id, title: recipe.title, day: dish.day, portions: total, description: task.description });
      entry.cooks.push({ recipe, day: dish.day, factor: total / recipe.servings });
      tasks.set(key, entry);
    }
  }
  return [...tasks.values()]
    .map(({ cooks, ...task }) => ({ ...task, amounts: task.dishes.length > 1 ? amountsFor(task.name, cooks) : [] }))
    .sort((a, b) => b.dishes.length - a.dishes.length || (a.dishes[0].day ?? 7) - (b.dishes[0].day ?? 7));
}

export type EveningPlan = {
  day: number;
  /** The dish cooked tonight, if any. */
  cook: { recipeId: string; title: string; timeTotalMin: number; portions: number; prepped: string[] } | null;
  /** A dish eaten again tonight, cooked on an earlier evening. */
  leftovers: { recipeId: string; title: string; cookedOn: number } | null;
  /** Lunch boxes to pack from tonight's dish, per person. */
  lunchBoxes: { name: string; count: number }[];
  freezer: number;
};

/** What each cooking evening holds once Sunday's prep is done. */
export function eveningPlans(
  setup: WeekSetup,
  dishes: PlannedDish[],
  recipes: Map<string, Recipe>,
  portions: Map<string, DishPortions>,
): EveningPlan[] {
  return setup.evenings.flatMap((evening, day) => {
    if (!evening.cooking) return [];
    const dish = dishes.find((d) => d.day === day && recipes.has(d.recipeId));
    const repeat = dishes.find((d) => d.alsoOn === day && d.day !== null && recipes.has(d.recipeId));
    const recipe = dish ? recipes.get(dish.recipeId)! : null;
    const dishPortions = dish ? portions.get(dish.recipeId) : undefined;
    return [
      {
        day,
        cook:
          recipe && dishPortions
            ? {
                recipeId: recipe.id,
                title: recipe.title,
                timeTotalMin: recipe.timeTotalMin,
                portions: dishPortions.total,
                prepped: recipe.makeAhead.map((t) => t.name),
              }
            : null,
        leftovers: repeat ? { recipeId: repeat.recipeId, title: recipes.get(repeat.recipeId)!.title, cookedOn: repeat.day! } : null,
        lunchBoxes: (dishPortions?.lunchBoxes ?? []).flatMap((count, i) => (count > 0 ? [{ name: setup.people[i].name, count }] : [])),
        freezer: dishPortions?.freezer ?? 0,
      },
    ];
  });
}
