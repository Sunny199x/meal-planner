"use server";

import { requireSignedIn } from "@/lib/auth/server";
import { describeDatabaseError, getDb } from "@/lib/db";
import { recipesChanged } from "@/lib/recipes/changed";
import { loadRecipeFiles, type LoadReport } from "@/lib/recipes/load-files";
import { readRecipeFiles } from "@/lib/recipes/read-files";

export type LoadState = { report?: LoadReport; error?: string; reset?: boolean };

export async function loadFromFiles(): Promise<LoadState> {
  await requireSignedIn();
  return run(false);
}

export async function resetEverything(_prev: LoadState, formData: FormData): Promise<LoadState> {
  await requireSignedIn();
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "RESET") {
    return { error: "Type RESET in the box to confirm.", reset: true };
  }
  return run(true);
}

async function run(reset: boolean): Promise<LoadState> {
  let files;
  try {
    files = await readRecipeFiles();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { error: `Couldn't read the recipe files in seed-recipes/ (${message}).`, reset };
  }
  try {
    const report = await loadRecipeFiles(await getDb(), files, { reset });
    recipesChanged();
    return { report, reset };
  } catch (error) {
    return { error: describeDatabaseError(error), reset };
  }
}
