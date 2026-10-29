"use server";

import { revalidatePath } from "next/cache";
import { requireSignedIn } from "../auth/server";
import { describeDatabaseError, getDb } from "../db";
import { readWeekStart } from "./dates";
import { addShoppingExtra, getPlan, removeShoppingExtra, saveDishes, saveSetup, tickShoppingItem } from "./store";
import { readDishes, readSetup, type PlannedDish, type ShoppingState, type WeekSetup } from "./types";

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
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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

export async function addShoppingItemAction(weekStart: string, id: string, text: string): Promise<ShoppingResult> {
  const clean = typeof text === "string" ? text.trim().slice(0, 80) : "";
  if (!clean || typeof id !== "string" || !UUID.test(id)) return { error: "Type what to add first." };
  return changeShopping(weekStart, async (week) => addShoppingExtra(await getDb(), week, id, clean));
}

export async function removeShoppingItemAction(weekStart: string, id: string): Promise<ShoppingResult> {
  if (typeof id !== "string" || !UUID.test(id)) return { error: "Something wasn't valid. Please reload and try again." };
  return changeShopping(weekStart, async (week) => removeShoppingExtra(await getDb(), week, id));
}

/** The week as saved now, to pick up changes made on the other phone. */
export async function loadWeekAction(
  weekStart: string,
): Promise<{ setup?: WeekSetup; dishes?: PlannedDish[]; shopping?: ShoppingState; error?: string }> {
  await requireSignedIn();
  const week = readWeekStart(weekStart);
  if (!week) return { error: "Something wasn't valid. Please reload and try again." };
  try {
    const plan = await getPlan(await getDb(), week);
    return plan ? { setup: plan.setup, dishes: plan.dishes, shopping: plan.shopping } : { error: "Save the week's setup first." };
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
}
