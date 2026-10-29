import { beforeEach, describe, expect, it } from "vitest";
import { openLocalDb } from "../db/local";
import type { Db } from "../db/types";
import {
  addShoppingExtra,
  getPlan,
  removeShoppingExtra,
  saveDishes,
  saveSetup,
  setupForNewWeek,
  tickPrepTask,
  tickShoppingItem,
} from "./store";
import { DEFAULT_SETUP } from "./types";

let db: Db;
beforeEach(async () => {
  db = await openLocalDb("memory://");
});

describe("week plan storage", () => {
  it("starts the very first week from the defaults", async () => {
    expect(await getPlan(db, "2026-11-02")).toBeNull();
    expect(await setupForNewWeek(db, "2026-11-02")).toEqual(DEFAULT_SETUP);
  });

  it("saves a setup and updates it in place", async () => {
    await saveSetup(db, "2026-11-02", DEFAULT_SETUP);
    const changed = { ...DEFAULT_SETUP, ingredientsToUse: ["spinach"] };
    const row = await saveSetup(db, "2026-11-02", changed);
    expect(row).toMatchObject({ weekStart: "2026-11-02", setup: changed, dishes: [] });
    expect((await getPlan(db, "2026-11-02"))?.setup.ingredientsToUse).toEqual(["spinach"]);
  });

  it("saves dishes and remembers when choosing started", async () => {
    const dish = { recipeId: "00000000-0000-4000-8000-000000000001", day: 0, addedAt: "2026-11-01T10:00:00.000Z", via: "start" as const };
    expect(await saveDishes(db, "2026-11-02", [dish])).toBeNull(); // no setup yet
    await saveSetup(db, "2026-11-02", DEFAULT_SETUP);
    const first = await saveDishes(db, "2026-11-02", [dish]);
    expect(first?.dishes).toEqual([dish]);
    expect(first?.choosingStartedAt).toBeInstanceOf(Date);
    const second = await saveDishes(db, "2026-11-02", []);
    expect(second?.choosingStartedAt).toEqual(first?.choosingStartedAt);
  });

  it("starts a new week from the previous week's setup, without its ingredients", async () => {
    const sunnyEatsLess = {
      ...DEFAULT_SETUP,
      people: [{ name: "Sunny", dinnerPortion: 1, lunches: 2 }],
      ingredientsToUse: ["feta"],
    };
    await saveSetup(db, "2026-11-02", sunnyEatsLess);
    await saveSetup(db, "2026-12-07", DEFAULT_SETUP); // a later week must not count
    expect(await setupForNewWeek(db, "2026-11-09")).toEqual({ ...sunnyEatsLess, ingredientsToUse: [] });
  });
});

describe("shopping-list ticks", () => {
  const week = "2026-11-02";
  beforeEach(async () => {
    await saveSetup(db, week, DEFAULT_SETUP);
  });

  it("ticks and unticks items without touching other ticks", async () => {
    await tickShoppingItem(db, week, "bought", "basmati rice", "450 g");
    await tickShoppingItem(db, week, "have", "salt", "as needed");
    const both = await tickShoppingItem(db, week, "bought", "feta", "180 g");
    expect(both).toEqual({ bought: { "basmati rice": "450 g", feta: "180 g" }, have: { salt: "as needed" } });
    const after = await tickShoppingItem(db, week, "bought", "basmati rice", null);
    expect(after).toEqual({ bought: { feta: "180 g" }, have: { salt: "as needed" } });
  });

  it("adds and removes items by hand, with their tick", async () => {
    const id = "00000000-0000-4000-8000-000000000009";
    const added = await addShoppingExtra(db, week, id, "Milk");
    expect(added?.extra?.[id]).toMatchObject({ text: "Milk" });
    await tickShoppingItem(db, week, "bought", `extra:${id}`, "");
    const removed = await removeShoppingExtra(db, week, id);
    expect(removed).toEqual({ extra: {}, bought: {} });
  });

  it("returns null for a week without a setup", async () => {
    expect(await tickShoppingItem(db, "2026-11-09", "bought", "rice", "1 kg")).toBeNull();
  });
});

describe("Sunday prep ticks", () => {
  it("ticks tasks off and on, leaving the others", async () => {
    await saveSetup(db, "2026-11-02", DEFAULT_SETUP);
    await tickPrepTask(db, "2026-11-02", "cook rice", true);
    expect(await tickPrepTask(db, "2026-11-02", "deseed pomegranate", true)).toEqual({ "cook rice": true, "deseed pomegranate": true });
    expect(await tickPrepTask(db, "2026-11-02", "cook rice", false)).toEqual({ "deseed pomegranate": true });
    expect(await tickPrepTask(db, "2026-11-09", "cook rice", true)).toBeNull();
  });
});
