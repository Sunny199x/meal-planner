// The household grocery list (the home page): things added by hand on any day,
// plus the ingredients of this week's and next week's planned dinners. The
// dinners' ingredients and their ticks are the same ones as on Week → Shopping,
// so ticking in either place shows in both.
import { addDays, weekday } from "../plan/dates";
import { shoppingKey, shoppingSection, type Section, type ShoppingItem } from "../plan/shopping";
import type { PlannedDish, ShoppingState, WeekSetup } from "../plan/types";
import { parseIngredientLine } from "../recipes/parse-ingredient-line";

/** Something added to the list by hand. */
export type GroceryItem = { id: string; text: string; addedAt: string; bought: boolean };

/** A planned week whose dinners feed the list. */
export type GroceryWeek = { weekStart: string; setup: WeekSetup; dishes: PlannedDish[]; shopping: ShoppingState };

export type GroceryListData = { today: string; items: GroceryItem[]; weeks: GroceryWeek[] };

/** The weeks whose dinners are on the list: the week we're in and the next one. */
export function listWeeks(today: string): { thisWeek: string; nextWeek: string } {
  const thisWeek = addDays(today, -weekday(today));
  return { thisWeek, nextWeek: addDays(thisWeek, 7) };
}

/**
 * A week's items that are still worth buying: all of next week's, and of this
 * week's only those needed for tonight's dinner or later ones (or a dish not on
 * an evening yet). Amounts stay the whole week's, so ticks match Week → Shopping.
 */
export function stillNeeded(items: ShoppingItem[], weekStart: string, today: string): ShoppingItem[] {
  if (weekStart !== listWeeks(today).thisWeek) return items;
  const tonight = weekday(today);
  return items.filter((item) => item.sources.some((s) => s.day === null || s.day >= tonight));
}

/** The supermarket section for something typed by hand ("2 l milk" → dairy). */
export function grocerySection(text: string): Section {
  const parsed = parseIngredientLine(text);
  const { key, unit } = shoppingKey({ name: parsed.name || text, unit: parsed.unit });
  const section = shoppingSection(key, unit);
  return section === "Check the cupboard" ? "Other" : section;
}
