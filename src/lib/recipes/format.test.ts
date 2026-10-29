import { describe, expect, it } from "vitest";
import { formatAmount, formatMetric, formatQuantity } from "./format";
import { parseIngredientLine } from "./parse-ingredient-line";

describe("formatQuantity", () => {
  it.each([
    [2, "2"],
    [0.5, "½"],
    [1.5, "1½"],
    [0.25, "¼"],
    [1 / 3, "⅓"],
    [2.75, "2¾"],
    [0.2, "0.2"],
    [62.5, "62½"],
  ])("%s → %s", (value, text) => {
    expect(formatQuantity(value)).toBe(text);
  });
});

describe("formatAmount", () => {
  it.each([
    ["250 g red lentils", "250 g"],
    ["½ tsp chilli flakes", "½ tsp"],
    ["1 1/2 tbsp oil", "1½ tbsp"],
    ["2 cans black beans", "2 cans"],
    ["1 can tomatoes", "1 can"],
    ["2 bunches coriander", "2 bunches"],
    ["2–3 tomatoes", "2–3"],
    ["1 onion", "1"],
    ["salt, to taste", ""],
  ])("%s → %s", (line, text) => {
    expect(formatAmount(parseIngredientLine(line))).toBe(text);
  });
});

describe("formatMetric", () => {
  it("shows totals in sensible units", () => {
    expect(formatMetric({ value: 800, unit: "g", approximate: false })).toBe("800 g");
    expect(formatMetric({ value: 1500, unit: "g", approximate: false })).toBe("1½ kg");
    expect(formatMetric({ value: 600, unit: "g", approximate: true })).toBe("about 600 g");
    expect(formatMetric({ value: 1000, unit: "ml", approximate: false })).toBe("1 l");
  });
});
