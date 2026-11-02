// "Load recipes from files": brings recipes from seed-recipes/ into the database.
// - Recipes from files are added or updated; favourites are kept.
// - A file recipe edited in the app is left alone (the report says so).
// - If a file is deleted, its recipe is removed, unless it was edited in the
//   app, in which case it is kept as an app recipe.
// - A file that can't be read leaves the previous version in place.
// - Recipes added in the app are never touched, except by "Reset everything",
//   which deletes every recipe (and its photo), every planned week, every liked
//   combination and the record of what was suggested, before loading the files.
//   The grocery list, prep limits and the usual week stay.
import { and, count, eq, sql } from "drizzle-orm";
import { likedCombinations, recipes, suggestionEvents, weekPlans } from "../db/schema";
import type { Db } from "../db/types";
import { parseRecipeFile } from "./parse-recipe-file";
import type { Problem, RecipeContent } from "./types";

export type FileStatus = "added" | "updated" | "skipped-edited" | "not-loaded";

export type FileReport = {
  fileName: string;
  title: string | null;
  status: FileStatus;
  problems: Problem[];
};

export type LoadReport = {
  files: FileReport[];
  removed: string[];
  keptAsAppRecipes: string[];
  totalRecipes: number;
};

const CONTENT_COLUMNS = {
  title: "title",
  source: "source",
  sourceUrl: "source_url",
  servings: "servings",
  timeTotalMin: "time_total_min",
  timeActiveMin: "time_active_min",
  cuisine: "cuisine",
  diet: "diet",
  mainProtein: "main_protein",
  freezerFriendly: "freezer_friendly",
  goodAsLeftovers: "good_as_leftovers",
  tags: "tags",
  isTemplate: "is_template",
  ingredients: "ingredients",
  instructions: "instructions",
  makeAhead: "make_ahead",
  notes: "notes",
} satisfies Record<keyof RecipeContent, string>;

export async function loadRecipeFiles(
  db: Db,
  files: { fileName: string; text: string }[],
  { reset = false }: { reset?: boolean } = {},
): Promise<LoadReport> {
  const parsed = files.map((file) => ({ file, ...parseRecipeFile(file.fileName, file.text) }));

  if (reset) {
    await db.delete(suggestionEvents);
    await db.delete(likedCombinations);
    await db.delete(weekPlans);
    await db.delete(recipes);
  }

  const existing = await db
    .select({ slug: recipes.fileSlug, title: recipes.title, editedInApp: recipes.editedInApp })
    .from(recipes)
    .where(eq(recipes.origin, "file"));
  const existingBySlug = new Map(existing.map((row) => [row.slug!, row]));

  const reports: FileReport[] = [];
  const rows: (typeof recipes.$inferInsert)[] = [];
  for (const { file, slug, recipe, problems } of parsed) {
    const before = existingBySlug.get(slug);
    if (!recipe) {
      reports.push({ fileName: file.fileName, title: before?.title ?? null, status: "not-loaded", problems });
    } else if (before?.editedInApp) {
      reports.push({ fileName: file.fileName, title: before.title, status: "skipped-edited", problems });
    } else {
      rows.push({ ...recipe, origin: "file", fileSlug: slug, editedInApp: false });
      reports.push({ fileName: file.fileName, title: recipe.title, status: before ? "updated" : "added", problems });
    }
  }

  if (rows.length) {
    const set = Object.fromEntries(
      Object.entries(CONTENT_COLUMNS).map(([key, column]) => [key, sql.raw(`excluded."${column}"`)]),
    );
    await db
      .insert(recipes)
      .values(rows)
      .onConflictDoUpdate({ target: recipes.fileSlug, set: { ...set, updatedAt: sql`now()` } });
  }

  const presentSlugs = new Set(parsed.map((p) => p.slug));
  const removed: string[] = [];
  const keptAsAppRecipes: string[] = [];
  for (const row of existing) {
    if (presentSlugs.has(row.slug!)) continue;
    const match = and(eq(recipes.origin, "file"), eq(recipes.fileSlug, row.slug!));
    if (row.editedInApp) {
      await db.update(recipes).set({ origin: "app", fileSlug: null }).where(match);
      keptAsAppRecipes.push(row.title);
    } else {
      await db.delete(recipes).where(match);
      removed.push(row.title);
    }
  }

  const [{ total }] = await db.select({ total: count() }).from(recipes);
  return { files: reports, removed, keptAsAppRecipes, totalRecipes: total };
}
