// The small version of a recipe that the collection page sends to the browser
// for instant search and filtering.
import { linkSite } from "./source-link";
import type { RecipeRow } from "../db/schema";
import { carbLabel, proteinLabel } from "./labels";
import { parseIngredientLine } from "./parse-ingredient-line";
import { photoUrl } from "./photo-url";
import { checkRecipeForSeafood } from "./seafood";
import type { Diet } from "./types";

export type RecipeSummary = {
  id: string;
  title: string;
  source: string;
  /** The website of the recipe's link ("hellofresh.se"), or null. */
  site: string | null;
  cuisine: string;
  diet: Diet;
  timeTotalMin: number;
  timeActiveMin: number | null;
  freezerFriendly: boolean;
  goodAsLeftovers: boolean;
  tags: string[];
  isTemplate: boolean;
  isFavourite: boolean;
  proteinRich: boolean;
  carbFocused: boolean;
  seafood: "contains" | "may contain" | null;
  ingredients: { name: string; optional: boolean }[];
  /** Address of the photo, or null. */
  photo: string | null;
};

export function toSummary(row: RecipeRow): RecipeSummary {
  const parsed = row.ingredients.map((i) => parseIngredientLine(i.line));
  const seafood = checkRecipeForSeafood({ title: row.title, ingredients: parsed });
  return {
    id: row.id,
    title: row.title,
    source: row.source,
    site: linkSite(row.sourceUrl),
    cuisine: row.cuisine,
    diet: row.diet,
    timeTotalMin: row.timeTotalMin,
    timeActiveMin: row.timeActiveMin,
    freezerFriendly: row.freezerFriendly,
    goodAsLeftovers: row.goodAsLeftovers,
    tags: row.tags,
    isTemplate: row.isTemplate,
    isFavourite: row.isFavourite,
    proteinRich: proteinLabel(parsed, row.servings).applies,
    carbFocused: carbLabel(parsed, row.servings).applies,
    seafood: seafood.some((f) => f.level === "contains")
      ? "contains"
      : seafood.length
        ? "may contain"
        : null,
    ingredients: parsed.map((p) => ({ name: p.name, optional: p.optional })),
    photo: photoUrl(row.id, row.photoVersion),
  };
}
