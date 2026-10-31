// Weeks saved before 31 October 2026 ran Monday to Sunday: they are named by
// their Monday, and their day 0 is Monday. Weeks now run Sunday to Saturday.
// The first time a Sunday week is opened, it is built from the Monday weeks it
// overlaps: Monday to Saturday from the week starting the day after, and the
// Sunday from the end of the week before. The Monday weeks are only read, never
// changed, so nothing saved earlier is lost.
import { addDays, weekday } from "./dates";
import type { PlannedDish, PrepState, ShoppingState, WeekSetup } from "./types";

/** What a saved week holds, old or new. */
export type SavedWeekData = {
  setup: WeekSetup;
  dishes: PlannedDish[];
  shopping: ShoppingState;
  prep: PrepState;
  choosingStartedAt: Date | null;
};

/** Whether a saved week is named by a Monday, so its days start on Monday. */
export function isOldWeek(weekStart: string): boolean {
  return weekday(weekStart) === 1;
}

/** The Monday weeks a Sunday week overlaps: the one it shares Monday to Saturday with, and the one ending on its Sunday. */
export function oldWeeksFor(sunday: string): { current: string; previous: string } {
  return { current: addDays(sunday, 1), previous: addDays(sunday, -6) };
}

/** An old week's setup with Sunday first: its evenings and prep days move one place. */
export function setupFromOldWeek(setup: WeekSetup): WeekSetup {
  const evenings = setup.evenings.length === 7 ? [setup.evenings[6], ...setup.evenings.slice(0, 6)] : setup.evenings;
  return {
    ...setup,
    evenings,
    // Old 0 = Monday … 5 = Saturday, 6 = Sunday; new 0 = Sunday … 6 = Saturday.
    ...(setup.prepDays ? { prepDays: setup.prepDays.map((day) => (day + 1) % 7) } : {}),
  };
}

/** Monday to Saturday of an old week are days 1–6 of the new one; its Sunday belongs to the next new week. */
const shift = (day: number | null | undefined) => (day == null || day >= 6 ? null : day + 1);

/**
 * A Sunday week built from the old weeks it overlaps, or null if neither was saved.
 * `current` started the next day (Monday); `previous` ended on this Sunday.
 */
export function weekFromOldWeeks(current: SavedWeekData | null, previous: SavedWeekData | null): SavedWeekData | null {
  const base = current ?? previous;
  if (!base) return null;
  const dishes: PlannedDish[] = (current?.dishes ?? [])
    .filter((dish) => dish.day !== 6)
    .map((dish) => ({ ...dish, day: shift(dish.day), alsoOn: shift(dish.alsoOn) }));
  // The previous week's Sunday dinner is now this week's first evening.
  for (const dish of previous?.dishes ?? []) {
    if (dish.day === 6 && !dishes.some((d) => d.recipeId === dish.recipeId)) dishes.push({ ...dish, day: 0, alsoOn: null });
  }
  const prep: PrepState = {};
  for (const key of Object.keys(current?.prep ?? {})) {
    // Prep ticks are "task@day", with the day counted from the week's start: one later now.
    const match = /^(.*)@(-?\d+)$/.exec(key);
    const day = match ? Number(match[2]) + 1 : NaN;
    if (match && day >= -1 && day <= 6) prep[`${match[1]}@${day}`] = true;
  }
  return {
    setup: setupFromOldWeek(base.setup),
    dishes,
    shopping: current?.shopping ?? {},
    prep,
    choosingStartedAt: current?.choosingStartedAt ?? null,
  };
}
