import { describe, expect, it } from "vitest";
import type { ShoppingItem } from "../plan/shopping";
import { grocerySection, listWeeks, stillNeeded } from "./list";

const item = (name: string, days: (number | null)[]): ShoppingItem => ({
  key: name,
  name,
  section: "Other",
  amount: "1",
  measure: "piece:=1",
  optional: false,
  sources: days.map((day) => ({ recipeId: "r", title: "Dish", day, line: name })),
});

describe("the grocery list", () => {
  it("takes the dinners of the week we're in and the next one", () => {
    expect(listWeeks("2026-11-04")).toEqual({ thisWeek: "2026-11-02", nextWeek: "2026-11-09" }); // Wednesday
    expect(listWeeks("2026-11-02")).toEqual({ thisWeek: "2026-11-02", nextWeek: "2026-11-09" }); // Monday
    expect(listWeeks("2026-11-08")).toEqual({ thisWeek: "2026-11-02", nextWeek: "2026-11-09" }); // Sunday
  });

  it("keeps this week's items only for tonight's dinner or later ones", () => {
    const items = [item("rice", [0, 3]), item("lime", [1]), item("feta", [2]), item("mint", [null])];
    // Wednesday 4 November: Monday's and Tuesday's dinners are cooked already.
    expect(stillNeeded(items, "2026-11-02", "2026-11-04").map((i) => i.name)).toEqual(["rice", "feta", "mint"]);
    expect(stillNeeded(items, "2026-11-09", "2026-11-04")).toHaveLength(4);
  });

  it("puts things typed by hand in a supermarket section", () => {
    expect(grocerySection("Milk")).toBe("Dairy and eggs");
    expect(grocerySection("2 l milk")).toBe("Dairy and eggs");
    expect(grocerySection("bananas")).toBe("Fruit and veg");
    expect(grocerySection("Toilet paper")).toBe("Other");
    expect(grocerySection("salt")).toBe("Other");
  });
});
