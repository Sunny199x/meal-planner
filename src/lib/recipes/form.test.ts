import { describe, expect, it } from "vitest";
import {
  EMPTY_FORM,
  formValuesFromFormData,
  parseRecipeForm,
  readIngredientLines,
  readInstructions,
  readMakeAhead,
  recipeToFormValues,
  type RecipeFormValues,
} from "./form";
import { parseRecipeFile } from "./parse-recipe-file";
import { readRecipeFiles } from "./read-files";

const valid: RecipeFormValues = {
  ...EMPTY_FORM,
  title: " Chana masala ",
  source: "Own recipe",
  servings: "4",
  timeTotalMin: "40",
  timeActiveMin: "15",
  cuisine: "Indian",
  diet: "vegan",
  tags: "one-pot, weeknight,",
  ingredients: "- 2 cans chickpeas (400 g each), drained\n\n### For the masala\n1 onion, chopped",
  instructions: "1. Fry the onion.\n2) Add the chickpeas.\nSimmer.",
  makeAhead: "Chop aromatics: chop the onion",
};

describe("parseRecipeForm", () => {
  it("turns a filled-in form into a recipe", () => {
    const { recipe, fieldErrors, warnings } = parseRecipeForm(valid);
    expect(fieldErrors).toEqual({});
    expect(warnings).toEqual([]);
    expect(recipe).toEqual({
      title: "Chana masala",
      source: "Own recipe",
      sourceUrl: null,
      servings: 4,
      timeTotalMin: 40,
      timeActiveMin: 15,
      cuisine: "Indian",
      diet: "vegan",
      mainProtein: null,
      freezerFriendly: false,
      goodAsLeftovers: false,
      tags: ["one-pot", "weeknight"],
      isTemplate: false,
      ingredients: [
        { line: "2 cans chickpeas (400 g each), drained", group: null },
        { line: "1 onion, chopped", group: "For the masala" },
      ],
      instructions: ["Fry the onion.", "Add the chickpeas.", "Simmer."],
      makeAhead: [{ name: "Chop aromatics", description: "chop the onion" }],
      notes: null,
    });
  });

  it("explains every missing or wrong field", () => {
    const { recipe, fieldErrors } = parseRecipeForm({
      ...EMPTY_FORM,
      servings: "four",
      timeTotalMin: "0",
      timeActiveMin: "abc",
      sourceUrl: "www.example.com",
    });
    expect(recipe).toBeNull();
    expect(Object.keys(fieldErrors).sort()).toEqual(
      ["cuisine", "diet", "ingredients", "servings", "source", "sourceUrl", "timeActiveMin", "timeTotalMin", "title"].sort(),
    );
  });

  it("refuses hands-on time longer than the total", () => {
    const { fieldErrors } = parseRecipeForm({ ...valid, timeActiveMin: "60" });
    expect(fieldErrors.timeActiveMin).toMatch(/can't be longer/);
  });

  it("saves with warnings for unreadable lines, unnamed prep and seafood", () => {
    const { recipe, warnings } = parseRecipeForm({
      ...valid,
      ingredients: "2 cups rice\n200 g prawns",
      makeAhead: "chop everything",
    });
    expect(recipe).not.toBeNull();
    expect(warnings).toEqual([
      '"2 cups rice": "cups" isn\'t a metric unit. Please use g, kg, ml, dl, l, tsp or tbsp.',
      'Make ahead "chop everything" has no name. Write it as "Name: what to do" so it can be matched with other recipes.',
      'Contains seafood ("prawns"). It will be marked and never suggested.',
    ]);
  });
});

describe("text box readers", () => {
  it("reads ingredient groups and bullets", () => {
    expect(readIngredientLines("* 1 onion\n## Sauce:\n- 200 g yoghurt")).toEqual([
      { line: "1 onion", group: null },
      { line: "200 g yoghurt", group: "Sauce" },
    ]);
  });

  it("removes step numbers", () => {
    expect(readInstructions("1. A\n\n 10) B \n- C")).toEqual(["A", "B", "C"]);
  });

  it("splits make-ahead tasks at the first colon", () => {
    expect(readMakeAhead("Garlic yoghurt: stir in 1 garlic clove: grated").tasks).toEqual([
      { name: "Garlic yoghurt", description: "stir in 1 garlic clove: grated" },
    ]);
  });
});

describe("editing a recipe", () => {
  it("fills the form so that saving unchanged gives back the same recipe", async () => {
    for (const file of await readRecipeFiles()) {
      const recipe = parseRecipeFile(file.fileName, file.text).recipe!;
      const roundTrip = parseRecipeForm(recipeToFormValues(recipe)).recipe;
      expect(roundTrip).toEqual({ ...recipe, isTemplate: false });
    }
  });

  it("reads checkboxes and text from submitted form data", () => {
    const data = new FormData();
    data.set("title", "Daal");
    data.set("freezerFriendly", "on");
    const values = formValuesFromFormData(data);
    expect(values).toMatchObject({ title: "Daal", freezerFriendly: true, goodAsLeftovers: false, notes: "" });
  });
});
