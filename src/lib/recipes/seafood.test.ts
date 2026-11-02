import { describe, expect, it } from "vitest";
import { checkRecipeForSeafood, findSeafood } from "./seafood";

describe("findSeafood", () => {
  it.each([
    ["salmon fillets", "salmon"],
    ["raw king prawns", "prawns"],
    ["fish sauce", "fish"],
    ["fresh oysters", "oysters"],
    ["anchovies in oil", "anchovies"],
    ["tonfisk i vatten", "tonfisk"],
    ["räkor", "räkor"],
    ["frozen cod", "cod"],
    ["smoked-salmon trimmings", "salmon"],
  ])("flags %s", (text, term) => {
    expect(findSeafood(text)).toMatchObject({ term, level: "contains" });
  });

  it.each(["Worcestershire sauce", "Thai red curry paste", "kimchi"])(
    "warns that %s may contain fish",
    (text) => {
      expect(findSeafood(text)).toMatchObject({ level: "may contain" });
    },
  );

  it.each([
    "Oyster sauce", // the household allows it
    "oyster mushrooms",
    "vegan fish sauce",
    "codswallop",
    "crabapple jelly",
    "fishcake-free",
    "relaxed",
    "lime",
    "red lentils",
    "silken tofu",
    "vegan Worcestershire sauce",
  ])("does not flag %s", (text) => {
    expect(findSeafood(text)).toBeNull();
  });
});

describe("checkRecipeForSeafood", () => {
  it("checks the title and each ingredient", () => {
    const findings = checkRecipeForSeafood({
      title: "Prawn curry",
      ingredients: [{ name: "prawns" }, { name: "onion" }, { name: "Worcestershire sauce" }],
    });
    expect(findings.map((f) => [f.text, f.level])).toEqual([
      ["Prawn curry", "contains"],
      ["prawns", "contains"],
      ["Worcestershire sauce", "may contain"],
    ]);
  });

  it("finds nothing in a vegetarian daal", () => {
    expect(
      checkRecipeForSeafood({ title: "Tadka daal", ingredients: [{ name: "red lentils" }] }),
    ).toEqual([]);
  });
});
