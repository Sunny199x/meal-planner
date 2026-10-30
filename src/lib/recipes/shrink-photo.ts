// Shrinks a photo on the phone before it is sent: about 1,200 pixels on the
// long side as a JPEG, which keeps it near 150 KB instead of several MB.

const LONG_SIDE = 1200;
/** Photos of a recipe for Claude to read are kept larger so small print stays legible. */
export const READING_LONG_SIDE = 2000;
const LIMIT = 900_000;

export async function shrinkPhoto(file: File, longSide = LONG_SIDE): Promise<Blob> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    throw new Error("That file isn't a photo this phone can open. Try a JPEG or PNG photo.");
  }
  try {
    // A very detailed photo may need a smaller size as well as a lower quality.
    for (const side of [longSide, Math.round(longSide * 0.75)]) {
      const scale = Math.min(1, side / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(bitmap.width * scale);
      canvas.height = Math.round(bitmap.height * scale);
      const context = canvas.getContext("2d");
      if (!context) throw new Error("This browser can't shrink photos.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.82, 0.7, 0.55]) {
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        if (blob && blob.size <= LIMIT) return blob;
      }
    }
  } finally {
    bitmap.close();
  }
  throw new Error("The photo is still too large after shrinking.");
}
