// Reading and changing the household grocery list. Each change is one small
// update in the database, so two phones never undo each other's changes.
import { asc, eq, isNotNull, sql } from "drizzle-orm";
import { groceryItems, type GroceryItemRow } from "../db/schema";
import type { Db } from "../db/types";
import { stockholmToday } from "../plan/dates";
import { getPlan } from "../plan/store";
import { listWeeks, type GroceryItem, type GroceryListData } from "./list";

const toItem = (row: GroceryItemRow): GroceryItem => ({
  id: row.id,
  text: row.text,
  addedAt: row.addedAt.toISOString(),
  bought: row.boughtAt !== null,
});

export async function getGroceryItems(db: Db): Promise<GroceryItem[]> {
  const rows = await db.select().from(groceryItems).orderBy(asc(groceryItems.addedAt));
  return rows.map(toItem);
}

export async function addGroceryItem(db: Db, id: string, text: string): Promise<GroceryItem[]> {
  await db.insert(groceryItems).values({ id, text }).onConflictDoNothing();
  return getGroceryItems(db);
}

export async function setGroceryBought(db: Db, id: string, bought: boolean): Promise<GroceryItem[]> {
  await db
    .update(groceryItems)
    .set({ boughtAt: bought ? sql`now()` : null })
    .where(eq(groceryItems.id, id));
  return getGroceryItems(db);
}

export async function removeGroceryItem(db: Db, id: string): Promise<GroceryItem[]> {
  await db.delete(groceryItems).where(eq(groceryItems.id, id));
  return getGroceryItems(db);
}

/** Removes the hand-added items ticked as bought. */
export async function clearBoughtGroceries(db: Db): Promise<GroceryItem[]> {
  await db.delete(groceryItems).where(isNotNull(groceryItems.boughtAt));
  return getGroceryItems(db);
}

/** Everything the home page shows: hand-added items and the planned weeks that feed the list. */
export async function loadGroceryList(db: Db, today: string = stockholmToday()): Promise<GroceryListData> {
  const { thisWeek, nextWeek } = listWeeks(today);
  const [items, ...plans] = await Promise.all([getGroceryItems(db), getPlan(db, thisWeek), getPlan(db, nextWeek)]);
  const weeks = plans.flatMap((plan) =>
    plan && plan.dishes.length > 0
      ? [{ weekStart: plan.weekStart, setup: plan.setup, dishes: plan.dishes, shopping: plan.shopping }]
      : [],
  );
  return { today, items, weeks };
}
