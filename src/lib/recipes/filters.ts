// Search and filters for the recipe collection. Filters live in the page
// address (?q=daal&time=30), so the Back button and shared links keep them.
import type { RecipeSummary } from "./summary";
import type { Diet } from "./types";

export const TIME_OPTIONS = [20, 30, 45, 60] as const;

export type DietFilter = "vegetarian" | "vegan" | "meat";

export type Filters = {
  q: string;
  maxTime: number | null;
  diet: DietFilter | null;
  cuisine: string | null;
  tag: string | null;
  withIngredients: string[];
  withoutIngredients: string[];
  proteinRich: boolean;
  carbFocused: boolean;
  freezer: boolean;
  leftovers: boolean;
  favourites: boolean;
};

export const NO_FILTERS: Filters = {
  q: "",
  maxTime: null,
  diet: null,
  cuisine: null,
  tag: null,
  withIngredients: [],
  withoutIngredients: [],
  proteinRich: false,
  carbFocused: false,
  freezer: false,
  leftovers: false,
  favourites: false,
};

const FLAGS = {
  protein: "proteinRich",
  carb: "carbFocused",
  freezer: "freezer",
  leftovers: "leftovers",
  fav: "favourites",
} as const;

function list(value: string | null): string[] {
  return (value ?? "").split(",").map((s) => s.trim()).filter(Boolean);
}

export function filtersFromParams(params: URLSearchParams): Filters {
  const time = Number(params.get("time"));
  const diet = params.get("diet");
  const filters: Filters = {
    ...NO_FILTERS,
    q: params.get("q") ?? "",
    maxTime: Number.isInteger(time) && time > 0 ? time : null,
    diet: diet === "vegetarian" || diet === "vegan" || diet === "meat" ? diet : null,
    cuisine: params.get("cuisine") || null,
    tag: params.get("tag") || null,
    withIngredients: list(params.get("with")),
    withoutIngredients: list(params.get("without")),
  };
  for (const [param, key] of Object.entries(FLAGS)) {
    filters[key] = params.get(param) === "1";
  }
  return filters;
}

export function filtersToParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.maxTime) params.set("time", String(filters.maxTime));
  if (filters.diet) params.set("diet", filters.diet);
  if (filters.cuisine) params.set("cuisine", filters.cuisine);
  if (filters.tag) params.set("tag", filters.tag);
  if (filters.withIngredients.length) params.set("with", filters.withIngredients.join(", "));
  if (filters.withoutIngredients.length) params.set("without", filters.withoutIngredients.join(", "));
  for (const [param, key] of Object.entries(FLAGS)) {
    if (filters[key]) params.set(param, "1");
  }
  return params;
}

/** How many filters (not counting the search box) are switched on. */
export function activeFilterCount(filters: Filters): number {
  return [
    filters.maxTime,
    filters.diet,
    filters.cuisine,
    filters.tag,
    filters.withIngredients.length,
    filters.withoutIngredients.length,
    ...Object.values(FLAGS).map((key) => filters[key]),
  ].filter(Boolean).length;
}

/** Lower case without accents, so "creme" finds "crème". */
export function normalise(text: string): string {
  return text.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function matchesDiet(diet: Diet, filter: DietFilter): boolean {
  if (filter === "vegetarian") return diet === "vegetarian" || diet === "vegan";
  return diet === filter;
}

function searchText(recipe: RecipeSummary): string {
  return normalise(
    [recipe.title, recipe.cuisine, recipe.source, ...recipe.tags, ...recipe.ingredients.map((i) => i.name)].join(
      " ",
    ),
  );
}

export function filterRecipes(recipes: RecipeSummary[], filters: Filters): RecipeSummary[] {
  const words = normalise(filters.q).split(/\s+/).filter(Boolean);
  const withTerms = filters.withIngredients.map(normalise);
  const withoutTerms = filters.withoutIngredients.map(normalise);

  return recipes.filter((recipe) => {
    if (filters.maxTime && recipe.timeTotalMin > filters.maxTime) return false;
    if (filters.diet && !matchesDiet(recipe.diet, filters.diet)) return false;
    if (filters.cuisine && normalise(recipe.cuisine) !== normalise(filters.cuisine)) return false;
    if (filters.tag && !recipe.tags.some((t) => normalise(t) === normalise(filters.tag!))) return false;
    if (filters.proteinRich && !recipe.proteinRich) return false;
    if (filters.carbFocused && !recipe.carbFocused) return false;
    if (filters.freezer && !recipe.freezerFriendly) return false;
    if (filters.leftovers && !recipe.goodAsLeftovers) return false;
    if (filters.favourites && !recipe.isFavourite) return false;

    const names = recipe.ingredients.map((i) => ({ name: normalise(i.name), optional: i.optional }));
    if (!withTerms.every((term) => names.some((i) => i.name.includes(term)))) return false;
    // Optional ingredients can be left out, so they don't rule a recipe out.
    if (withoutTerms.some((term) => names.some((i) => !i.optional && i.name.includes(term)))) {
      return false;
    }

    if (words.length) {
      const text = searchText(recipe);
      if (!words.every((word) => text.includes(word))) return false;
    }
    return true;
  });
}
