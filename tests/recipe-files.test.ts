// The GitHub check runs this on every pull request: every file in
// seed-recipes/ must load without errors. Warnings are printed but allowed.
import { describe, expect, it } from "vitest";
import { parseRecipeFile } from "@/lib/recipes/parse-recipe-file";
import { readRecipeFiles } from "@/lib/recipes/read-files";

const files = await readRecipeFiles();

describe("recipe files in seed-recipes/", () => {
  // The folder may be empty: the household started its collection afresh on 2 November 2026.
  it("names files in lowercase with hyphens", () => {
    const badNames = files.map((f) => f.fileName).filter((name) => !/^_?[a-z0-9]+(-[a-z0-9]+)*\.md$/.test(name));
    expect(badNames, "Rename these files in seed-recipes/ (e.g. chicken-tikka.md)").toEqual([]);
  });

  it.each(files.map((f) => [f.fileName, f.text]))("%s can be read", (fileName, text) => {
    const { problems } = parseRecipeFile(fileName, text);
    for (const warning of problems.filter((p) => p.level === "warning")) {
      console.warn(`${fileName}: ${warning.message}`);
    }
    const errors = problems.filter((p) => p.level === "error").map((p) => p.message);
    expect(errors, `Fix these in seed-recipes/${fileName}`).toEqual([]);
  });

  it("has no two files with the same title", () => {
    const titles = files
      .map((f) => parseRecipeFile(f.fileName, f.text).recipe?.title.toLowerCase())
      .filter(Boolean);
    expect(titles.length).toBe(new Set(titles).size);
  });
});
