export const DIETS = ["vegetarian", "vegan", "meat"] as const;
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
