// Search and filters for the recipe collection. Filters live in the page
// address (?q=daal&time=30), so the Back button and shared links keep them.
import type { RecipeSummary } from "./summary";
import { readStatus, type Diet, type RecipeStatus } from "./types";

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
  /** Only recipes with this status in the weekly suggestions. */
  status: RecipeStatus | null;
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
  status: null,
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
    status: readStatus(params.get("status")),
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
  if (filters.status) params.set("status", filters.status);
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
    filters.status,
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

/**
 * Whether every word typed appears somewhere in the texts, ignoring case,
 * accents and spaces: "hello fresh" finds "HelloFresh", "andycooks" finds "Andy Cooks".
 */
export function matchesWords(texts: (string | null | undefined)[], query: string): boolean {
  const words = normalise(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const text = normalise(texts.filter(Boolean).join(" "));
  const squashed = text.replace(/\s+/g, "");
  return words.every((word) => text.includes(word) || squashed.includes(word));
}

/** What the Recipes page searches: name, cuisine, where it's from (and its website), tags and ingredients. */
function searchTexts(recipe: RecipeSummary): (string | null)[] {
  return [recipe.title, recipe.cuisine, recipe.source, recipe.site, ...recipe.tags, ...recipe.ingredients.map((i) => i.name)];
}

export function filterRecipes(recipes: RecipeSummary[], filters: Filters): RecipeSummary[] {
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
    if (filters.status && recipe.status !== filters.status) return false;

    const names = recipe.ingredients.map((i) => ({ name: normalise(i.name), optional: i.optional }));
    if (!withTerms.every((term) => names.some((i) => i.name.includes(term)))) return false;
    // Optional ingredients can be left out, so they don't rule a recipe out.
    if (withoutTerms.some((term) => names.some((i) => !i.optional && i.name.includes(term)))) {
      return false;
    }

    return matchesWords(searchTexts(recipe), filters.q);
  });
}
