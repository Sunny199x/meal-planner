// Reading and saving weekly plans. Each save is a single write.
import { desc, eq, lt, sql } from "drizzle-orm";
import { weekPlans, type WeekPlanRow } from "../db/schema";
import type { Db } from "../db/types";
import { DEFAULT_SETUP, type WeekSetup } from "./types";

export async function getPlan(db: Db, weekStart: string): Promise<WeekPlanRow | null> {
  const [row] = await db.select().from(weekPlans).where(eq(weekPlans.weekStart, weekStart));
  return row ?? null;
}

/** A new week starts from the last week's setup, without its "ingredients to use". */
export async function setupForNewWeek(db: Db, weekStart: string): Promise<WeekSetup> {
  const [previous] = await db
    .select({ setup: weekPlans.setup })
    .from(weekPlans)
    .where(lt(weekPlans.weekStart, weekStart))
    .orderBy(desc(weekPlans.weekStart))
    .limit(1);
  return previous ? { ...previous.setup, ingredientsToUse: [] } : DEFAULT_SETUP;
}

export async function saveSetup(db: Db, weekStart: string, setup: WeekSetup): Promise<WeekPlanRow> {
  const [row] = await db
    .insert(weekPlans)
    .values({ weekStart, setup })
    .onConflictDoUpdate({ target: weekPlans.weekStart, set: { setup, updatedAt: sql`now()` } })
    .returning();
  return row;
}
