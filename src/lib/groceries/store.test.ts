import { beforeEach, describe, expect, it } from "vitest";
import { openLocalDb } from "../db/local";
import type { Db } from "../db/types";
import { saveDishes, saveSetup } from "../plan/store";
import { DEFAULT_SETUP } from "../plan/types";
import { addGroceryItem, clearBoughtGroceries, loadGroceryList, removeGroceryItem, setGroceryBought } from "./store";

let db: Db;
beforeEach(async () => {
  db = await openLocalDb("memory://");
});
const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;

describe("the grocery list storage", () => {
  it("adds, ticks, removes and clears items added by hand", async () => {
    await addGroceryItem(db, ID(1), "Milk");
    await addGroceryItem(db, ID(2), "Coffee");
    expect((await addGroceryItem(db, ID(1), "Milk again")).map((i) => i.text)).toEqual(["Milk", "Coffee"]);
    const ticked = await setGroceryBought(db, ID(2), true);
    expect(ticked.map((i) => [i.text, i.bought])).toEqual([["Milk", false], ["Coffee", true]]);
    expect((await setGroceryBought(db, ID(2), false))[1].bought).toBe(false);
    await setGroceryBought(db, ID(2), true);
    expect((await clearBoughtGroceries(db)).map((i) => i.text)).toEqual(["Milk"]);
    expect(await removeGroceryItem(db, ID(1))).toEqual([]);
  });

  it("loads this week's and next week's plans when they have dishes", async () => {
    const dish = { recipeId: ID(9), day: 2, addedAt: "2026-11-01T10:00:00.000Z", via: "start" as const };
    await saveSetup(db, "2026-11-01", DEFAULT_SETUP);
    await saveDishes(db, "2026-11-01", [dish]);
    await saveSetup(db, "2026-11-08", DEFAULT_SETUP); // set up, no dishes yet
    await saveSetup(db, "2026-11-15", DEFAULT_SETUP);
    await saveDishes(db, "2026-11-15", [dish]); // too far ahead
    const list = await loadGroceryList(db, "2026-11-04"); // a Wednesday
    expect(list.today).toBe("2026-11-04");
    expect(list.weeks.map((w) => w.weekStart)).toEqual(["2026-11-01"]);
  });
});
