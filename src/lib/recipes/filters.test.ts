import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  filterRecipes,
  filtersFromParams,
  filtersToParams,
  NO_FILTERS,
  type Filters,
} from "./filters";
import type { RecipeSummary } from "./summary";

function recipe(overrides: Partial<RecipeSummary>): RecipeSummary {
  return {
    id: overrides.title ?? "x",
    title: "Untitled",
    source: "Own recipe",
    cuisine: "Indian",
    diet: "vegetarian",
    timeTotalMin: 30,
    timeActiveMin: null,
    freezerFriendly: false,
    goodAsLeftovers: false,
    tags: [],
    isTemplate: false,
    isFavourite: false,
    proteinRich: false,
    carbFocused: false,
    seafood: null,
    ingredients: [],
    ...overrides,
  };
}

const daal = recipe({
  title: "Tadka daal with spinach",
  timeTotalMin: 35,
  freezerFriendly: true,
  goodAsLeftovers: true,
  proteinRich: true,
  carbFocused: true,
  tags: ["one-pot", "comfort"],
  ingredients: [
    { name: "red lentils", optional: false },
    { name: "baby spinach", optional: false },
    { name: "green chilli", optional: true },
  ],
});
const shawarma = recipe({
  title: "Chicken shawarma traybake",
  cuisine: "Middle Eastern",
  diet: "meat",
  timeTotalMin: 45,
  proteinRich: true,
  isFavourite: true,
  ingredients: [{ name: "boneless chicken thighs", optional: false }],
});
const tacos = recipe({
  title: "Black bean tacos",
  cuisine: "Mexican-inspired",
  diet: "vegan",
  timeTotalMin: 20,
  ingredients: [
    { name: "black beans", optional: false },
    { name: "crème fraîche", optional: false },
  ],
});
const all = [daal, shawarma, tacos];

const titles = (filters: Partial<Filters>) =>
  filterRecipes(all, { ...NO_FILTERS, ...filters }).map((r) => r.title.split(" ")[0]);

describe("filterRecipes", () => {
  it("returns everything without filters", () => {
    expect(titles({})).toEqual(["Tadka", "Chicken", "Black"]);
  });

  it("searches titles, cuisines, tags and ingredients, ignoring case and accents", () => {
    expect(titles({ q: "DAAL" })).toEqual(["Tadka"]);
    expect(titles({ q: "middle eastern" })).toEqual(["Chicken"]);
    expect(titles({ q: "comfort" })).toEqual(["Tadka"]);
    expect(titles({ q: "spinach" })).toEqual(["Tadka"]);
    expect(titles({ q: "creme" })).toEqual(["Black"]);
    expect(titles({ q: "chicken lentils" })).toEqual([]);
  });

  it("filters by maximum total time", () => {
    expect(titles({ maxTime: 30 })).toEqual(["Black"]);
    expect(titles({ maxTime: 45 })).toEqual(["Tadka", "Chicken", "Black"]);
  });

  it("counts vegan dishes as vegetarian", () => {
    expect(titles({ diet: "vegetarian" })).toEqual(["Tadka", "Black"]);
    expect(titles({ diet: "vegan" })).toEqual(["Black"]);
    expect(titles({ diet: "meat" })).toEqual(["Chicken"]);
  });

  it("filters by cuisine, tag and yes/no properties", () => {
    expect(titles({ cuisine: "mexican-inspired" })).toEqual(["Black"]);
    expect(titles({ tag: "One-Pot" })).toEqual(["Tadka"]);
    expect(titles({ proteinRich: true })).toEqual(["Tadka", "Chicken"]);
    expect(titles({ carbFocused: true })).toEqual(["Tadka"]);
    expect(titles({ freezer: true, leftovers: true })).toEqual(["Tadka"]);
    expect(titles({ favourites: true })).toEqual(["Chicken"]);
  });

  it("includes and leaves out ingredients by part of the name", () => {
    expect(titles({ withIngredients: ["spinach"] })).toEqual(["Tadka"]);
    expect(titles({ withIngredients: ["spinach", "lentils"] })).toEqual(["Tadka"]);
    expect(titles({ withoutIngredients: ["chicken"] })).toEqual(["Tadka", "Black"]);
  });

  it("does not rule a recipe out for an optional ingredient", () => {
    expect(titles({ withoutIngredients: ["chilli"] })).toEqual(["Tadka", "Chicken", "Black"]);
    expect(titles({ withIngredients: ["chilli"] })).toEqual(["Tadka"]);
  });
});

describe("filters in the page address", () => {
  it("round-trips every filter", () => {
    const filters: Filters = {
      q: "daal",
      maxTime: 30,
      diet: "vegetarian",
      cuisine: "Indian",
      tag: "comfort",
      withIngredients: ["spinach", "lentils"],
      withoutIngredients: ["coriander"],
      proteinRich: true,
      carbFocused: false,
      freezer: true,
      leftovers: false,
      favourites: true,
    };
    const params = filtersToParams(filters);
    expect(params.toString()).toBe(
      "q=daal&time=30&diet=vegetarian&cuisine=Indian&tag=comfort&with=spinach%2C+lentils&without=coriander&protein=1&freezer=1&fav=1",
    );
    expect(filtersFromParams(params)).toEqual(filters);
    expect(activeFilterCount(filters)).toBe(9);
  });

  it("ignores nonsense values", () => {
    expect(filtersFromParams(new URLSearchParams("time=abc&diet=fish&protein=yes"))).toEqual(NO_FILTERS);
    expect(filtersToParams(NO_FILTERS).toString()).toBe("");
    expect(activeFilterCount(NO_FILTERS)).toBe(0);
  });
});
