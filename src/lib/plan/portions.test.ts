import { describe, expect, it } from "vitest";
import { setRepeat } from "./choose";
import { changeFreezer, changeLunchBoxes, lunchStatus, planPortions, shareLunchesAutomatically } from "./portions";
import { DEFAULT_SETUP, type PlannedDish } from "./types";

// Sunny: 1.5 portions at dinner, 4 lunch boxes. Victoria: 1 portion, no lunches. Mon–Fri cooking.
const setup = DEFAULT_SETUP;
const dish = (recipeId: string, day: number | null): PlannedDish => ({ recipeId, day, addedAt: "", via: "suggestion" });
const recipes = new Map([
  ["korma", { goodAsLeftovers: true }],
  ["steak", { goodAsLeftovers: false }],
  ["chili", { goodAsLeftovers: true }],
]);
const week = [dish("chili", 2), dish("korma", 0), dish("steak", 1)];
const totals = (dishes: PlannedDish[]) =>
  Object.fromEntries([...planPortions(setup, dishes, recipes)].map(([id, p]) => [id, p.total]));

describe("portions per dish", () => {
  it("cooks dinner for everyone and shares lunch boxes over leftover-friendly dishes, earliest first", () => {
    const portions = planPortions(setup, week, recipes);
    expect(portions.get("korma")).toEqual({ dinner: 2.5, repeat: 0, lunchBoxes: [2, 0], lunch: 3, freezer: 0, total: 5.5 });
    expect(portions.get("steak")?.total).toBe(2.5);
    expect(portions.get("chili")?.lunchBoxes).toEqual([2, 0]);
    expect(lunchStatus(setup, portions)).toEqual([{ name: "Sunny", needed: 4, planned: 4 }]);
  });

  it("gives odd lunch boxes to the earliest dish", () => {
    const three = { ...setup, people: [{ ...setup.people[0], lunches: 3 }, setup.people[1]] };
    const portions = planPortions(three, week, recipes);
    expect(portions.get("korma")?.lunchBoxes).toEqual([2, 0]);
    expect(portions.get("chili")?.lunchBoxes).toEqual([1, 0]);
  });

  it("moves a lunch box to the other dishes when one dish gets fewer", () => {
    const fewer = changeLunchBoxes(week, planPortions(setup, week, recipes), "korma", 0, -1);
    expect(fewer.find((d) => d.recipeId === "korma")?.lunches).toEqual([1, 0]);
    expect(totals(fewer)).toEqual({ korma: 4, steak: 2.5, chili: 7 });
    expect(totals(shareLunchesAutomatically(fewer))).toEqual(totals(week));
  });

  it("shows more lunch boxes than needed when every dish has its own numbers", () => {
    let dishes = changeLunchBoxes(week, planPortions(setup, week, recipes), "korma", 0, 1);
    dishes = changeLunchBoxes(dishes, planPortions(setup, dishes, recipes), "chili", 0, 1);
    expect(lunchStatus(setup, planPortions(setup, dishes, recipes))).toEqual([{ name: "Sunny", needed: 4, planned: 5 }]);
  });

  it("plans no lunch boxes when no dish is good as leftovers", () => {
    const portions = planPortions(setup, [dish("steak", 1)], recipes);
    expect(lunchStatus(setup, portions)).toEqual([{ name: "Sunny", needed: 4, planned: 0 }]);
  });

  it("adds a repeat dinner and freezer portions", () => {
    let dishes = setRepeat(week, "chili", 3);
    dishes = changeFreezer(dishes, "chili", 1);
    expect(planPortions(setup, dishes, recipes).get("chili")).toMatchObject({ repeat: 2.5, freezer: 1, total: 9 });
    expect(changeFreezer(dishes, "chili", -1).find((d) => d.recipeId === "chili")?.freezer).toBe(0);
    expect(changeFreezer(changeFreezer(week, "steak", -1), "steak", -1)[2].freezer).toBe(0);
  });
});
