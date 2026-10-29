/** Where the recipe list remembers its filters, so "Back to recipes" can restore them. */
export const LAST_LIST_QUERY_KEY = "recipes:last-query";

/** The recipe list's address with the filters last used on this device. */
export function lastListUrl(): string {
  let query = "";
  try {
    query = sessionStorage.getItem(LAST_LIST_QUERY_KEY) ?? "";
  } catch {
    // Private browsing can block storage; fall back to the full list.
  }
  return query ? `/recipes?${query}` : "/recipes";
}
