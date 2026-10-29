import "server-only";
import { revalidatePath } from "next/cache";

/**
 * Call after any change to recipes. Recipes show up on several pages (the list,
 * each recipe, Settings), so every page is refreshed rather than showing a copy
 * the browser kept from before the change.
 */
export function recipesChanged() {
  revalidatePath("/", "layout");
}
