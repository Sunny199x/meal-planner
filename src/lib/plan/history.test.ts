import { describe, expect, it } from "vitest";
import { pastWeeks, recentDinners, repeatWeek } from "./history";
import { DEFAULT_SETUP, readDishes, type PlannedDish, type WeekSetup } from "./types";

const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const now = new Date("2026-11-08T10:00:00Z");
const dish = (n: number, day: number | null, extra: Partial<PlannedDish> = {}): PlannedDish => ({
  recipeId: ID(n),
  day,
  addedAt: "2026-10-25T10:00:00.000Z",
  via: "suggestion",
  ...extra,
});

// Sun off, Mon normal, Tue quick, Wed normal, Thu normal, Fri normal, Sat relaxed
const setup: WeekSetup = {
  ...DEFAULT_SETUP,
  evenings: [
    { cooking: false, time: "relaxed" },
    { cooking: true, time: "normal" },
    { cooking: true, time: "quick" },
    { cooking: true, time: "normal" },
    { cooking: true, time: "normal" },
    { cooking: true, time: "normal" },
    { cooking: true, time: "relaxed" },
  ],
};

type Recipe = { id: string; timeTotalMin: number; seafood: "contains" | "may contain" | null };
const recipes = (...list: [number, number, Recipe["seafood"]?][]) =>
  new Map<string, Recipe>(list.map(([n, minutes, seafood = null]) => [ID(n), { id: ID(n), timeTotalMin: minutes, seafood }]));
const all = recipes([1, 30], [2, 20], [3, 40], [4, 60], [5, 35], [6, 30]);

const placed = (dishes: PlannedDish[]) => dishes.map((d) => [d.recipeId, d.day, d.alsoOn ?? null]);

describe("repeating a past week", () => {
  it("puts each dinner on the same evening, marked as repeated, without lunch boxes or freezer portions", () => {
    const past = [dish(1, 1, { lunches: [2, 0], freezer: 2 }), dish(2, 2), dish(3, 4)];
    const { dishes, added, noRoom } = repeatWeek([], past, setup, all, now);
    expect(placed(dishes)).toEqual([
      [ID(1), 1, null],
      [ID(2), 2, null],
      [ID(3), 4, null],
    ]);
    expect(dishes.every((d) => d.via === "repeat" && d.addedAt === now.toISOString())).toBe(true);
    expect(dishes.some((d) => d.lunches || d.freezer)).toBe(false);
    expect(added).toEqual([ID(1), ID(2), ID(3)]);
    expect(noRoom).toEqual([]);
    // What the chooser saves must pass the server's check.
    expect(readDishes(dishes)).toEqual(dishes);
  });

  it("keeps the dinners already chosen, and moves a dinner whose evening is taken to the next free evening it fits", () => {
    const chosen = [dish(6, 1, { via: "start" })];
    // Monday is taken; the 30-minute dish is too long for Quick Tuesday, so it goes to the first evening left after the others.
    const past = [dish(1, 1), dish(3, 3), dish(4, 5)];
    const { dishes, added } = repeatWeek(chosen, past, setup, all, now);
    expect(placed(dishes)).toEqual([
      [ID(6), 1, null], // untouched
      [ID(3), 3, null], // same evening
      [ID(4), 5, null], // same evening
      [ID(1), 4, null], // Monday was taken: Thursday is the first free evening it fits
    ]);
    expect(dishes[0]).toEqual(chosen[0]);
    expect(added).toEqual([ID(3), ID(4), ID(1)]);
  });

  it("gives displaced dinners only the evenings the others don't keep", () => {
    // Without two passes, Monday's displaced dish would take Wednesday from Wednesday's own dish.
    const chosen = [dish(6, 1)];
    const { dishes } = repeatWeek(chosen, [dish(1, 1), dish(3, 3)], setup, all, now);
    expect(placed(dishes)).toContainEqual([ID(3), 3, null]);
    expect(placed(dishes)).toContainEqual([ID(1), 4, null]);
  });

  it("keeps a leftovers evening when it is free, before displaced dinners take it", () => {
    const chosen = [dish(6, 1)];
    const past = [dish(1, 1), dish(5, 3, { alsoOn: 4 })];
    const { dishes } = repeatWeek(chosen, past, setup, all, now);
    expect(placed(dishes)).toEqual([
      [ID(6), 1, null],
      [ID(5), 3, 4], // Wednesday, eaten again on Thursday
      [ID(1), 5, null], // Thursday is leftovers, so Friday
    ]);
  });

  it("drops a leftovers evening that is now taken or not cooked on", () => {
    const sundayOff = [dish(1, 5, { alsoOn: 6 }), dish(5, 3, { alsoOn: 4 })];
    const busy = [dish(6, 4)];
    expect(placed(repeatWeek(busy, sundayOff, setup, all, now).dishes)).toEqual([
      [ID(6), 4, null],
      [ID(5), 3, null], // Thursday is taken
      [ID(1), 5, 6],
    ]);
    const noSaturday = { ...setup, evenings: setup.evenings.map((e, day) => (day === 6 ? { ...e, cooking: false } : e)) };
    expect(placed(repeatWeek([], [dish(1, 5, { alsoOn: 6 })], noSaturday, all, now).dishes)).toEqual([[ID(1), 5, null]]);
  });

  it("moves a dinner from an evening that isn't cooked on this week", () => {
    // Sunday is off in this setup.
    const { dishes } = repeatWeek([], [dish(1, 0)], setup, all, now);
    expect(placed(dishes)).toEqual([[ID(1), 1, null]]);
  });

  it("reports dinners with no free evening left, and adds nothing for them", () => {
    const full = [1, 2, 3, 4, 5, 6].map((day, i) => dish(i + 1, day));
    const { dishes, added, noRoom } = repeatWeek(full.slice(0, 5), [dish(6, 6), dish(7, 1)], setup, recipes([6, 30], [7, 30]), now);
    expect(placed(dishes).at(-1)).toEqual([ID(6), 6, null]);
    expect(added).toEqual([ID(6)]);
    expect(noRoom).toEqual([ID(7)]);
  });

  it("leaves out recipes already chosen, deleted since, or now containing seafood", () => {
    const withSeafood = recipes([1, 30], [2, 20, "contains"], [3, 40, "may contain"]);
    const { dishes, added, noRoom } = repeatWeek([dish(1, 3)], [dish(1, 1), dish(2, 2), dish(3, 4), dish(9, 5)], setup, withSeafood, now);
    expect(placed(dishes)).toEqual([
      [ID(1), 3, null], // already in the week, stays where it is
      [ID(3), 4, null], // "may contain" is a warning, not a ban
    ]);
    expect(added).toEqual([ID(3)]);
    expect(noRoom).toEqual([]);
  });

  it("adds nothing when every dinner is already chosen", () => {
    const chosen = [dish(1, 1), dish(2, 2)];
    expect(repeatWeek(chosen, chosen, setup, all, now)).toEqual({ dishes: chosen, added: [], noRoom: [] });
  });
});

