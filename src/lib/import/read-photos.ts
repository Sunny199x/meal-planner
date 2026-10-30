// Photos of a recipe (cookbook pages, a handwritten card, screenshots) sent for
// Claude to read. The phone shrinks them first (see shrink-photo.ts); this checks
// what arrives. They are only read, never stored.
import { MAX_PHOTO_BYTES, photoType } from "../recipes/photos";
import { MAX_READ_PHOTOS } from "./photo-limits";

export { MAX_READ_PHOTOS };

export type ReadPhoto = { type: "image/jpeg" | "image/png" | "image/webp"; base64: string };

export async function readPhotos(entries: FormDataEntryValue[]): Promise<{ photos: ReadPhoto[] } | { error: string }> {
  if (entries.length > MAX_READ_PHOTOS) return { error: `Up to ${MAX_READ_PHOTOS} photos at a time.` };
  const photos: ReadPhoto[] = [];
  for (const entry of entries) {
    if (!(entry instanceof Blob)) return { error: "Something wasn't valid. Please reload and try again." };
    if (entry.size > MAX_PHOTO_BYTES) return { error: "A photo is too large, even after shrinking." };
    const bytes = new Uint8Array(await entry.arrayBuffer());
    const type = photoType(bytes);
    if (!type) return { error: "One of the files isn't a photo the app can read (JPEG, PNG or WebP)." };
    photos.push({ type, base64: Buffer.from(bytes).toString("base64") });
  }
  return { photos };
}
