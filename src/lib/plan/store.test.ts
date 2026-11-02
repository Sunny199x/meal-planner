import { beforeEach, describe, expect, it } from "vitest";
import { openLocalDb } from "../db/local";
import type { Db } from "../db/types";
import { weekPlans } from "../db/schema";
import {
  getPastWeeks,
  getPlan,
  saveDishes,
  saveDishesOrCreate,
  saveDismissed,
  saveEase,
  saveSetup,
  tickPrepTask,
  tickShoppingItem,
} from "./store";
import { getPrepLimits, setPrepLimit } from "./prep-limits";
import { DEFAULT_SETUP } from "./types";
import { getUsualWeek, saveUsualWeek } from "./usual-week";

let db: Db;
beforeEach(async () => {
  db = await openLocalDb("memory://");
});

describe("week plan storage", () => {
  it("starts from the default usual week until one is saved", async () => {
    expect(await getPlan(db, "2026-11-01")).toBeNull();
    expect(await getUsualWeek(db)).toEqual(DEFAULT_SETUP);
  });

  it("saves a setup and updates it in place", async () => {
    await saveSetup(db, "2026-11-01", DEFAULT_SETUP);
    const changed = { ...DEFAULT_SETUP, ingredientsToUse: ["spinach"] };
    const row = await saveSetup(db, "2026-11-01", changed);
    expect(row).toMatchObject({ weekStart: "2026-11-01", setup: changed, dishes: [] });
    expect((await getPlan(db, "2026-11-01"))?.setup.ingredientsToUse).toEqual(["spinach"]);
  });

  it("saves dishes and remembers when choosing started", async () => {
    const dish = { recipeId: "00000000-0000-4000-8000-000000000001", day: 0, addedAt: "2026-11-01T10:00:00.000Z", via: "start" as const };
    expect(await saveDishes(db, "2026-11-01", [dish])).toBeNull(); // no setup yet
    await saveSetup(db, "2026-11-01", DEFAULT_SETUP);
    const first = await saveDishes(db, "2026-11-01", [dish]);
    expect(first?.dishes).toEqual([dish]);
    expect(first?.choosingStartedAt).toBeInstanceOf(Date);
    const second = await saveDishes(db, "2026-11-01", []);
    expect(second?.choosingStartedAt).toEqual(first?.choosingStartedAt);
  });

  it("keeps the usual week, never with ingredients to use up, and not from the week before", async () => {
    const sunnyEatsLess = {
      ...DEFAULT_SETUP,
      people: [{ name: "Sunny", dinnerPortion: 1, lunches: 2 }],
      ingredientsToUse: ["feta"],
    };
    await saveUsualWeek(db, sunnyEatsLess);
    await saveUsualWeek(db, { ...sunnyEatsLess, prepDays: [0] }); // saved again: one row, updated
    await saveSetup(db, "2026-11-01", DEFAULT_SETUP); // a planned week doesn't change it
    expect(await getUsualWeek(db)).toEqual({ ...sunnyEatsLess, prepDays: [0], ingredientsToUse: [] });
  });

  it("keeps \"Not this one\" for the week, creating the week if needed", async () => {
    const id = "00000000-0000-4000-8000-000000000001";
    expect(await saveDismissed(db, "2026-11-08", [id], null)).toBe(false);
    expect(await saveDismissed(db, "2026-11-08", [id], DEFAULT_SETUP)).toBe(true);
    expect((await getPlan(db, "2026-11-08"))?.dismissed).toEqual([id]);
    expect(await saveDismissed(db, "2026-11-08", [], null)).toBe(true);
    expect((await getPlan(db, "2026-11-08"))?.dismissed).toEqual([]);
  });

  it("saves how hard choosing felt, and clears it", async () => {
    expect(await saveEase(db, "2026-11-08", 2)).toBe(false); // no week yet
    await saveSetup(db, "2026-11-08", DEFAULT_SETUP);
    expect((await getPlan(db, "2026-11-08"))?.ease).toBeNull();
    expect(await saveEase(db, "2026-11-08", 2)).toBe(true);
    expect((await getPlan(db, "2026-11-08"))?.ease).toBe(2);
    await saveEase(db, "2026-11-08", null);
    expect((await getPlan(db, "2026-11-08"))?.ease).toBeNull();
  });

  it("creates a week on its first save of dishes, with the setup shown for it", async () => {
    const dish = { recipeId: "00000000-0000-4000-8000-000000000001", day: 1, addedAt: "2026-11-01T10:00:00.000Z", via: "start" as const };
    const quickMonday = { ...DEFAULT_SETUP, evenings: DEFAULT_SETUP.evenings.map((e, d) => (d === 1 ? { ...e, time: "quick" as const } : e)) };
    expect(await saveDishesOrCreate(db, "2026-11-08", [dish], null)).toBeNull();
    const row = await saveDishesOrCreate(db, "2026-11-08", [dish], quickMonday);
    expect(row).toMatchObject({ setup: quickMonday, dishes: [dish] });
    expect(row?.choosingStartedAt).toBeInstanceOf(Date);
    // Once the week exists, its own setup is kept.
    const again = await saveDishesOrCreate(db, "2026-11-08", [], DEFAULT_SETUP);
    expect(again?.setup).toEqual(quickMonday);
  });
});

