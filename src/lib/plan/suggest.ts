// The suggestion rules. Every rule that applies to a recipe adds a reason with
// a number of points (negative for "why lower"); the score is simply the sum.
// So the reasons shown are exactly the ones that produced the ranking.
import type { RecipeRow } from "../db/schema";
import { formatQuantity } from "../recipes/format";
import { photoUrl } from "../recipes/photo-url";
import { parseIngredientLine, type ParsedIngredient } from "../recipes/parse-ingredient-line";
import { checkRecipeForSeafood } from "../recipes/seafood";
import type { MakeAheadTask } from "../recipes/types";
import {
  cuisineKey,
  ingredientKey,
  ingredientKind,
  isRealAmount,
  prepKey,
  proteinKey,
  sameIngredient,
} from "./ingredients";
import { DAY_NAMES, TIME_SLOTS, type PlannedDish, type WeekSetup } from "./types";

export type PlanRecipe = {
  id: string;
  title: string;
  cuisine: string;
  mainProtein: string | null;
  timeTotalMin: number;
  servings: number;
  goodAsLeftovers: boolean;
  freezerFriendly: boolean;
  isFavourite: boolean;
  isTemplate: boolean;
  seafood: "contains" | "may contain" | null;
  ingredients: ParsedIngredient[];
  makeAhead: MakeAheadTask[];
  /** Address of the photo, or null. */
  photo: string | null;
};

export function toPlanRecipe(row: RecipeRow): PlanRecipe {
  const ingredients = row.ingredients.map((i) => parseIngredientLine(i.line));
  const seafood = checkRecipeForSeafood({ title: row.title, ingredients });
  return {
    id: row.id,
    title: row.title,
    cuisine: row.cuisine,
    mainProtein: row.mainProtein,
    timeTotalMin: row.timeTotalMin,
    servings: row.servings,
    goodAsLeftovers: row.goodAsLeftovers,
    freezerFriendly: row.freezerFriendly,
    isFavourite: row.isFavourite,
    isTemplate: row.isTemplate,
    seafood: seafood.some((f) => f.level === "contains") ? "contains" : seafood.length ? "may contain" : null,
    ingredients,
    makeAhead: row.makeAhead,
    photo: photoUrl(row.id, row.photoVersion),
  };
}

export type Reason = {
  kind:
    | "shared-prep"
    | "other-half"
    | "shared-ingredient"
    | "use-up"
    | "quick-evening"
    | "lunches"
    | "favourite"
    | "new-cuisine"
    | "similar"
    | "same-cuisine"
    | "same-protein"
    | "template";
  text: string;
  points: number;
};

export type Suggestion = {
  recipe: PlanRecipe;
  score: number;
  /** Positive reasons, strongest first. */
  reasons: Reason[];
  /** "Why lower" notes, plus warnings that don't change the score. */
  notes: string[];
  /** Open evenings the recipe fits, by time. */
  fitsDays: number[];
};

export const POINTS = {
  sharedPrep: 30,
  otherHalf: 20,
  sharedIngredient: 8,
  useUp: 25,
  quickEvening: 10,
  lunches: 10,
  favourite: 6,
  newCuisine: 6,
  similar: -40,
  sameCuisine: -8,
  sameProtein: -10,
  template: -5,
} as const;

export type PlanState = {
  setup: WeekSetup;
  dishes: PlannedDish[];
  /** "Not this one" for this week. */
  dismissed: string[];
};

/** Cooking evenings that don't have a dish yet (an evening of leftovers counts as taken). */
export function openEvenings(plan: PlanState): number[] {
  const taken = new Set(plan.dishes.flatMap((d) => [d.day, d.alsoOn ?? null]));
  return plan.setup.evenings.flatMap((e, day) => (e.cooking && !taken.has(day) ? [day] : []));
}

export function fitsEvening(recipe: Pick<PlanRecipe, "timeTotalMin">, setup: WeekSetup, day: number): boolean {
  const max = TIME_SLOTS[setup.evenings[day].time].maxMinutes;
  return max === null || recipe.timeTotalMin <= max;
}

/** "Creamy lentil korma with coconut rice" → "Creamy lentil korma"; "and" only splits a title that is still long. */
export function shortTitle(title: string): string {
  let cut = title.split(/ with |,/i)[0];
  if (cut.length > 40) cut = cut.split(/ and /i)[0];
  return cut.length <= 40 ? cut : cut.slice(0, 38) + "…";
}

