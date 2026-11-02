export const DIETS = ["vegetarian", "vegan", "meat"] as const;

/**
 * Whether a recipe takes part in the weekly suggestions: "rotation" = dishes the
 * household knows and likes; "trial" = new to try (at most one a week);
 * "excluded" = kept in the collection but never suggested.
 */
export const RECIPE_STATUSES = ["rotation", "trial", "excluded"] as const;
export type RecipeStatus = (typeof RECIPE_STATUSES)[number];

export const STATUS_LABEL: Record<RecipeStatus, string> = {
  rotation: "In rotation",
  trial: "New to try",
  excluded: "Not suggested",
};

export const STATUS_HINT: Record<RecipeStatus, string> = {
  rotation: "Dishes you know and like; suggested every week.",
  trial: "Suggested, but at most one new dish a week. After you've had it, keep it or not.",
  excluded: "Kept in your recipes, never suggested.",
};

export function readStatus(value: unknown): RecipeStatus | null {
  return RECIPE_STATUSES.includes(value as RecipeStatus) ? (value as RecipeStatus) : null;
}
export type Diet = (typeof DIETS)[number];

/** An ingredient exactly as written; amounts are worked out when shown. */
export type IngredientLine = { line: string; group: string | null };

/** A Sunday prep task. The name is what links shared prep across recipes. */
export type MakeAheadTask = { name: string; description: string };

/** Everything a recipe file (or the add/edit form) describes. */
export type RecipeContent = {
  title: string;
  source: string;
  sourceUrl: string | null;
  servings: number;
  timeTotalMin: number;
  timeActiveMin: number | null;
  cuisine: string;
  diet: Diet;
  mainProtein: string | null;
  freezerFriendly: boolean;
  goodAsLeftovers: boolean;
  tags: string[];
  isTemplate: boolean;
  ingredients: IngredientLine[];
  instructions: string[];
  makeAhead: MakeAheadTask[];
  notes: string | null;
};

export type Problem = { level: "error" | "warning"; message: string };
