"use server";

import { eq } from "drizzle-orm";
import { requireSignedIn } from "../auth/server";
import { describeDatabaseError, getDb } from "../db";
import { recipes } from "../db/schema";
import { recipesChanged } from "./changed";
import { MAX_PHOTO_BYTES, photoType, removeRecipePhoto, saveRecipePhoto } from "./photos";
import { isRecipeId } from "./queries";

/** Favourites are shared by the household, so both phones see the same hearts. */
export async function setFavourite(id: string, favourite: boolean) {
  await requireSignedIn();
  if (!isRecipeId(id)) return;
  const db = await getDb();
  await db.update(recipes).set({ isFavourite: favourite }).where(eq(recipes.id, id));
  recipesChanged();
}

/** Adds or replaces a recipe's photo; the phone shrinks it before sending (see shrink-photo.ts). */
export async function setRecipePhotoAction(formData: FormData): Promise<{ error?: string }> {
  await requireSignedIn();
  const id = formData.get("id");
  const photo = formData.get("photo");
  if (typeof id !== "string" || !isRecipeId(id) || !(photo instanceof Blob)) {
    return { error: "Something wasn't valid. Please reload and try again." };
  }
  if (photo.size > MAX_PHOTO_BYTES) return { error: "That photo is too large, even after shrinking." };
  const bytes = new Uint8Array(await photo.arrayBuffer());
  if (!photoType(bytes)) return { error: "That file isn't a photo the app can use (JPEG, PNG or WebP)." };
  try {
    const saved = await saveRecipePhoto(await getDb(), id, bytes, "upload");
    if (!saved) return { error: "This recipe no longer exists." };
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
  recipesChanged();
  return {};
}

export async function removeRecipePhotoAction(id: string): Promise<{ error?: string }> {
  await requireSignedIn();
  if (!isRecipeId(id)) return { error: "Something wasn't valid. Please reload and try again." };
  try {
    await removeRecipePhoto(await getDb(), id);
  } catch (error) {
    return { error: describeDatabaseError(error) };
  }
  recipesChanged();
  return {};
}