function joinNames(names: string[]): string {
  return names.length <= 1 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

function scoreRecipe(candidate: PlanRecipe, chosen: PlanRecipe[], plan: PlanState, open: number[]): Suggestion {
  const reasons: Reason[] = [];
  const notes: string[] = [];
  const add = (kind: Reason["kind"], points: number, text: string) => reasons.push({ kind, points, text });

  // Shared Sunday prep, matched by task name.
  const sharedPrep = new Set<string>();
  for (const task of candidate.makeAhead) {
    const key = prepKey(task.name);
    const other = chosen.find((c) => c.makeAhead.some((t) => prepKey(t.name) === key));
    if (other && !sharedPrep.has(key) && sharedPrep.size < 2) {
      sharedPrep.add(key);
      add("shared-prep", POINTS.sharedPrep, `Shares Sunday prep with ${shortTitle(other.title)}: ${task.name.toLowerCase()}, one batch for both.`);
    }
  }

  // The rest of a part-used item ("½ pomegranate" in the week already).
  const usedOtherHalf = new Set<string>();
  for (const item of candidate.ingredients) {
    if (item.optional || ingredientKind(item) !== "fresh" || item.quantity === null || item.metric) continue;
    const key = ingredientKey(item.name);
    let used = 0;
    let from: PlanRecipe | null = null;
    for (const c of chosen) {
      for (const other of c.ingredients) {
        if (other.optional || other.metric || other.quantity === null || other.unit !== item.unit) continue;
        if (sameIngredient(ingredientKey(other.name), key)) {
          used += other.quantity;
          from ??= c;
        }
      }
    }
    const left = Math.ceil(used - 0.001) - used;
    if (from && left > 0.01 && item.quantity <= left + 0.01 && !usedOtherHalf.has(key)) {
      usedOtherHalf.add(key);
      const what = Math.abs(left - 0.5) < 0.01 ? "the other half of the" : `the leftover ${formatQuantity(left)}`;
      add("other-half", POINTS.otherHalf, `Uses ${what} ${item.name} from ${shortTitle(from.title)}.`);
    }
  }

  // Fresh ingredients both use in a real amount, named with the dish they share them with.
  const sharedBy = new Map<PlanRecipe, string[]>();
  let sharedCount = 0;
  for (const item of candidate.ingredients) {
    if (item.optional || ingredientKind(item) !== "fresh" || !isRealAmount(item)) continue;
    const key = ingredientKey(item.name);
    if (usedOtherHalf.has(key) || sharedCount >= 3) continue;
    const other = chosen.find((c) =>
      c.ingredients.some((o) => !o.optional && isRealAmount(o) && sameIngredient(ingredientKey(o.name), key)),
    );
    if (other) {
      sharedBy.set(other, [...(sharedBy.get(other) ?? []), item.name]);
      sharedCount++;
    }
  }
  if (sharedCount) {
    const parts = [...sharedBy].map(([recipe, names]) => `${joinNames(names)} like ${shortTitle(recipe.title)}`);
    add("shared-ingredient", POINTS.sharedIngredient * sharedCount, `Also uses ${parts.join(", and ")}: buy once for both.`);
  }

  // "What would you like to use?"
  const usesUp = plan.setup.ingredientsToUse.filter((wanted) => {
    const want = ingredientKey(wanted);
    return candidate.ingredients.some((i) => !i.optional && sameIngredient(ingredientKey(i.name), want));
  });
  if (usesUp.length) {
    add("use-up", POINTS.useUp * Math.min(usesUp.length, 2), `Uses your ${joinNames(usesUp)}.`);
  }

  // Time: the dish goes to the earliest open evening it fits; filling a Quick evening scores.
  const fitsDays = open.filter((day) => fitsEvening(candidate, plan.setup, day));
  const placedOn = fitsDays[0];
  if (placedOn !== undefined && plan.setup.evenings[placedOn].time === "quick") {
    add("quick-evening", POINTS.quickEvening, `Quick enough for ${DAY_NAMES[placedOn]} (${candidate.timeTotalMin} min).`);
  }

  // Lunch boxes still needed.
  const lunches = plan.setup.people.reduce((sum, p) => sum + p.lunches, 0);
  const leftoverDishes = chosen.filter((c) => c.goodAsLeftovers).length;
  if (candidate.goodAsLeftovers && lunches > 0 && leftoverDishes < Math.ceil(lunches / 2)) {
    add("lunches", POINTS.lunches, "Good as leftovers, for the lunch boxes.");
  }

  if (candidate.isFavourite) add("favourite", POINTS.favourite, "One of your favourites.");

  // Variety across the whole week so far.
  const cuisine = cuisineKey(candidate.cuisine);
  const protein = proteinKey(candidate.mainProtein);
  const similar = chosen.find((c) => cuisineKey(c.cuisine) === cuisine && protein && proteinKey(c.mainProtein) === protein);
  if (similar) {
    add("similar", POINTS.similar, `Similar to ${shortTitle(similar.title)} (also ${candidate.cuisine}, also ${protein}).`);
  } else {
    const sameCuisine = chosen.filter((c) => cuisineKey(c.cuisine) === cuisine);
    if (sameCuisine.length) {
      add("same-cuisine", POINTS.sameCuisine * sameCuisine.length, `${candidate.cuisine} again, like ${shortTitle(sameCuisine[0].title)}.`);
    } else if (chosen.length) {
      add("new-cuisine", POINTS.newCuisine, `Adds variety: no ${candidate.cuisine} dish in the week yet.`);
    }
    const sameProtein = protein ? chosen.filter((c) => proteinKey(c.mainProtein) === protein) : [];
    if (sameProtein.length) {
      add("same-protein", POINTS.sameProtein, `${protein![0].toUpperCase()}${protein!.slice(1)} again, like ${shortTitle(sameProtein[0].title)}.`);
    }
  }

  if (candidate.isTemplate) add("template", POINTS.template, "Illustrative example, not one of your own recipes.");
  if (candidate.seafood === "may contain") notes.push("May contain fish: check the label.");
  if (fitsDays.length && fitsDays.every((day) => plan.setup.evenings[day].time === "relaxed")) {
    notes.push(`Needs a Relaxed evening (${candidate.timeTotalMin} min).`);
  }

  const score = reasons.reduce((sum, r) => sum + r.points, 0);
  return {
    recipe: candidate,
    score,
    reasons: reasons.filter((r) => r.points > 0).sort((a, b) => b.points - a.points),
    notes: [...reasons.filter((r) => r.points < 0).map((r) => r.text), ...notes],
    fitsDays,
  };
}

/** A stable shuffle per week, so equal scores don't always come out alphabetically. */
function tieBreak(seed: string, id: string): number {
  let hash = 2166136261;
  for (const char of seed + id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619) >>> 0;
  return hash;
}

/**
 * All recipes that could still go into the week, best first. Seafood, recipes
 * already chosen or dismissed, and recipes too long for every open evening are
 * left out.
 */
export function rankCandidates(recipes: PlanRecipe[], plan: PlanState, seed = ""): Suggestion[] {
  const open = openEvenings(plan);
  if (open.length === 0) return [];
  const chosenIds = new Set(plan.dishes.map((d) => d.recipeId));
  const chosen = recipes.filter((r) => chosenIds.has(r.id));
  const dismissed = new Set(plan.dismissed);
  return recipes
    .filter((r) => !chosenIds.has(r.id) && !dismissed.has(r.id) && r.seafood !== "contains")
    .map((r) => scoreRecipe(r, chosen, plan, open))
    .filter((s) => s.fitsDays.length > 0)
    .sort((a, b) => b.score - a.score || tieBreak(seed, a.recipe.id) - tieBreak(seed, b.recipe.id));
}

/**
 * The shortlist: the best few, avoiding several of the same cuisine side by
 * side. "Show others" asks for the next page.
 */
export function shortlist(ranked: Suggestion[], count = 3, page = 0): Suggestion[] {
  const remaining = [...ranked];
  const pages: Suggestion[][] = [];
  while (remaining.length && pages.length <= page) {
    const picked: Suggestion[] = [];
    while (picked.length < count && remaining.length) {
      const cuisines = new Set(picked.map((s) => cuisineKey(s.recipe.cuisine)));
      const index = remaining.findIndex((s) => !cuisines.has(cuisineKey(s.recipe.cuisine)));
      picked.push(remaining.splice(index === -1 ? 0 : index, 1)[0]);
    }
    pages.push(picked);
  }
  return pages[page] ?? [];
}