describe("listing past weeks", () => {
  const row = (weekStart: string, dishes: PlannedDish[]) => ({
    weekStart,
    setup: DEFAULT_SETUP,
    dishes,
    shopping: {},
    prep: {},
    choosingStartedAt: null,
  });

  it("lists weeks with dinners before the given week, newest first", () => {
    const rows = [row("2026-10-25", [dish(1, 1)]), row("2026-11-08", [dish(2, 1)]), row("2026-11-01", []), row("2026-10-18", [dish(3, 2)])];
    expect(pastWeeks(rows, "2026-11-08").map((w) => w.weekStart)).toEqual(["2026-10-25", "2026-10-18"]);
  });

  it("reads weeks saved the old way (Monday to Sunday) as Sunday weeks, without listing them twice", () => {
    const rows = [
      // Monday 19 October: Monday–Saturday belong to the Sunday 18 October week, its Sunday to the 25 October week.
      row("2026-10-19", [dish(1, 0), dish(2, 6)]),
      // Monday 26 October, already opened as the Sunday week of 25 October; its Sunday is 1 November.
      row("2026-10-26", [dish(3, 1), dish(5, 6)]),
      row("2026-10-25", [dish(2, 0), dish(3, 2)]),
    ];
    const weeks = pastWeeks(rows, "2026-11-08");
    expect(weeks.map((w) => [w.weekStart, placed(w.dishes)])).toEqual([
      // 1 November: only the old 26 October week's Sunday dinner.
      ["2026-11-01", [[ID(5), 0, null]]],
      // 25 October: the saved Sunday week wins over the old rows.
      ["2026-10-25", [[ID(2), 0, null], [ID(3), 2, null]]],
      // 18 October: Monday of the old 19 October week.
      ["2026-10-18", [[ID(1), 1, null]]],
    ]);
  });

  it("leaves out an old week's Sunday that falls in the given week", () => {
    const rows = [row("2026-11-02", [dish(1, 6)])];
    expect(pastWeeks(rows, "2026-11-08")).toEqual([]);
  });
});

describe("dinners of the last two weeks", () => {
  it("counts the week before as 1 and two weeks before as 2, the more recent winning", () => {
    const weeks = [
      { weekStart: "2026-11-01", dishes: [dish(1, 1), dish(2, 3), dish(5, null)] },
      { weekStart: "2026-10-25", dishes: [dish(2, 2), dish(3, 4)] },
      { weekStart: "2026-10-18", dishes: [dish(4, 1)] }, // three weeks before: forgotten
    ];
    expect(recentDinners(weeks, "2026-11-08")).toEqual({ [ID(1)]: 1, [ID(2)]: 1, [ID(3)]: 2 });
  });

  it("counts weeks by date, not by their place in the list", () => {
    // Nothing was planned the week before.
    expect(recentDinners([{ weekStart: "2026-10-25", dishes: [dish(3, 4)] }], "2026-11-08")).toEqual({ [ID(3)]: 2 });
    expect(recentDinners([{ weekStart: "2026-10-25", dishes: [dish(3, 4)] }], "2026-11-15")).toEqual({});
  });
});
