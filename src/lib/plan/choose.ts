// Adding, moving and removing dishes in the week. Pure functions, so the
// choosing screen can update instantly and the rules can be tested.
import { fitsEvening, openEvenings, type PlanRecipe } from "./suggest";
import { TIME_SLOTS, type PlannedDish, type WeekSetup } from "./types";

const TIGHTNESS = { quick: 0, normal: 1, relaxed: 2 } as const;

/**
 * The evening a new dish goes to: the tightest open evening it fits (a quick
 * dish goes to a Quick evening first), earliest in the week on a tie.
 */
export function pickEvening(
  recipe: Pick<PlanRecipe, "timeTotalMin">,
  setup: WeekSetup,
  dishes: PlannedDish[],
): number | null {
  const fitting = openEvenings({ setup, dishes, dismissed: [] }).filter((day) => fitsEvening(recipe, setup, day));
  fitting.sort((a, b) => TIGHTNESS[setup.evenings[a].time] - TIGHTNESS[setup.evenings[b].time] || a - b);
  return fitting[0] ?? null;
}

export function addDish(
  dishes: PlannedDish[],
  recipe: Pick<PlanRecipe, "id" | "timeTotalMin">,
  setup: WeekSetup,
  via: PlannedDish["via"],
  now: Date = new Date(),
): PlannedDish[] {
  if (dishes.some((d) => d.recipeId === recipe.id)) return dishes;
  return [...dishes, { recipeId: recipe.id, day: pickEvening(recipe, setup, dishes), addedAt: now.toISOString(), via }];
}

export function removeDish(dishes: PlannedDish[], recipeId: string): PlannedDish[] {
  return dishes.filter((d) => d.recipeId !== recipeId);
}

/**
 * Moves a dish to another evening; a dish already there swaps places with it.
 * An evening of leftovers that is now cooked on, or comes before its dish, is cleared.
 */
export function moveDish(dishes: PlannedDish[], recipeId: string, day: number | null): PlannedDish[] {
  const moving = dishes.find((d) => d.recipeId === recipeId);
  if (!moving) return dishes;
  return tidyRepeats(
    dishes.map((d) => {
      if (d.recipeId === recipeId) return { ...d, day };
      if (day !== null && d.day === day) return { ...d, day: moving.day };
      return d;
    }),
  );
}

/** Eat a dish again as leftovers on a later evening (null to stop). */
export function setRepeat(dishes: PlannedDish[], recipeId: string, alsoOn: number | null): PlannedDish[] {
  return tidyRepeats(
    dishes.map((d) => {
      if (d.recipeId === recipeId) return { ...d, alsoOn };
      return alsoOn !== null && d.alsoOn === alsoOn ? { ...d, alsoOn: null } : d;
    }),
  );
}

/** A repeat must come after its dish's evening, on an evening nothing is cooked. */
function tidyRepeats(dishes: PlannedDish[]): PlannedDish[] {
  const cooked = new Set(dishes.map((d) => d.day));
  const used = new Set<number>();
  return dishes.map((d) => {
    if (d.alsoOn === undefined || d.alsoOn === null) return d;
    if (d.day !== null && d.alsoOn > d.day && !cooked.has(d.alsoOn) && !used.has(d.alsoOn)) {
      used.add(d.alsoOn);
      return d;
    }
    return { ...d, alsoOn: null };
  });
}

/**
 * How long choosing took, from the first save to the last dish added: the
 * measure for "agree on the week in 10–15 minutes". Null when it can't be
 * told, or when choosing was spread over more than two hours (several sittings).
 */
export function minutesToChoose(choosingStartedAt: string | null, dishes: PlannedDish[]): number | null {
  if (!choosingStartedAt || dishes.length === 0) return null;
  const last = Math.max(...dishes.map((d) => Date.parse(d.addedAt)));
  const minutes = Math.max(1, Math.round((last - Date.parse(choosingStartedAt)) / 60000));
  return Number.isFinite(minutes) && minutes <= 120 ? minutes : null;
}

/** A dish on an evening shorter than the recipe, e.g. 45 min on a Quick evening. */
export function timeClash(recipe: Pick<PlanRecipe, "timeTotalMin">, setup: WeekSetup, day: number | null): string | null {
  if (day === null || !setup.evenings[day]?.cooking || fitsEvening(recipe, setup, day)) return null;
  const slot = TIME_SLOTS[setup.evenings[day].time];
  return `Takes ${recipe.timeTotalMin} min on a ${slot.label} evening (up to ${slot.maxMinutes} min).`;
}
