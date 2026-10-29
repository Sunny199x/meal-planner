// How much of each chosen dish to cook: dinner for everyone, a repeat dinner of
// leftovers, the lunch boxes it provides and any portions for the freezer.
// A lunch box is the size of that person's dinner. Lunch boxes are shared out
// automatically over dishes that are good as leftovers, earliest in the week
// first, unless a dish has been given its own numbers.
import type { PlanRecipe } from "./suggest";
import { MAX_FREEZER, type PlannedDish, type WeekSetup } from "./types";

export type DishPortions = {
  /** Dinner for everyone on the dish's evening. */
  dinner: number;
  /** Dinner for everyone again, from leftovers; 0 without a repeat. */
  repeat: number;
  /** Lunch boxes per person, in the setup's order. */
  lunchBoxes: number[];
  /** The lunch boxes in portions. */
  lunch: number;
  freezer: number;
  /** Portions to cook. */
  total: number;
};

type RecipeInfo = Pick<PlanRecipe, "goodAsLeftovers">;

export function dinnerPortions(setup: WeekSetup): number {
  return setup.people.reduce((sum, p) => sum + p.dinnerPortion, 0);
}

/** Lunch boxes per person for every chosen dish, shared out where a dish has no numbers of its own. */
function shareLunches(setup: WeekSetup, dishes: PlannedDish[], recipes: Map<string, RecipeInfo>): Map<string, number[]> {
  const boxes = new Map(dishes.map((d) => [d.recipeId, setup.people.map((_, i) => d.lunches?.[i] ?? 0)]));
  const automatic = dishes
    .filter((d) => !d.lunches && recipes.get(d.recipeId)?.goodAsLeftovers)
    .sort((a, b) => (a.day ?? 7) - (b.day ?? 7));
  setup.people.forEach((person, i) => {
    const fixed = dishes.reduce((sum, d) => sum + (d.lunches?.[i] ?? 0), 0);
    for (let n = 0; n < person.lunches - fixed && automatic.length; n++) {
      boxes.get(automatic[n % automatic.length].recipeId)![i]++;
    }
  });
  return boxes;
}

export function planPortions(
  setup: WeekSetup,
  dishes: PlannedDish[],
  recipes: Map<string, RecipeInfo>,
): Map<string, DishPortions> {
  const perDinner = dinnerPortions(setup);
  const lunches = shareLunches(setup, dishes, recipes);
  return new Map(
    dishes.map((d) => {
      const lunchBoxes = lunches.get(d.recipeId)!;
      const lunch = lunchBoxes.reduce((sum, n, i) => sum + n * setup.people[i].dinnerPortion, 0);
      const repeat = d.alsoOn != null && setup.evenings[d.alsoOn]?.cooking ? perDinner : 0;
      const freezer = d.freezer ?? 0;
      return [d.recipeId, { dinner: perDinner, repeat, lunchBoxes, lunch, freezer, total: perDinner + repeat + lunch + freezer }];
    }),
  );
}

/** Lunch boxes needed and planned, per person who takes any. */
export function lunchStatus(setup: WeekSetup, portions: Map<string, DishPortions>) {
  return setup.people.flatMap((person, i) => {
    const planned = [...portions.values()].reduce((sum, p) => sum + p.lunchBoxes[i], 0);
    return person.lunches > 0 || planned > 0 ? [{ name: person.name, needed: person.lunches, planned }] : [];
  });
}

/**
 * One more or one fewer lunch box for a person from this dish. The dish keeps
 * its numbers from then on; dishes still shared out automatically make up the
 * difference, so moving a box from one dish to another is one tap.
 */
export function changeLunchBoxes(
  dishes: PlannedDish[],
  portions: Map<string, DishPortions>,
  recipeId: string,
  person: number,
  change: 1 | -1,
): PlannedDish[] {
  return dishes.map((d) => {
    if (d.recipeId !== recipeId) return d;
    const lunches = [...(portions.get(recipeId)?.lunchBoxes ?? [])];
    lunches[person] = Math.min(14, Math.max(0, (lunches[person] ?? 0) + change));
    return { ...d, lunches };
  });
}

/** Back to sharing all lunch boxes out automatically. */
export function shareLunchesAutomatically(dishes: PlannedDish[]): PlannedDish[] {
  return dishes.map((d) => {
    const copy = { ...d };
    delete copy.lunches;
    return copy;
  });
}

export function changeFreezer(dishes: PlannedDish[], recipeId: string, change: 1 | -1): PlannedDish[] {
  return dishes.map((d) =>
    d.recipeId === recipeId ? { ...d, freezer: Math.min(MAX_FREEZER, Math.max(0, (d.freezer ?? 0) + change)) } : d,
  );
}
