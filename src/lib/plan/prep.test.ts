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
// Korma Monday, butter chicken Tuesday (and again Thursday), steak Wednesday.
const week = [dish("korma", 0), dish("butter chicken", 1, { alsoOn: 3 }), dish("steak", 2, { freezer: 1 })];
const portions = planPortions(DEFAULT_SETUP, week, recipes);
const limits = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe("when prep is done", () => {
  it("counts Saturday and Sunday as the weekend before the week", () => {
    expect([5, 6, 0, 2, 4].map(prepDayOffset)).toEqual([-2, -1, 0, 2, 4]);
  });

  it("picks the latest prep day on or before the dinner that's within the limit", () => {
    const sundayAndWednesday = [6, 2];
    expect(choosePrepDay(0, { days: 1, by: "household" }, sundayAndWednesday)).toBe(-1); // Monday: Sunday
    expect(choosePrepDay(1, { days: 1, by: "household" }, sundayAndWednesday)).toBeNull(); // Tuesday: on the evening
    expect(choosePrepDay(3, { days: 1, by: "household" }, sundayAndWednesday)).toBe(2); // Thursday: Wednesday
    expect(choosePrepDay(4, { days: 1, by: "household" }, sundayAndWednesday)).toBeNull(); // Friday: on the evening
    expect(choosePrepDay(4, { days: 3, by: "household" }, sundayAndWednesday)).toBe(2);
    expect(choosePrepDay(2, null, sundayAndWednesday)).toBe(2); // no limit: only a prep day on the dinner's own day
    expect(choosePrepDay(0, null, sundayAndWednesday)).toBeNull();
  });
});

describe("the prep list", () => {
  it("merges the same task on the same prep day into one batch, with the amounts", () => {
    const mondayPrep = { ...DEFAULT_SETUP, prepDays: [0] };
    const tasks = buildPrepList(mondayPrep, week, recipes, portions, limits({ "deseed pomegranate": 2 }));
    expect(tasks.map((t) => [t.key, t.dishes.map((d) => d.recipeId)])).toEqual([
      ["cook rice@0", ["korma", "butter chicken"]],
      ["deseed pomegranate@0", ["korma", "butter chicken"]],
    ]);
    // korma: 2½ dinner + 2 lunch boxes (3) = 5½ portions; butter chicken: 2½ + 2½ again + 2 boxes (3) = 8.
    expect(tasks[0].amounts.map((a) => a.line)).toEqual(["410 g basmati rice", "1.2 kg basmati rice"]);
    expect(tasks[0].limit).toMatchObject({ days: 1, by: "guidance" });
    expect(tasks[1].limit).toEqual({ days: 2, by: "household" });
  });

  it("leaves a task for the evening when the prep day is too early for its limit", () => {
    const tasks = buildPrepList(DEFAULT_SETUP, week, recipes, portions, limits({ "deseed pomegranate": 1 }));
    expect(tasks.map((t) => [t.key, t.dishes.map((d) => d.recipeId)])).toEqual([
      ["cook rice@-1", ["korma"]],
      ["deseed pomegranate@-1", ["korma"]],
    ]);
  });

  it("never plans further ahead than the guidance allows, whatever the household set", () => {
    const tasks = buildPrepList(DEFAULT_SETUP, week, recipes, portions, limits({ "cook rice": 2 }));
    expect(tasks.map((t) => [t.key, t.dishes.map((d) => d.recipeId)])).toEqual([["cook rice@-1", ["korma"]]]);
  });

  it("plans nothing ahead for tasks with no limit and no guidance, unless a prep day is the dinner's own day", () => {
    // Cooked rice is covered by the guidance; the pomegranate and pickled onions aren't.
    expect(buildPrepList(DEFAULT_SETUP, week, recipes, portions, limits({})).map((t) => t.key)).toEqual(["cook rice@-1"]);
    const tuesdayPrep = { ...DEFAULT_SETUP, prepDays: [1] };
    expect(buildPrepList(tuesdayPrep, week, recipes, portions, limits({})).map((t) => t.key)).toEqual([
      "cook rice@1",
      "deseed pomegranate@1",
      "quick-pickled red onions@1",
    ]);
  });
});

describe("each evening", () => {
  const evenings = eveningPlans(DEFAULT_SETUP, week, recipes, portions, limits({ "cook rice": 1, "deseed pomegranate": 2 }));

  it("says which tasks were prepped and when, and which are done on the evening", () => {
    expect(evenings.map((e) => e.day)).toEqual([0, 1, 2, 3, 4]);
    expect(evenings[0].cook?.tasks.map((t) => [t.name, t.prepDay])).toEqual([
      ["Cook rice", -1],
      ["Deseed pomegranate", -1],
    ]);
    expect(evenings[1].cook?.tasks.map((t) => [t.name, t.prepDay])).toEqual([
      ["Cook the rice.", null],
      ["Deseed Pomegranate", -1],
      ["Quick-pickled red onions", null],
    ]);
  });

  it("lists lunch boxes to pack, portions to freeze, and evenings of leftovers", () => {
    expect(evenings[0].lunchBoxes).toEqual([{ name: "Sunny", count: 2 }]);
    expect(evenings[2]).toMatchObject({ cook: { recipeId: "steak" }, freezer: 1, lunchBoxes: [] });
    expect(evenings[3]).toMatchObject({ cook: null, leftovers: { recipeId: "butter chicken", cookedOn: 1 } });
    expect(evenings[4]).toMatchObject({ cook: null, leftovers: null });
  });
});
