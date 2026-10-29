"use server";

import { revalidatePath } from "next/cache";
import { requireSignedIn } from "../auth/server";
import { describeDatabaseError, getDb } from "../db";
import { readWeekStart } from "./dates";
import { guidanceFor, MAX_PREP_DAYS } from "./food-safety";
import { setPrepLimit } from "./prep-limits";
import { getPlan, saveDishes, saveSetup, tickPrepTask, tickShoppingItem } from "./store";
import { readDishes, readSetup, type PlannedDish, type PrepState, type ShoppingState, type WeekSetup } from "./types";

export async function saveWeekSetupAction(
  weekStart: string,
  input: WeekSetup,
): Promise<{ setup?: WeekSetup; error?: string }> {
  await requireSignedIn();
  const week = readWeekStart(weekStart);
  const setup = readSetup(input);
  if (!week || !setup) return { error: "Something in the setup wasn't valid. Please reload and try again." };
  try {
    const row = await saveSetup(await getDb(), week, setup);
    revalidatePath("/", "layout");
    return { setup: row.setup };
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
}

/** Saves the chosen dishes after each change on the choosing screen. */
export async function saveWeekDishesAction(
  weekStart: string,
  input: PlannedDish[],
): Promise<{ choosingStartedAt?: string; error?: string }> {
  await requireSignedIn();
  const week = readWeekStart(weekStart);
  const dishes = readDishes(input);
  if (!week || !dishes) return { error: "Something in the week wasn't valid. Please reload and try again." };
  try {
    const row = await saveDishes(await getDb(), week, dishes);
    if (!row) return { error: "Save the week's setup first." };
    return { choosingStartedAt: row.choosingStartedAt?.toISOString() };
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
}

type ShoppingResult = { shopping?: ShoppingState; error?: string };

async function changeShopping(weekStart: string, run: (week: string) => Promise<ShoppingState | null>): Promise<ShoppingResult> {
  await requireSignedIn();
  const week = readWeekStart(weekStart);
  if (!week) return { error: "Something wasn't valid. Please reload and try again." };
  try {
    const shopping = await run(week);
    return shopping ? { shopping } : { error: "Save the week's setup first." };
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
}

/** Ticks an item as bought or already at home (with its amount), or unticks it (null). */
export async function tickShoppingAction(
  weekStart: string,
  list: "bought" | "have",
  key: string,
  amount: string | null,
): Promise<ShoppingResult> {
  const valid =
    (list === "bought" || list === "have") &&
    typeof key === "string" && key.length > 0 && key.length <= 160 &&
    (amount === null || (typeof amount === "string" && amount.length <= 160));
  if (!valid) return { error: "Something wasn't valid. Please reload and try again." };
  return changeShopping(weekStart, async (week) => tickShoppingItem(await getDb(), week, list, key, amount));
}

/** Ticks a Sunday prep task off or back on. */
export async function tickPrepAction(weekStart: string, key: string, done: boolean): Promise<{ prep?: PrepState; error?: string }> {
  await requireSignedIn();
  const week = readWeekStart(weekStart);
  if (!week || typeof key !== "string" || !key || key.length > 160 || typeof done !== "boolean") {
    return { error: "Something wasn't valid. Please reload and try again." };
  }
  try {
    const prep = await tickPrepTask(await getDb(), week, key, done);
    return prep ? { prep } : { error: "Save the week's setup first." };
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
}

export type SavedWeek = { setup: WeekSetup; dishes: PlannedDish[]; shopping: ShoppingState; prep: PrepState };

/** The week as saved now, to pick up changes made on the other phone. */
export async function loadWeekAction(weekStart: string): Promise<{ week?: SavedWeek; error?: string }> {
  await requireSignedIn();
  const week = readWeekStart(weekStart);
  if (!week) return { error: "Something wasn't valid. Please reload and try again." };
  try {
    const plan = await getPlan(await getDb(), week);
    return plan
      ? { week: { setup: plan.setup, dishes: plan.dishes, shopping: plan.shopping, prep: plan.prep } }
      : { error: "Save the week's setup first." };
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
}

/** Sets how far ahead a make-ahead task may be done (null clears it: on the evening). Never longer than the guidance. */
export async function setPrepLimitAction(name: string, days: number | null): Promise<{ limits?: Record<string, number>; error?: string }> {
  await requireSignedIn();
  if (typeof name !== "string" || !name.trim() || name.length > 120) return { error: "Something wasn't valid. Please reload and try again." };
  if (days !== null && !(Number.isInteger(days) && days >= 0 && days <= MAX_PREP_DAYS)) {
    return { error: "Something wasn't valid. Please reload and try again." };
  }
  const guidance = guidanceFor(name);
  if (days !== null && guidance && days > guidance.days) {
    return { error: `The guidance allows at most ${guidance.days} ${guidance.days === 1 ? "day" : "days"} ahead for this.` };
  }
  try {
    const limits = await setPrepLimit(await getDb(), name.trim(), days);
    revalidatePath("/", "layout");
    return { limits };
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
}
