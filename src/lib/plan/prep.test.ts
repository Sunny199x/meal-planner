import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../recipes/parse-ingredient-line";
import { buildPrepList, choosePrepDay, eveningPlans, prepDayOffset } from "./prep";
import { planPortions } from "./portions";
import { DEFAULT_SETUP, type PlannedDish } from "./types";

const recipe = (id: string, lines: string[], makeAhead: [string, string][], extra = {}) => ({
  id,
  title: `${id} with sides`,
  servings: 2,
  timeTotalMin: 30,
  goodAsLeftovers: true,
  ingredients: lines.map(parseIngredientLine),
  makeAhead: makeAhead.map(([name, description]) => ({ name, description })),
  ...extra,
});
const recipes = new Map(
  [
    recipe("korma", ["150 g basmati rice", "½ pomegranate", "1 tsp curry powder"], [
      ["Cook rice", "cook, cool quickly, keep in the fridge"],
      ["Deseed pomegranate", "keep the seeds covered"],
    ]),
    recipe("butter chicken", ["300 g basmati rice", "½ pomegranate", "1 red onion", "1 tsp chicken stock powder"], [
      ["Cook the rice.", "same as always"],
      ["Deseed Pomegranate", "keep the seeds covered"],
      ["Quick-pickled red onions", "slice and pickle"],
    ]),
    recipe("steak", ["300 g steak"], [], { goodAsLeftovers: false }),
  ].map((r) => [r.id, r]),
);
const dish = (recipeId: string, day: number, extra: Partial<PlannedDish> = {}): PlannedDish => ({
  recipeId,
  day,
  addedAt: "",
  via: "browse",
  ...extra,
});
// Days count from Sunday (0). Korma Monday, butter chicken Tuesday (and again Thursday), steak Wednesday.
const week = [dish("korma", 1), dish("butter chicken", 2, { alsoOn: 4 }), dish("steak", 3, { freezer: 1 })];
const portions = planPortions(DEFAULT_SETUP, week, recipes);
const limits = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe("when prep is done", () => {
  it("counts Sunday as the week's first day, and Saturday as the Saturday before it", () => {
    expect([6, 0, 3, 5].map(prepDayOffset)).toEqual([-1, 0, 3, 5]);
  });

  it("picks the latest prep day on or before the dinner that's within the limit", () => {
    const sundayAndWednesday = [0, 3];
    expect(choosePrepDay(1, { days: 1, by: "household" }, sundayAndWednesday)).toBe(0); // Monday: Sunday
    expect(choosePrepDay(2, { days: 1, by: "household" }, sundayAndWednesday)).toBeNull(); // Tuesday: on the evening
    expect(choosePrepDay(4, { days: 1, by: "household" }, sundayAndWednesday)).toBe(3); // Thursday: Wednesday
    expect(choosePrepDay(5, { days: 1, by: "household" }, sundayAndWednesday)).toBeNull(); // Friday: on the evening
    expect(choosePrepDay(5, { days: 3, by: "household" }, sundayAndWednesday)).toBe(3);
    expect(choosePrepDay(3, null, sundayAndWednesday)).toBe(3); // no limit: only a prep day on the dinner's own day
    expect(choosePrepDay(1, null, sundayAndWednesday)).toBeNull();
    expect(choosePrepDay(1, { days: 2, by: "household" }, [6])).toBe(-1); // Monday: the Saturday before
  });
});

describe("the prep list", () => {
  it("merges the same task on the same prep day into one batch, with the amounts", () => {
    const mondayPrep = { ...DEFAULT_SETUP, prepDays: [1] };
    const tasks = buildPrepList(mondayPrep, week, recipes, portions, limits({ "deseed pomegranate": 2 }));
    expect(tasks.map((t) => [t.key, t.dishes.map((d) => d.recipeId)])).toEqual([
      ["cook rice@1", ["korma", "butter chicken"]],
      ["deseed pomegranate@1", ["korma", "butter chicken"]],
    ]);
    // korma: 2½ dinner + 2 lunch boxes (3) = 5½ portions; butter chicken: 2½ + 2½ again + 2 boxes (3) = 8.
    expect(tasks[0].amounts.map((a) => a.line)).toEqual(["410 g basmati rice", "1.2 kg basmati rice"]);
    expect(tasks[0].limit).toMatchObject({ days: 1, by: "guidance" });
    expect(tasks[1].limit).toEqual({ days: 2, by: "household" });
  });

  it("leaves a task for the evening when the prep day is too early for its limit", () => {
    const tasks = buildPrepList(DEFAULT_SETUP, week, recipes, portions, limits({ "deseed pomegranate": 1 }));
    expect(tasks.map((t) => [t.key, t.dishes.map((d) => d.recipeId)])).toEqual([
      ["cook rice@0", ["korma"]],
      ["deseed pomegranate@0", ["korma"]],
    ]);
  });

  it("never plans further ahead than the guidance allows, whatever the household set", () => {
    const tasks = buildPrepList(DEFAULT_SETUP, week, recipes, portions, limits({ "cook rice": 2 }));
    expect(tasks.map((t) => [t.key, t.dishes.map((d) => d.recipeId)])).toEqual([["cook rice@0", ["korma"]]]);
  });

  it("plans nothing ahead for tasks with no limit and no guidance, unless a prep day is the dinner's own day", () => {
    // Cooked rice is covered by the guidance; the pomegranate and pickled onions aren't.
    expect(buildPrepList(DEFAULT_SETUP, week, recipes, portions, limits({})).map((t) => t.key)).toEqual(["cook rice@0"]);
    const tuesdayPrep = { ...DEFAULT_SETUP, prepDays: [2] };
    expect(buildPrepList(tuesdayPrep, week, recipes, portions, limits({})).map((t) => t.key)).toEqual([
      "cook rice@2",
      "deseed pomegranate@2",
      "quick-pickled red onions@2",
    ]);
  });
});

describe("each evening", () => {
  const evenings = eveningPlans(DEFAULT_SETUP, week, recipes, portions, limits({ "cook rice": 1, "deseed pomegranate": 2 }));

  it("says which tasks were prepped and when, and which are done on the evening", () => {
    expect(evenings.map((e) => e.day)).toEqual([1, 2, 3, 4, 5]); // Monday to Friday
    expect(evenings[0].cook?.tasks.map((t) => [t.name, t.prepDay])).toEqual([
      ["Cook rice", 0],
      ["Deseed pomegranate", 0],
    ]);
    expect(evenings[1].cook?.tasks.map((t) => [t.name, t.prepDay])).toEqual([
      ["Cook the rice.", null],
      ["Deseed Pomegranate", 0],
      ["Quick-pickled red onions", null],
    ]);
  });

  it("lists lunch boxes to pack, portions to freeze, and evenings of leftovers", () => {
    expect(evenings[0].lunchBoxes).toEqual([{ name: "Sunny", count: 2 }]);
    expect(evenings[2]).toMatchObject({ cook: { recipeId: "steak" }, freezer: 1, lunchBoxes: [] });
    expect(evenings[3]).toMatchObject({ cook: null, leftovers: { recipeId: "butter chicken", cookedOn: 2 } });
    expect(evenings[4]).toMatchObject({ cook: null, leftovers: null });
  });
});
