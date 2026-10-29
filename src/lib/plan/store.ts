// Reading and saving weekly plans. Each save is a single write.
import { desc, eq, lt, sql, type SQL } from "drizzle-orm";
import { weekPlans, type WeekPlanRow } from "../db/schema";
import type { Db } from "../db/types";
import { DEFAULT_SETUP, type PlannedDish, type PrepState, type ShoppingState, type WeekSetup } from "./types";

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

/**
 * Saves the chosen dishes. The first save also records when choosing started,
 * to measure how long agreeing on a week takes. Returns null if the week has
 * no setup yet.
 */
export async function saveDishes(db: Db, weekStart: string, dishes: PlannedDish[]): Promise<WeekPlanRow | null> {
  const [row] = await db
    .update(weekPlans)
    .set({
      dishes,
      choosingStartedAt: sql`coalesce(${weekPlans.choosingStartedAt}, now())`,
      updatedAt: sql`now()`,
    })
    .where(eq(weekPlans.weekStart, weekStart))
    .returning();
  return row ?? null;
}

export async function saveSetup(db: Db, weekStart: string, setup: WeekSetup): Promise<WeekPlanRow> {
  const [row] = await db
    .insert(weekPlans)
    .values({ weekStart, setup })
    .onConflictDoUpdate({ target: weekPlans.weekStart, set: { setup, updatedAt: sql`now()` } })
    .returning();
  return row;
}

// Shopping-list changes are single-key updates done inside the database, so a
// tick on one phone never undoes a tick made on the other in the meantime.

async function updateShopping(db: Db, weekStart: string, change: SQL): Promise<ShoppingState | null> {
  const [row] = await db
    .update(weekPlans)
    .set({ shopping: change })
    .where(eq(weekPlans.weekStart, weekStart))
    .returning({ shopping: weekPlans.shopping });
  return row?.shopping ?? null;
}

/** Ticks (amount given) or unticks (null) an item as bought or already in the house. */
export function tickShoppingItem(
  db: Db,
  weekStart: string,
  list: "bought" | "have",
  key: string,
  amount: string | null,
): Promise<ShoppingState | null> {
  const current = sql`coalesce(${weekPlans.shopping} -> ${list}::text, '{}'::jsonb)`;
  const next = amount === null ? sql`${current} - ${key}::text` : sql`${current} || jsonb_build_object(${key}::text, ${amount}::text)`;
  return updateShopping(db, weekStart, sql`${weekPlans.shopping} || jsonb_build_object(${list}::text, ${next})`);
}

export function addShoppingExtra(db: Db, weekStart: string, id: string, text: string): Promise<ShoppingState | null> {
  const current = sql`coalesce(${weekPlans.shopping} -> 'extra', '{}'::jsonb)`;
  const item = sql`jsonb_build_object(${id}::text, jsonb_build_object('text', ${text}::text, 'addedAt', now()))`;
  return updateShopping(db, weekStart, sql`${weekPlans.shopping} || jsonb_build_object('extra', ${current} || ${item})`);
}

export function removeShoppingExtra(db: Db, weekStart: string, id: string): Promise<ShoppingState | null> {
  const extra = sql`coalesce(${weekPlans.shopping} -> 'extra', '{}'::jsonb) - ${id}::text`;
  const bought = sql`coalesce(${weekPlans.shopping} -> 'bought', '{}'::jsonb) - ${`extra:${id}`}::text`;
  return updateShopping(db, weekStart, sql`${weekPlans.shopping} || jsonb_build_object('extra', ${extra}, 'bought', ${bought})`);
}

/** Ticks a Sunday prep task off (true) or back on (false), leaving other ticks alone. */
export async function tickPrepTask(db: Db, weekStart: string, key: string, done: boolean): Promise<PrepState | null> {
  const [row] = await db
    .update(weekPlans)
    .set({ prep: done ? sql`${weekPlans.prep} || jsonb_build_object(${key}::text, true)` : sql`${weekPlans.prep} - ${key}::text` })
    .where(eq(weekPlans.weekStart, weekStart))
    .returning({ prep: weekPlans.prep });
  return row?.prep ?? null;
}
