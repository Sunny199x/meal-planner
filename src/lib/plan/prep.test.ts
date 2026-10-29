import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../recipes/parse-ingredient-line";
import { buildPrepList, eveningPlans } from "./prep";
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
const week = [dish("korma", 0), dish("butter chicken", 2, { alsoOn: 3 }), dish("steak", 1, { freezer: 1 })];
const portions = planPortions(DEFAULT_SETUP, week, recipes);

describe("the Sunday prep list", () => {
  const tasks = buildPrepList(week, recipes, portions);

  it("merges the same task from several dishes, matched by name", () => {
    expect(tasks.map((t) => [t.name, t.dishes.map((d) => d.recipeId)])).toEqual([
      ["Cook rice", ["korma", "butter chicken"]],
      ["Deseed pomegranate", ["korma", "butter chicken"]],
      ["Quick-pickled red onions", ["butter chicken"]],
    ]);
  });

  it("shows the amounts a shared task works on, scaled to each dish", () => {
    // korma: 2½ dinner + 2 lunch boxes (3) = 5½ portions; butter chicken: 2½ + 2½ again + 2 boxes (3) = 8.
    expect(tasks[0].dishes.map((d) => d.portions)).toEqual([5.5, 8]);
    expect(tasks[0].amounts.map((a) => a.line)).toEqual(["410 g basmati rice", "1.2 kg basmati rice"]);
    expect(tasks[1].amounts.map((a) => a.line)).toEqual(["1½ pomegranates", "2 pomegranates"]);
    expect(tasks[2].amounts).toEqual([]);
  });

  it("finds the main thing a task works on, not the cupboard staples", () => {
    const onions = buildPrepList([dish("butter chicken", 0), { ...dish("korma", 1) }], new Map([
      ["butter chicken", recipes.get("butter chicken")!],
      ["korma", { ...recipes.get("korma")!, ingredients: ["1 red onion", "1 red pepper"].map(parseIngredientLine), makeAhead: [{ name: "Quick-pickled red onions", description: "" }] }],
    ]), planPortions(DEFAULT_SETUP, [dish("butter chicken", 0), dish("korma", 1)], recipes));
    const pickled = onions.find((t) => t.name === "Quick-pickled red onions")!;
    // Each dish: 2½ dinner + 2 lunch boxes (3) = 5½ portions. The red pepper is not an onion.
    expect(pickled.amounts.map((a) => a.line)).toEqual(["2¾ red onions", "2¾ red onions"]);
  });
});

describe("each evening", () => {
  const evenings = eveningPlans(DEFAULT_SETUP, week, recipes, portions);

  it("lists what was prepped, lunch boxes to pack and portions to freeze", () => {
    expect(evenings.map((e) => e.day)).toEqual([0, 1, 2, 3, 4]);
    expect(evenings[0].cook).toMatchObject({ recipeId: "korma", portions: 5.5, prepped: ["Cook rice", "Deseed pomegranate"] });
    expect(evenings[0].lunchBoxes).toEqual([{ name: "Sunny", count: 2 }]);
    expect(evenings[1]).toMatchObject({ cook: { recipeId: "steak" }, freezer: 1, lunchBoxes: [] });
  });

  it("shows an evening of leftovers and an empty evening", () => {
    expect(evenings[3]).toMatchObject({ cook: null, leftovers: { recipeId: "butter chicken", cookedOn: 2 } });
    expect(evenings[4]).toMatchObject({ cook: null, leftovers: null });
  });
});
