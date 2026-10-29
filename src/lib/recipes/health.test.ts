import { describe, expect, it } from "vitest";
import { checkRecipes } from "./health";

const recipe = (id: string, extra: Partial<Parameters<typeof checkRecipes>[0][number]> = {}) => ({
  id,
  title: id,
  origin: "app" as const,
  isTemplate: false,
  cuisine: "Indian",
  mainProtein: "lentils",
  ingredients: [{ line: "200 g red lentils", group: null }],
  makeAhead: [{ name: "Cook rice", description: "" }],
  ...extra,
});

describe("the recipe check", () => {
  it("lists what stops a recipe working well with the suggestions", () => {
    const result = checkRecipes([
      recipe("fine"),
      recipe("bare", { makeAhead: [], mainProtein: null, cuisine: " " }),
      recipe("prawns", { ingredients: [{ line: "200 g prawns", group: null }, { line: "2 cups rice", group: null }] }),
    ]);
    expect(result.recipes).toEqual([
      {
        id: "bare",
        title: "bare",
        fromFile: false,
        issues: [
          "No make-ahead tasks, so it can never share prep with another dish.",
          "No cuisine, so the variety rules can't use it.",
          "No main protein, so the variety rules can't use it.",
        ],
      },
      {
        id: "prawns",
        title: "prawns",
        fromFile: false,
        issues: ["Lines the app couldn't fully read: “2 cups rice”.", "Contains seafood, so it is never suggested."],
      },
    ]);
  });

  it("finds make-ahead tasks that are probably the same but named differently", () => {
    const result = checkRecipes([
      recipe("a", { makeAhead: [{ name: "Cook rice", description: "" }] }),
      recipe("b", { makeAhead: [{ name: "Cook the rice.", description: "" }] }),
      recipe("c", { makeAhead: [{ name: "Make rice", description: "" }] }),
      recipe("d", { makeAhead: [{ name: "Garlic yoghurt", description: "" }, { name: "Garlic sauce", description: "" }] }),
    ]);
    expect(result.similarTasks).toEqual([
      {
        names: [
          { name: "Cook rice", recipes: [{ id: "a", title: "a" }, { id: "b", title: "b" }] },
          { name: "Make rice", recipes: [{ id: "c", title: "c" }] },
        ],
      },
    ]);
  });
});
