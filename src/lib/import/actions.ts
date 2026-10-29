"use server";

import { requireSignedIn } from "../auth/server";
import { describeDatabaseError } from "../db";
import { getImportHousehold } from "../recipes/queries";
import { normalise, type Household, type Normalised } from "./normalise";
import { readWithClaude } from "./read-with-claude";
import { fakeClaude } from "./test-reader";

export type ImportResult = { normalised?: Normalised; language?: string; error?: string };

/** True when a recipe can be read: the API key is set (or a local test server uses the stand-in). */
export async function readerReady(): Promise<boolean> {
  return process.env.IMPORT_TEST_READER === "1" || Boolean(process.env.ANTHROPIC_API_KEY);
}

/** Reads pasted recipe text with Claude, then runs the normalising layer for the review screen. */
export async function readRecipeTextAction(text: string, from: string): Promise<ImportResult> {
  await requireSignedIn();
  const clean = typeof text === "string" ? text.trim() : "";
  if (!clean) return { error: "Paste the recipe text first." };
  if (!(await readerReady())) {
    return {
      error: "Reading recipes needs an Anthropic API key. Add ANTHROPIC_API_KEY in Vercel's environment variables, then try again.",
    };
  }
  const source = { name: (typeof from === "string" && from.trim().slice(0, 80)) || "Pasted text", url: null };
  const testing = process.env.IMPORT_TEST_READER === "1";
  const result = await readWithClaude(clean, source, testing ? fakeClaude() : undefined);
  if ("error" in result) return { error: result.error };
  let household: Household;
  try {
    household = await getImportHousehold();
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
  return { normalised: normalise(result.draft, household), language: result.language };
}
