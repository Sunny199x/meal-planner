// Recipe photos: checking an upload, and storing, reading and removing it.
import { eq, sql } from "drizzle-orm";
import { recipePhotos, recipes } from "../db/schema";
import type { Db } from "../db/types";

/** Shrunk photos are well under this; the limit stops anything unexpectedly large. */
export const MAX_PHOTO_BYTES = 1_000_000;

export type PhotoSource = "upload" | "website" | "video";

/** The image type from the file's first bytes (not its name or label), or null if it isn't a JPEG, PNG or WebP image. */
export function photoType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  const starts = (...values: number[]) => values.every((v, i) => bytes[i] === v);
  if (starts(0xff, 0xd8, 0xff)) return "image/jpeg";
  if (starts(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a)) return "image/png";
  if (starts(0x52, 0x49, 0x46, 0x46) && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

/** Stores (or replaces) a recipe's photo. Returns false if the recipe doesn't exist. */
export async function saveRecipePhoto(
  db: Db,
  recipeId: string,
  bytes: Uint8Array,
  source: PhotoSource,
  sourceUrl: string | null = null,
): Promise<boolean> {
  const contentType = photoType(bytes);
  if (!contentType || bytes.length > MAX_PHOTO_BYTES) throw new Error("Not a supported photo.");
  const version = Date.now().toString(36);
  const [recipe] = await db
    .update(recipes)
    .set({ photoVersion: version })
    .where(eq(recipes.id, recipeId))
    .returning({ id: recipes.id });
  if (!recipe) return false;
  const values = { contentType, data: Buffer.from(bytes).toString("base64"), source, sourceUrl };
  await db
    .insert(recipePhotos)
    .values({ recipeId, ...values })
    .onConflictDoUpdate({ target: recipePhotos.recipeId, set: { ...values, updatedAt: sql`now()` } });
  return true;
}

export async function getRecipePhoto(db: Db, recipeId: string): Promise<{ contentType: string; bytes: Buffer } | null> {
  const [row] = await db
    .select({ contentType: recipePhotos.contentType, data: recipePhotos.data })
    .from(recipePhotos)
    .where(eq(recipePhotos.recipeId, recipeId));
  return row ? { contentType: row.contentType, bytes: Buffer.from(row.data, "base64") } : null;
}

export async function removeRecipePhoto(db: Db, recipeId: string): Promise<void> {
  await db.delete(recipePhotos).where(eq(recipePhotos.recipeId, recipeId));
  await db.update(recipes).set({ photoVersion: null }).where(eq(recipes.id, recipeId));
}
