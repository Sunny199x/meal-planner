"use server";

import { requireSignedIn } from "../auth/server";
import { describeDatabaseError, getDb } from "../db";
import { formValuesFromFormData, parseRecipeForm, type FieldErrors } from "./form";
import { isRecipeId } from "./queries";
import { deleteRecipe, insertRecipe, updateRecipe } from "./save";

// After a save or delete these actions return the page to open next, and the
// browser loads it as a normal full page load. Next.js otherwise first shows a
// copy of that page it kept from before the change, which looks as if the
// change didn't work.

export type RecipeFormState = { fieldErrors?: FieldErrors; error?: string; openNext?: string };

/** "?saved=1" shows a "Saved" message on the recipe page (see SavedNotice). */
function savedUrl(id: string) {
  return `/recipes/${id}?saved=1`;
}

export async function createRecipeAction(_prev: RecipeFormState, data: FormData): Promise<RecipeFormState> {
  await requireSignedIn();
  const { recipe, fieldErrors } = parseRecipeForm(formValuesFromFormData(data));
  if (!recipe) return { fieldErrors };
  try {
    return { openNext: savedUrl(await insertRecipe(await getDb(), recipe)) };
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
}

export async function updateRecipeAction(
  id: string,
  _prev: RecipeFormState,
  data: FormData,
): Promise<RecipeFormState> {
  await requireSignedIn();
  if (!isRecipeId(id)) return { error: "This recipe doesn't exist." };
  const { recipe, fieldErrors } = parseRecipeForm(formValuesFromFormData(data));
  if (!recipe) return { fieldErrors };
  let found: boolean;
  try {
    found = await updateRecipe(await getDb(), id, recipe);
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
  if (!found) return { error: "This recipe no longer exists. It may have been deleted on another phone." };
  return { openNext: savedUrl(id) };
}

export async function deleteRecipeAction(id: string): Promise<{ error?: string; deleted?: boolean }> {
  await requireSignedIn();
  if (!isRecipeId(id)) return { error: "This recipe doesn't exist." };
  try {
    await deleteRecipe(await getDb(), id);
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
  return { deleted: true };
}
