"use server";

import { requireSignedIn } from "../auth/server";
import { describeDatabaseError } from "../db";
import { getImportHousehold } from "../recipes/queries";
import { normalise, type Household, type Normalised } from "./normalise";
import { photoType } from "../recipes/photos";
import { fetchPublic } from "./fetch-page";
import { readWithClaude } from "./read-with-claude";
import { NO_RECIPE_IN_VIDEO, prepareImport } from "./sources";
import { fakeClaude } from "./test-reader";

export type ImportResult = { normalised?: Normalised; language?: string; photo?: string | null; error?: string };

/** True when YouTube links can be read on their own (YOUTUBE_API_KEY is set). */
export async function youtubeReady(): Promise<boolean> {
  return Boolean(process.env.YOUTUBE_API_KEY);
}

/** True when a recipe can be read: the API key is set (or a local test server uses the stand-in). */
export async function readerReady(): Promise<boolean> {
  return process.env.IMPORT_TEST_READER === "1" || Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Reads a recipe from a link, pasted text or both (see sources.ts) with Claude,
 * then runs the normalising layer for the review screen.
 */
export async function readRecipeAction(link: string, text: string, from: string): Promise<ImportResult> {
  await requireSignedIn();
  if (typeof link !== "string" || typeof text !== "string" || typeof from !== "string") {
    return { error: "Something wasn't valid. Please reload and try again." };
  }
  if (!(await readerReady())) {
    return {
      error: "Reading recipes needs an Anthropic API key. Add ANTHROPIC_API_KEY in Vercel's environment variables, then try again.",
    };
  }
  const prepared = await prepareImport(link, text, from);
  if ("error" in prepared) return { error: prepared.error };
  const testing = process.env.IMPORT_TEST_READER === "1";
  const result = await readWithClaude(prepared.text, prepared.source, testing ? fakeClaude() : undefined);
  if ("error" in result) {
    return { error: result.notARecipe && prepared.fromVideoDescription ? NO_RECIPE_IN_VIDEO : result.error };
  }
  let household: Household;
  try {
    household = await getImportHousehold();
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
  return { normalised: normalise(result.draft, household), language: result.language, photo: prepared.photo };
}

/** Fetches a photo found during an import, so the phone can shrink it and save it with the recipe. */
export async function fetchPhotoAction(url: string): Promise<{ base64?: string; type?: string; error?: string }> {
  await requireSignedIn();
  if (typeof url !== "string") return { error: "No photo address." };
  const fetched = await fetchPublic(url, { accept: "image/*", maxBytes: 8_000_000 });
  if (!fetched.ok) return { error: fetched.error };
  const type = photoType(fetched.body);
  if (!type) return { error: "The photo isn't a JPEG, PNG or WebP image." };
  return { base64: Buffer.from(fetched.body).toString("base64"), type };
}