describe("weeks saved before weeks started on Sunday", () => {
  const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
  const dish = (n: number, day: number | null, extra = {}) => ({
    recipeId: ID(n),
    day,
    addedAt: "2026-10-30T10:00:00.000Z",
    via: "browse" as const,
    ...extra,
  });
  // An old week's evenings ran Monday first; prep days counted 0 = Monday … 6 = Sunday.
  const oldSetup = {
    ...DEFAULT_SETUP,
    evenings: [
      { cooking: true, time: "quick" as const }, // Mon
      { cooking: true, time: "normal" as const },
      { cooking: true, time: "normal" as const },
      { cooking: true, time: "normal" as const },
      { cooking: true, time: "normal" as const }, // Fri
      { cooking: false, time: "relaxed" as const }, // Sat
      { cooking: true, time: "relaxed" as const }, // Sun
    ],
    prepDays: [6, 2], // Sunday before the week, Wednesday
  };

  it("builds a Sunday week from the old Monday weeks it overlaps, and leaves those as they were", async () => {
    // Monday 26 October to Sunday 1 November: its Sunday dinner is now the first evening of 1–7 November.
    await saveSetup(db, "2026-10-26", oldSetup);
    await saveDishes(db, "2026-10-26", [dish(1, 6), dish(2, 3)]);
    // Monday 2 to Sunday 8 November.
    await saveSetup(db, "2026-11-02", oldSetup);
    await saveDishes(db, "2026-11-02", [dish(3, 0), dish(4, 4, { alsoOn: 5 }), dish(5, 6), dish(6, null)]);
    await tickShoppingItem(db, "2026-11-02", "bought", "feta", "180 g");
    await tickPrepTask(db, "2026-11-02", "cook rice@-1", true); // Sunday before the old week
    await tickPrepTask(db, "2026-11-02", "deseed pomegranate@2", true); // Wednesday

    const week = await getPlan(db, "2026-11-01");
    expect(week?.weekStart).toBe("2026-11-01");
    expect(week?.dishes.map((d) => [d.recipeId, d.day, d.alsoOn ?? null])).toEqual([
      [ID(3), 1, null], // Monday
      [ID(4), 5, 6], // Friday, eaten again on Saturday
      [ID(6), null, null], // not on an evening yet
      [ID(1), 0, null], // Sunday 1 November, from the week before
    ]);
    expect(week?.setup.evenings.map((e) => e.time)).toEqual(["relaxed", "quick", "normal", "normal", "normal", "normal", "relaxed"]);
    expect(week?.setup.prepDays).toEqual([0, 3]); // Sunday and Wednesday, counted from Sunday
    expect(week?.shopping).toEqual({ bought: { feta: "180 g" } });
    expect(week?.prep).toEqual({ "cook rice@0": true, "deseed pomegranate@3": true });

    // Saved under its Sunday, so later reads and saves use it.
    expect((await getPlan(db, "2026-11-01"))?.id).toBe(week?.id);
    expect(await saveDishes(db, "2026-11-01", [])).not.toBeNull();
    // The old weeks are unchanged.
    expect((await getPlan(db, "2026-11-02"))?.dishes.map((d) => d.day)).toEqual([0, 4, 6, null]);
    expect((await getPlan(db, "2026-10-26"))?.dishes).toHaveLength(2);
  });

  it("starts the following week with the old week's Sunday dinner", async () => {
    await saveSetup(db, "2026-11-02", oldSetup);
    await saveDishes(db, "2026-11-02", [dish(5, 6)]);
    expect((await getPlan(db, "2026-11-08"))?.dishes.map((d) => [d.recipeId, d.day])).toEqual([[ID(5), 0]]);
  });
});

