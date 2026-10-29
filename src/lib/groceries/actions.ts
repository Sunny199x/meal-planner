"use server";

import { requireSignedIn } from "../auth/server";
import { describeDatabaseError, getDb } from "../db";
import type { Db } from "../db/types";
import type { GroceryItem, GroceryListData } from "./list";
import { addGroceryItem, clearBoughtGroceries, loadGroceryList, removeGroceryItem, setGroceryBought } from "./store";

type ItemsResult = { items?: GroceryItem[]; error?: string };
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVALID = "Something wasn't valid. Please reload and try again.";

async function change(run: (db: Db) => Promise<GroceryItem[]>): Promise<ItemsResult> {
  await requireSignedIn();
  try {
    return { items: await run(await getDb()) };
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
}

export async function addGroceryItemAction(id: string, text: string): Promise<ItemsResult> {
  const clean = typeof text === "string" ? text.trim().slice(0, 80) : "";
  if (!clean) return { error: "Type what to add first." };
  if (typeof id !== "string" || !UUID.test(id)) return { error: INVALID };
  return change((db) => addGroceryItem(db, id, clean));
}

export async function setGroceryBoughtAction(id: string, bought: boolean): Promise<ItemsResult> {
  if (typeof id !== "string" || !UUID.test(id) || typeof bought !== "boolean") return { error: INVALID };
  return change((db) => setGroceryBought(db, id, bought));
}

export async function removeGroceryItemAction(id: string): Promise<ItemsResult> {
  if (typeof id !== "string" || !UUID.test(id)) return { error: INVALID };
  return change((db) => removeGroceryItem(db, id));
}

export async function clearBoughtGroceriesAction(): Promise<ItemsResult> {
  return change((db) => clearBoughtGroceries(db));
}

/** The list as saved now, to pick up changes made on the other phone. */
export async function loadGroceryListAction(): Promise<{ list?: GroceryListData; error?: string }> {
  await requireSignedIn();
  try {
    return { list: await loadGroceryList(await getDb()) };
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
}
