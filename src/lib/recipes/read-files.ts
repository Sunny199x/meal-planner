import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

// The folder is written out in each call (not passed in) so the build can see
// exactly which files the app reads and include only those on Vercel.

/** Every .md file in seed-recipes/ except the README, sorted by name. */
export async function readRecipeFiles() {
  const names = (await readdir(path.join(process.cwd(), "seed-recipes")))
    .filter((name) => name.toLowerCase().endsWith(".md") && name.toLowerCase() !== "readme.md")
    .sort();
  return Promise.all(
    names.map(async (fileName) => ({
      fileName,
      text: await readFile(path.join(process.cwd(), "seed-recipes", fileName), "utf8"),
    })),
  );
}