describe("shopping-list ticks", () => {
  const week = "2026-11-01";
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

  it("returns null for a week without a setup", async () => {
    expect(await tickShoppingItem(db, "2026-11-08", "bought", "rice", "1 kg")).toBeNull();
  });
});

describe("Sunday prep ticks", () => {
  it("ticks tasks off and on, leaving the others", async () => {
    await saveSetup(db, "2026-11-01", DEFAULT_SETUP);
    await tickPrepTask(db, "2026-11-01", "cook rice", true);
    expect(await tickPrepTask(db, "2026-11-01", "deseed pomegranate", true)).toEqual({ "cook rice": true, "deseed pomegranate": true });
    expect(await tickPrepTask(db, "2026-11-01", "cook rice", false)).toEqual({ "deseed pomegranate": true });
    expect(await tickPrepTask(db, "2026-11-08", "cook rice", true)).toBeNull();
  });
});

describe("prep limits", () => {
  it("sets, changes and clears a task's limit, matched like shared prep", async () => {
    expect(await setPrepLimit(db, "Cook rice", 1)).toEqual({ "cook rice": 1 });
    expect(await setPrepLimit(db, "Cook the rice.", 2)).toEqual({ "cook rice": 2 });
    await setPrepLimit(db, "Deseed pomegranate", 3);
    expect(await setPrepLimit(db, "cook rice", null)).toEqual({ "deseed pomegranate": 3 });
    expect(await getPrepLimits(db)).toEqual({ "deseed pomegranate": 3 });
  });
});

describe("past weeks", () => {
  const dish = (n: number, day: number) => ({
    recipeId: `00000000-0000-4000-8000-00000000000${n}`,
    day,
    addedAt: "2026-10-30T10:00:00.000Z",
    via: "browse" as const,
  });

  it("lists the half year of weeks with dinners before a week, and only reads", async () => {
    for (const [week, dishes] of [
      ["2026-11-01", [dish(1, 1)]],
      ["2026-10-25", []], // no dinners
      ["2026-10-19", [dish(2, 0)]], // saved the old way, never opened: read as 18 October
      ["2026-05-03", [dish(3, 1)]], // 27 weeks before: too long ago
      ["2026-11-08", [dish(4, 1)]], // the week itself
    ] as const) {
      await saveSetup(db, week, DEFAULT_SETUP);
      await saveDishes(db, week, [...dishes]);
    }
    const weeks = await getPastWeeks(db, "2026-11-08");
    expect(weeks.map((w) => [w.weekStart, w.dishes.map((d) => d.day)])).toEqual([
      ["2026-11-01", [1]],
      ["2026-10-18", [1]],
    ]);
    // Nothing was saved for the old week.
    expect(await db.select().from(weekPlans)).toHaveLength(5);
  });
});
