import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../recipes/parse-ingredient-line";
import type { DishPortions } from "./portions";
import { buildShoppingList, covers, roundUpForShop, shoppingSection } from "./shopping";
import type { PlannedDish } from "./types";

const recipe = (id: string, lines: string[]) => ({ id, title: `Recipe ${id}`, servings: 2, ingredients: lines.map(parseIngredientLine) });
const recipes = new Map(
  [
    recipe("a", [
      "150 g basmati rice",
      "½ pomegranate",
      "1 pack cooked green lentils (about 380 g), drained",
      "60 g baby spinach",
      "1 tsp mild curry powder",
      "salt, to taste",
      "2 tbsp butter",
      "½ red chilli (optional)",
      "1 l water",
      "2 garlic cloves",
    ]),
    recipe("b", [
      "300 g basmati rice",
      "½ pomegranate",
      "100 g baby spinach",
      "1 can black beans (390 g)",
      "200 g black beans",
      "1 clove garlic",
      "150 ml cooking cream",
      "2 tbsp cooking cream",
      "1 red onion",
      "2 onions",
      "black pepper, to taste",
      "100 g feta cheese",
    ]),
    recipe("c", ["75 g feta"]),
  ].map((r) => [r.id, r]),
);
const dish = (recipeId: string, day: number): PlannedDish => ({ recipeId, day, addedAt: "", via: "browse" });
const cook = (total: number) => ({ total }) as DishPortions;
const list = (portions: Record<string, number>) =>
  buildShoppingList(
    Object.keys(portions).map((id, day) => dish(id, day)),
    recipes,
    new Map(Object.entries(portions).map(([id, total]) => [id, cook(total)])),
  );
const amounts = (portions: Record<string, number>) => Object.fromEntries(list(portions).map((i) => [i.name, i.amount]));

describe("the shopping list", () => {
  it("adds up the same ingredient across dishes", () => {
    const items = amounts({ a: 2, b: 2, c: 2 });
    expect(items["Basmati rice"]).toBe("450 g");
    expect(items["Pomegranate"]).toBe("1");
    expect(items["Baby spinach"]).toBe("160 g");
    expect(items["Garlic"]).toBe("3 cloves");
    expect(items["Feta"]).toBe("180 g"); // 175 g, rounded up to the next 10 g
  });

  it("joins spoons with millilitres, but keeps cans apart from grams", () => {
    const items = amounts({ a: 2, b: 2 });
    expect(items["Cooking cream"]).toBe("180 ml");
    expect(items["Black beans"]).toBe("1 can (390 g) + 200 g");
    expect(items["Butter"]).toBe("2 tbsp");
  });

  it("keeps different things apart and leaves water off", () => {
    const items = amounts({ a: 2, b: 2 });
    expect(items["Red onion"]).toBe("1");
    expect(items["Onions"]).toBe("2");
    expect(items["Water"]).toBeUndefined();
  });

  it("puts salt, pepper and spices in the cupboard check", () => {
    const cupboard = list({ a: 2, b: 2 }).filter((i) => i.section === "Check the cupboard");
    expect(cupboard.map((i) => [i.name, i.amount])).toEqual([
      ["Black pepper", "as needed"],
      ["Mild curry powder", "1 tsp"],
      ["Salt", "as needed"],
    ]);
  });

  it("scales to the dish's portions and rounds up to what can be bought", () => {
    const items = amounts({ a: 5 });
    expect(items["Basmati rice"]).toBe("380 g");
    expect(items["Pomegranate"]).toBe("2 (1¼ needed)");
    expect(items["Cooked green lentils"]).toBe("3 packs (2½ needed, about 950 g)");
  });

  it("marks an item optional only when every dish has it as optional, and says which dishes need it", () => {
    const chilli = list({ a: 4 }).find((i) => i.name === "Red chilli");
    expect(chilli).toMatchObject({ optional: true, amount: "1" });
    const rice = list({ a: 2, b: 2 }).find((i) => i.name === "Basmati rice");
    expect(rice?.sources.map((s) => [s.title, s.day, s.line])).toEqual([
      ["Recipe a", 0, "150 g basmati rice"],
      ["Recipe b", 1, "300 g basmati rice"],
    ]);
  });

  it("orders the list by supermarket section", () => {
    const sections = [...new Set(list({ a: 2, b: 2 }).map((i) => i.section))];
    expect(sections).toEqual([
      "Fruit and veg",
      "Dairy and eggs",
      "Rice, pasta and grains",
      "Cans, jars and sauces",
      "Check the cupboard",
    ]);
  });
});

describe("supermarket sections", () => {
  it.each([
    ["ground beef", "Meat"],
    ["beef mince", "Meat"],
    ["chicken stock", "Cans, jars and sauces"],
    ["chicken stock cube", "Check the cupboard"],
    ["ground cumin", "Check the cupboard"],
    ["cumin seed", "Check the cupboard"],
    ["pomegranate seed", "Fruit and veg"],
    ["black pepper", "Check the cupboard"],
    ["red pepper", "Fruit and veg"],
    ["sweet chilli sauce", "Cans, jars and sauces"],
    ["vegan mayonnaise", "Cans, jars and sauces"],
    ["plant-based mince", "Vegetarian protein"],
    ["tortilla chip", "Nuts, snacks and dried fruit"],
    ["tortilla", "Bread and wraps"],
    ["peanut butter", "Nuts, snacks and dried fruit"],
    ["dried cranberry", "Nuts, snacks and dried fruit"],
    ["dried oregano", "Check the cupboard"],
    ["frozen pea", "Frozen"],
    ["green bean", "Fruit and veg"],
    ["black bean", "Cans, jars and sauces"],
    ["olive oil", "Check the cupboard"],
    ["coconut milk", "Cans, jars and sauces"],
    ["something unusual", "Other"],
  ])("%s → %s", (key, section) => {
    expect(shoppingSection(key, null)).toBe(section);
  });

  it("puts anything in a can or jar with the cans", () => {
    expect(shoppingSection("tomato", "can")).toBe("Cans, jars and sauces");
  });
});

describe("rounding up for the shop", () => {
  it("rounds to 5 g, 10 g, then 50 g, always up", () => {
    expect(roundUpForShop(62)).toBe(65);
    expect(roundUpForShop(375)).toBe(380);
    expect(roundUpForShop(1001)).toBe(1050);
    expect(roundUpForShop(450)).toBe(450);
  });
});

describe("ticks after the plan changes", () => {
  it("stays ticked when the plan needs the same or less, not when it needs more", () => {
    const before = list({ a: 2, b: 2 }).find((i) => i.name === "Basmati rice")!.measure;
    const more = list({ a: 4, b: 2 }).find((i) => i.name === "Basmati rice")!.measure;
    const less = list({ a: 2 }).find((i) => i.name === "Basmati rice")!.measure;
    expect(before).toBe("g:g=450");
    expect(covers(before, before)).toBe(true);
    expect(covers(before, less)).toBe(true);
    expect(covers(before, more)).toBe(false);
  });

  it("compares buying amounts, so 1¼ instead of 1½ needed changes nothing", () => {
    const one = list({ a: 5 }).find((i) => i.name === "Pomegranate")!.measure;
    const other = list({ a: 6 }).find((i) => i.name === "Pomegranate")!.measure;
    expect(one).toBe("piece:=2");
    expect(covers(one, other)).toBe(true);
  });

  it("needs every part covered", () => {
    expect(covers("count:can=1", "count:can=1;g:g=200")).toBe(false);
    expect(covers("", "")).toBe(true);
  });
});
