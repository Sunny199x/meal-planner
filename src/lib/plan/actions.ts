"use server";

import { revalidatePath } from "next/cache";
import { requireSignedIn } from "../auth/server";
import { describeDatabaseError, getDb } from "../db";
import { readWeekStart } from "./dates";
import { saveSetup } from "./store";
import { readSetup, type WeekSetup } from "./types";

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
