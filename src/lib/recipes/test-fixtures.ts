import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// Tests that check exact results for the three template recipes read these copies
// in __fixtures__/, not seed-recipes/. That folder holds the household's real
// recipes, which keep changing (and the templates will be deleted from it).

/** The template recipe files kept for tests, sorted by name. */
export async function readTemplateFixtures() {
  const folder = path.join(process.cwd(), "src", "lib", "recipes", "__fixtures__");
  const names = (await readdir(folder)).filter((name) => name.toLowerCase().endsWith(".md")).sort();
  return Promise.all(
    names.map(async (fileName) => ({
      fileName,
      text: await readFile(path.join(folder, fileName), "utf8"),
    })),
  );
}
