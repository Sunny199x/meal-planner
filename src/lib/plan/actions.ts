"use server";

import { revalidatePath } from "next/cache";
import { requireSignedIn } from "../auth/server";
import { describeDatabaseError, getDb } from "../db";
import { readWeekStart } from "./dates";
import { saveDishes, saveSetup } from "./store";
import { readDishes, readSetup, type PlannedDish, type WeekSetup } from "./types";

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
