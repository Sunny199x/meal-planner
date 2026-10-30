// Serves a recipe's photo. Behind the passcode like every page (see proxy.ts).
// The address carries the photo's version, so a phone can keep it for a year
// and still gets the new one after a photo is replaced.
import { getDb } from "@/lib/db";
import { getRecipePhoto } from "@/lib/recipes/photos";
import { isRecipeId } from "@/lib/recipes/queries";

export async function GET(_request: Request, { params }: RouteContext<"/photos/[id]">) {
  const { id } = await params;
  if (!isRecipeId(id)) return new Response("Not found", { status: 404 });
  const photo = await getRecipePhoto(await getDb(), id);
  if (!photo) return new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(photo.bytes), {
    headers: {
      "Content-Type": photo.contentType,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
