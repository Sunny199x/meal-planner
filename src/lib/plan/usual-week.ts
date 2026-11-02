// The household's usual week, set once in Settings. Each new week starts from
// it (not from the week before), so the weekly questions are only what changes.
import { sql } from "drizzle-orm";
import { householdSettings } from "../db/schema";
import type { Db } from "../db/types";
import { DEFAULT_SETUP, type WeekSetup } from "./types";

const ID = "household";

/** The usual week, without "ingredients to use up" (those belong to one week). */
export async function getUsualWeek(db: Db): Promise<WeekSetup> {
  const [row] = await db.select({ usualWeek: householdSettings.usualWeek }).from(householdSettings);
  return { ...(row?.usualWeek ?? DEFAULT_SETUP), ingredientsToUse: [] };
}

export async function saveUsualWeek(db: Db, setup: WeekSetup): Promise<WeekSetup> {
  const usualWeek = { ...setup, ingredientsToUse: [] };
  await db
    .insert(householdSettings)
    .values({ id: ID, usualWeek })
    .onConflictDoUpdate({ target: householdSettings.id, set: { usualWeek, updatedAt: sql`now()` } });
  return usualWeek;
}
