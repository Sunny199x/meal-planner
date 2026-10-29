"use server";

import { eq } from "drizzle-orm";
import { requireSignedIn } from "../auth/server";
import { getDb } from "../db";
import { recipes } from "../db/schema";
import { recipesChanged } from "./changed";
import { isRecipeId } from "./queries";

/** Favourites are shared by the household, so both phones see the same hearts. */
export async function setFavourite(id: string, favourite: boolean) {
  await requireSignedIn();
  if (!isRecipeId(id)) return;
  const db = await getDb();
  await db.update(recipes).set({ isFavourite: favourite }).where(eq(recipes.id, id));
  recipesChanged();
}
