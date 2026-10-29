import { describe, expect, it } from "vitest";
import { parseRecipeFile } from "./parse-recipe-file";
import { readTemplateFixtures } from "./test-fixtures";

const minimal = (top: string, body = "## Ingredients\n\n- 1 onion\n\n## Instructions\n\n1. Cook.\n") =>
  `---\n${top}\n---\n\n${body}`;

const validTop = [
  "title: Test dish",
  "source: Own recipe",
  "servings: 2",
  "time_total_min: 20",
  "cuisine: Indian",
  "diet: vegetarian",
  "freezer_friendly: false",
  "good_as_leftovers: true",
].join("\n");

describe("parseRecipeFile with the template recipes", () => {
  it("reads the tadka daal completely", async () => {
    const files = await readTemplateFixtures();
    const daal = files.find((f) => f.fileName === "_template-tadka-daal.md")!;
    const { slug, recipe, problems } = parseRecipeFile(daal.fileName, daal.text);

    expect(problems).toEqual([]);
    expect(slug).toBe("_template-tadka-daal");
    expect(recipe).toMatchObject({
      title: "Tadka daal with spinach",
      source: "Illustrative template written by Claude (untested)",
      sourceUrl: null,
      servings: 4,
      timeTotalMin: 35,
      timeActiveMin: 20,
      cuisine: "Indian",
      diet: "vegetarian",
      mainProtein: "lentils",
      freezerFriendly: true,
      goodAsLeftovers: true,
      tags: ["one-pot", "comfort"],
      isTemplate: true,
    });
    expect(recipe!.ingredients).toHaveLength(16);
    expect(recipe!.ingredients[0]).toEqual({ line: "250 g red lentils, rinsed", group: null });
    expect(recipe!.instructions).toHaveLength(6);
    expect(recipe!.instructions[0]).toMatch(/^Put the lentils/);
    expect(recipe!.makeAhead).toEqual([
      { name: "Chop aromatics", description: "finely chop the onion, garlic, ginger and chilli." },
      {
        name: "Cook the daal base",
        description: "do step 1 only. On the night, make the tadka (steps 3–4), stir it in and add the spinach.",
      },
    ]);
    expect(recipe!.notes).toMatch(/^The daal base/);
  });

  it("finds the shared make-ahead task between the shawarma and the tacos", async () => {
    const files = await readTemplateFixtures();
    const names = files.map((f) => parseRecipeFile(f.fileName, f.text).recipe!.makeAhead.map((m) => m.name));
    const pickled = names.filter((list) => list.includes("Quick-pickled red onions"));
    expect(pickled).toHaveLength(2);
  });
});

describe("parseRecipeFile problems", () => {
  it("accepts a minimal valid recipe", () => {
    const { recipe, problems } = parseRecipeFile("test.md", minimal(validTop));
    expect(problems).toEqual([]);
    expect(recipe?.title).toBe("Test dish");
    expect(recipe?.isTemplate).toBe(false);
  });

  it("refuses a file without the top section", () => {
    const { recipe, problems } = parseRecipeFile("x.md", "## Ingredients\n- 1 onion\n");
    expect(recipe).toBeNull();
    expect(problems[0].message).toMatch(/top section/);
  });

  it("refuses broken YAML with a readable message", () => {
    const { recipe, problems } = parseRecipeFile("x.md", "---\ntitle: [unclosed\n---\n");
    expect(recipe).toBeNull();
    expect(problems[0]).toMatchObject({ level: "error" });
    expect(problems[0].message).toMatch(/couldn't be read/);
  });

  it("lists every missing or wrong required field", () => {
    const { recipe, problems } = parseRecipeFile(
      "x.md",
      minimal("title: Test\nservings: two\ndiet: pescatarian", "## Instructions\n1. Cook."),
    );
    expect(recipe).toBeNull();
    expect(problems.filter((p) => p.level === "error").map((p) => p.message)).toEqual([
      '"source" is missing.',
      '"cuisine" is missing.',
      '"servings" must be a whole number above 0.',
      '"time_total_min" must be a whole number of minutes above 0.',
      '"diet" must be vegetarian, vegan or meat.',
      '"freezer_friendly" must be true or false.',
      '"good_as_leftovers" must be true or false.',
      'No ingredients found. List them under "## Ingredients", one per line starting with "- ".',
    ]);
  });

  it("loads with warnings for unknown fields, odd lines and non-metric units", () => {
    const text = minimal(
      validTop + "\ncusine: Thai\nsource_url: not a link",
      "## Ingredients\n\n- 2 cups flour\n1 egg\n\n## Method\n\n1. Mix.\n   Then bake.\n\n## Variations\n\nnone\n",
    );
    const { recipe, problems } = parseRecipeFile("x.md", text);
    expect(recipe).not.toBeNull();
    expect(recipe!.ingredients.map((i) => i.line)).toEqual(["2 cups flour", "1 egg"]);
    expect(recipe!.instructions).toEqual(["Mix. Then bake."]);
    expect(problems.map((p) => p.message)).toEqual([
      'Unknown field "cusine" in the top section was ignored.',
      '"source_url" should be a web address starting with http:// or https://, so it was ignored.',
      'Line 17: ingredient lines should start with "- ".',
      'Line 24: unknown section "## Variations" was ignored.',
      'Line 26 is outside any section and was ignored.',
      'Line 16 ("2 cups flour"): "cups" isn\'t a metric unit. Please use g, kg, ml, dl, l, tsp or tbsp.',
    ]);
    expect(problems.every((p) => p.level === "warning")).toBe(true);
  });

  it("warns about seafood", () => {
    const { recipe, problems } = parseRecipeFile(
      "x.md",
      minimal(validTop, "## Ingredients\n\n- 200 g prawns\n- 1 tbsp Worcestershire sauce\n"),
    );
    expect(recipe).not.toBeNull();
    expect(problems.map((p) => p.message)).toEqual([
      'No instructions found under "## Instructions".',
      'Contains seafood ("prawns"). It will be marked and never suggested.',
      '"Worcestershire sauce" may contain fish. Check the label, or use a vegetarian version.',
    ]);
  });

  it("keeps ingredient groups", () => {
    const { recipe } = parseRecipeFile(
      "x.md",
      minimal(validTop, "## Ingredients\n\n- 1 onion\n\n### For the sauce:\n\n- 200 g yoghurt\n"),
    );
    expect(recipe!.ingredients).toEqual([
      { line: "1 onion", group: null },
      { line: "200 g yoghurt", group: "For the sauce" },
    ]);
  });
});
