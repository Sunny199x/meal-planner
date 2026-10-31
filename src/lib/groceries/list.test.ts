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
    // Weeks run Sunday to Saturday.
    expect(listWeeks("2026-11-04")).toEqual({ thisWeek: "2026-11-01", nextWeek: "2026-11-08" }); // Wednesday
    expect(listWeeks("2026-11-01")).toEqual({ thisWeek: "2026-11-01", nextWeek: "2026-11-08" }); // Sunday
    expect(listWeeks("2026-11-07")).toEqual({ thisWeek: "2026-11-01", nextWeek: "2026-11-08" }); // Saturday
  });

  it("keeps this week's items only for tonight's dinner or later ones", () => {
    // Days count from Sunday: 1 = Monday, 4 = Thursday.
    const items = [item("rice", [1, 4]), item("lime", [2]), item("feta", [3]), item("mint", [null])];
    // Wednesday 4 November: Monday's and Tuesday's dinners are cooked already.
    expect(stillNeeded(items, "2026-11-01", "2026-11-04").map((i) => i.name)).toEqual(["rice", "feta", "mint"]);
    expect(stillNeeded(items, "2026-11-08", "2026-11-04")).toHaveLength(4);
  });

  it("puts things typed by hand in a supermarket section", () => {
    expect(grocerySection("Milk")).toBe("Dairy and eggs");
    expect(grocerySection("2 l milk")).toBe("Dairy and eggs");
    expect(grocerySection("bananas")).toBe("Fruit and veg");
    expect(grocerySection("Toilet paper")).toBe("Other");
    expect(grocerySection("salt")).toBe("Other");
  });
});
