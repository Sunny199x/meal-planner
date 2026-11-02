// Past weeks: the dinners of earlier weeks, and repeating one in the week
// being planned. Pure functions, so the rules can be tested.
import { addDays, weekday } from "./dates";
import { pickEvening } from "./choose";
import { isOldWeek, weekFromOldWeeks, type SavedWeekData } from "./old-weeks";
import type { PlanRecipe } from "./suggest";
import type { PlannedDish, WeekSetup } from "./types";

/** An earlier week's dinners, named by its Sunday. */
export type PastWeek = { weekStart: string; dishes: PlannedDish[] };

type SavedRow = SavedWeekData & { weekStart: string };

/**
 * The weeks before `before` that have dinners, newest first. Weeks saved the
 * old way (Monday to Sunday) and never opened since are read as Sunday weeks,
 * the same way opening them would, but nothing is saved here.
 */
export function pastWeeks(rows: SavedRow[], before: string): PastWeek[] {
  const byStart = new Map(rows.map((row) => [row.weekStart, row]));
  const sundays = new Set<string>();
  for (const row of rows) {
    if (weekday(row.weekStart) === 0) sundays.add(row.weekStart);
    else if (isOldWeek(row.weekStart)) {
      // A Monday week holds Monday to Saturday of the Sunday before it, and the Sunday at its end.
      sundays.add(addDays(row.weekStart, -1));
      sundays.add(addDays(row.weekStart, 6));
    }
  }
  const weeks: PastWeek[] = [];
  for (const sunday of sundays) {
    if (sunday >= before) continue;
    const week =
      byStart.get(sunday) ??
      weekFromOldWeeks(byStart.get(addDays(sunday, 1)) ?? null, byStart.get(addDays(sunday, -6)) ?? null);
    if (week && week.dishes.length > 0) weeks.push({ weekStart: sunday, dishes: week.dishes });
  }
  return weeks.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
}

/**
 * Dinners from the two weeks before `weekStart`, by recipe: 1 = the week
 * before, 2 = two weeks before (the more recent counts). Dishes never put on an
 * evening are left out, since they weren't eaten.
 */
export function recentDinners(weeks: PastWeek[], weekStart: string): Record<string, 1 | 2> {
  const recent: Record<string, 1 | 2> = {};
  for (const ago of [2, 1] as const) {
    const week = weeks.find((w) => w.weekStart === addDays(weekStart, -7 * ago));
    for (const dish of week?.dishes ?? []) if (dish.day !== null) recent[dish.recipeId] = ago;
  }
  return recent;
}

type RepeatRecipe = Pick<PlanRecipe, "id" | "timeTotalMin" | "seafood">;

export type Repeated = {
  dishes: PlannedDish[];
  /** Recipes added to the week. */
  added: string[];
  /** Recipes that found no free evening. */
  noRoom: string[];
};

/**
 * Adds an earlier week's dinners to this week. Each goes on the same evening
 * when that evening is cooked on and still free, and is eaten again as
 * leftovers on the same later evening when that is free too. Dinners whose
 * evening is taken go on the earliest free evening they fit. Dinners already
 * chosen stay as they are. Deleted recipes, recipes now marked as containing
 * seafood and recipes already in the week are left out. Lunch boxes and
 * freezer portions are not copied: they are worked out afresh.
 */
export function repeatWeek(
  dishes: PlannedDish[],
  past: PlannedDish[],
  setup: WeekSetup,
  recipes: Map<string, RepeatRecipe>,
  now: Date = new Date(),
): Repeated {
  const addedAt = now.toISOString();
  const result = [...dishes];
  const inWeek = new Set(dishes.map((d) => d.recipeId));
  const free = (day: number) =>
    setup.evenings[day]?.cooking === true && !result.some((d) => d.day === day || d.alsoOn === day);
  const candidates = past
    .filter((d) => {
      const recipe = recipes.get(d.recipeId);
      return recipe && recipe.seafood !== "contains" && !inWeek.has(d.recipeId);
    })
    .sort((a, b) => (a.day ?? 7) - (b.day ?? 7));

  // 1. Each dinner on its own evening, where that evening is free.
  const sameEvening: PlannedDish[] = [];
  const elsewhere: PlannedDish[] = [];
  for (const dish of candidates) {
    if (dish.day !== null && free(dish.day)) {
      result.push({ recipeId: dish.recipeId, day: dish.day, addedAt, via: "repeat" });
      sameEvening.push(dish);
    } else {
      elsewhere.push(dish);
    }
  }
  // 2. Its leftovers evening, before other dinners take that evening.
  for (const dish of sameEvening) {
    const day = dish.alsoOn;
    if (day == null || dish.day === null || day <= dish.day || !free(day)) continue;
    const index = result.findIndex((d) => d.recipeId === dish.recipeId);
    result[index] = { ...result[index], alsoOn: day };
  }
  // 3. The rest on the earliest free evening they fit.
  const noRoom: string[] = [];
  for (const dish of elsewhere) {
    const day = pickEvening(recipes.get(dish.recipeId)!, setup, result);
    if (day === null) noRoom.push(dish.recipeId);
    else result.push({ recipeId: dish.recipeId, day, addedAt, via: "repeat" });
  }
  return {
    dishes: result,
    added: result.slice(dishes.length).map((d) => d.recipeId),
    noRoom,
  };
}
