/** Where a recipe's photo is served; the version makes phones fetch a replaced photo. */
export function photoUrl(recipeId: string, version: string | null): string | null {
  return version ? `/photos/${recipeId}?v=${encodeURIComponent(version)}` : null;
}
