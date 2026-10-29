import { describe, expect, it } from "vitest";
import { carbLabel, proteinLabel } from "./labels";
import { parseIngredientLine } from "./parse-ingredient-line";
import { parseRecipeFile } from "./parse-recipe-file";
import { readTemplateFixtures } from "./test-fixtures";

const lines = (...l: string[]) => l.map(parseIngredientLine);

describe("proteinLabel", () => {
  it("counts meat by weight per serving", () => {
    const result = proteinLabel(lines("600 g boneless chicken thighs", "1 onion"), 4);
    expect(result).toEqual({
      applies: true,
      counted: ["150 g boneless chicken thighs per serving"],
      notCounted: [],
    });
  });

  it("counts dry lentils with a lower threshold than canned beans", () => {
    expect(proteinLabel(lines("250 g red lentils, rinsed"), 4).applies).toBe(true); // 62.5 g ≥ 50 g
    expect(proteinLabel(lines("2 cans chickpeas (400 g each)"), 4).applies).toBe(true); // 200 g ≥ 150 g
    expect(proteinLabel(lines("1 can chickpeas (400 g)"), 4).applies).toBe(false); // 100 g < 150 g
    expect(proteinLabel(lines("1 can lentils (400 g)"), 4).applies).toBe(false); // canned, so 150 g rule
  });

  it("adds up a mix of sources", () => {
    // 50 g chicken (half) + 75 g chickpeas (half) per serving
    const result = proteinLabel(lines("200 g chicken breast", "300 g chickpeas, drained"), 4);
    expect(result.applies).toBe(true);
    expect(result.counted).toHaveLength(2);
  });

  it("counts eggs by number", () => {
    expect(proteinLabel(lines("4 eggs"), 2).applies).toBe(true);
    expect(proteinLabel(lines("2 eggs"), 2).applies).toBe(false);
  });

  it("does not count look-alikes", () => {
    const result = proteinLabel(
      lines("1 l chicken stock", "200 g green beans", "2 beef tomatoes", "200 g egg noodles"),
      1,
    );
    expect(result).toEqual({ applies: false, counted: [], notCounted: [] });
  });

  it("ignores optional ingredients", () => {
    expect(proteinLabel(lines("400 g halloumi (optional)"), 2).applies).toBe(false);
  });

  it("lists protein ingredients without a weight instead of guessing", () => {
    const result = proteinLabel(lines("4 chicken thighs"), 2);
    expect(result).toEqual({ applies: false, counted: [], notCounted: ["4 chicken thighs"] });
  });
});

describe("carbLabel", () => {
  it("counts uncooked grains and potatoes", () => {
    expect(carbLabel(lines("300 g basmati rice, to serve"), 4).applies).toBe(true); // 75 g
    expect(carbLabel(lines("400 g spaghetti"), 4).applies).toBe(true);
    expect(carbLabel(lines("1 kg potatoes"), 4).applies).toBe(true); // 250 g
    expect(carbLabel(lines("2 sweet potatoes (about 700 g)"), 4).applies).toBe(false); // 175 g
  });

  it("does not count rice vinegar, flour or tortillas", () => {
    const result = carbLabel(lines("2 tbsp rice vinegar", "200 g flour", "8 small tortillas"), 2);
    expect(result).toEqual({ applies: false, counted: [], notCounted: [] });
  });
});

describe("labels for the template recipes", () => {
  it("gives the expected labels", async () => {
    const files = await readTemplateFixtures();
    const labels = Object.fromEntries(
      files.map((file) => {
        const recipe = parseRecipeFile(file.fileName, file.text).recipe!;
        const parsed = recipe.ingredients.map((i) => parseIngredientLine(i.line));
        return [
          recipe.title.split(" ")[0],
          [proteinLabel(parsed, recipe.servings).applies, carbLabel(parsed, recipe.servings).applies],
        ];
      }),
    );
    expect(labels).toEqual({
      Tadka: [true, true], // 62.5 g dry lentils; 75 g rice
      Chicken: [true, false], // 150 g chicken; flatbreads aren't counted
      Black: [true, false], // 200 g black beans; 175 g sweet potato
    });
  });
});
