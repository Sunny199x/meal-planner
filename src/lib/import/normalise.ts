// The normalising layer: every imported recipe passes through here before the
// review screen, whatever it came from (a website, pasted text, a video
// description, a recipe read and translated by Claude). It applies the app's
// own fixed rules so imports end up like the household's hand-written recipes:
// metric units and °C, UK/Swedish ingredient names, the fields the suggestion
// rules need, make-ahead tasks under the names already in use, and the seafood
// check. It never guesses silently: every change, guess and gap is listed.
import { cuisineKey, ingredientKey } from "../plan/ingredients";
import { taskWords } from "../plan/prep";
import { recipeToFormValues, type RecipeFormValues } from "../recipes/form";
import { formatQuantity } from "../recipes/format";
import { NUM, parseAmount, parseIngredientLine } from "../recipes/parse-ingredient-line";
import { roundForKitchen } from "../recipes/scale";
import { checkRecipeForSeafood, type SeafoodFinding } from "../recipes/seafood";
import type { Diet, IngredientLine, MakeAheadTask } from "../recipes/types";

/** A recipe as a reader produced it: English, but possibly with US units and gaps. */
export type ImportDraft = {
  title: string;
  source: string;
  sourceUrl: string | null;
  servings: number | null;
  timeTotalMin: number | null;
  timeActiveMin: number | null;
  cuisine: string | null;
  mainProtein: string | null;
  diet: Diet | null;
  freezerFriendly: boolean | null;
  goodAsLeftovers: boolean | null;
  tags: string[];
  ingredients: IngredientLine[];
  instructions: string[];
  makeAhead: MakeAheadTask[];
  notes: string | null;
  /** Things the reader itself asks to be checked ("a 'glass' was taken as 200 ml"). */
  flags: string[];
};

/** What the household already uses, so imports match it. */
export type Household = {
  cuisines: string[];
  makeAhead: { name: string; description: string; recipes: number }[];
};

export type Normalised = {
  values: RecipeFormValues;
  /** What the app changed, in plain words. */
  changes: string[];
  /** Guesses and uncertain conversions to look at before saving. */
  check: string[];
  /** Fields the import didn't say and the app can't guess. */
  missing: string[];
  /** Make-ahead tasks under names already used, offered with one tap. */
  suggestedMakeAhead: MakeAheadTask[];
  seafood: SeafoodFinding[];
};

// --- Units ---------------------------------------------------------------

type Conversion = { unit: "ml" | "g"; factor: number; note?: string };
const CUP_NOTE = "A cup was taken as 240 ml (US); cup sizes vary, and for dry food a weight is better.";
const US_UNITS: [RegExp, Conversion][] = [
  [/^(?:fl\.?\s*oz|fluid\s+ounces?)$/i, { unit: "ml", factor: 30 }],
  [/^cups?$/i, { unit: "ml", factor: 240, note: CUP_NOTE }],
  [/^(?:oz|ounces?)$/i, { unit: "g", factor: 28.35 }],
  [/^(?:lbs?|pounds?)$/i, { unit: "g", factor: 453.6 }],
  [/^pints?$/i, { unit: "ml", factor: 473, note: "A pint was taken as a US pint (473 ml); a UK pint is 568 ml." }],
  [/^quarts?$/i, { unit: "ml", factor: 946 }],
  [/^sticks?$/i, { unit: "g", factor: 113, note: "A stick of butter was taken as 113 g." }],
];
const UNIT_WORDS = "fl\\.?\\s*oz|fluid\\s+ounces?|cups?|oz|ounces?|lbs?|pounds?|pints?|quarts?|sticks?";
const LINE_AMOUNT = new RegExp(`^(${NUM})(?:\\s*(?:-|–|—|to)\\s*(${NUM}))?\\s*(${UNIT_WORDS})\\.?(?![a-z])\\s*(?:of\\s+)?`, "i");
const BRACKET_OZ = new RegExp(`\\((${NUM})\\s*(?:-|–)?\\s*(?:oz|ounces?)\\.?\\)`, "gi");

function metric(value: number, unit: "ml" | "g"): string {
  const rounded = roundForKitchen(value, unit);
  return rounded >= 1000 ? `${formatQuantity(rounded / 1000)} ${unit === "g" ? "kg" : "l"}` : `${formatQuantity(rounded)} ${unit}`;
}

/** "1 cup rice" → "240 ml rice"; "1 (14 oz) can tomatoes" → "1 (400 g) can tomatoes". Null if nothing to change. */
export function metricLine(line: string): { line: string; note?: string } | null {
  let changed = line.replace(BRACKET_OZ, (_m, amount: string) => {
    const value = parseAmount(amount);
    return value === null ? _m : `(${metric(value * 28.35, "g")})`;
  });
  let note: string | undefined;
  const match = changed.match(LINE_AMOUNT);
  if (match) {
    const conversion = US_UNITS.find(([re]) => re.test(match[3].replace(/\.$/, "")))?.[1];
    const low = parseAmount(match[1]);
    const high = match[2] ? parseAmount(match[2]) : null;
    if (conversion && low !== null) {
      const amount =
        high !== null
          ? `${metric(low * conversion.factor, conversion.unit).split(" ")[0]}–${metric(high * conversion.factor, conversion.unit)}`
          : metric(low * conversion.factor, conversion.unit);
      changed = `${amount} ${changed.slice(match[0].length)}`;
      note = conversion.note;
    }
  }
  return changed === line ? null : { line: changed, note };
}

/** Oven temperatures and sizes in the steps: "350°F" → "180°C", "9-inch" → "23 cm". */
export function metricStep(step: string): string {
  return step
    .replace(/(\d{3})\s*°?\s*(?:degrees\s+)?F\b/g, (_m, f: string) => `${Math.round(((Number(f) - 32) * 5) / 9 / 10) * 10}°C`)
    .replace(/(\d+)\s*(?:x|×|by)\s*(\d+)[- ]?inch(?:es)?/gi, (_m, a: string, b: string) => `${Math.round(Number(a) * 2.54)} × ${Math.round(Number(b) * 2.54)} cm`)
    .replace(/(\d+(?:\.\d+)?)[- ]?inch(?:es)?/gi, (_m, a: string) => `${Math.round(Number(a) * 2.54 * 2) / 2} cm`)
    .replace(new RegExp(`(${NUM})\\s*(cups?)(?![a-z])`, "gi"), (m, amount: string) => {
      const value = parseAmount(amount);
      return value === null ? m : metric(value * 240, "ml");
    });
}

// --- Names ---------------------------------------------------------------

/** US names → the names used in a UK/Swedish kitchen and on Swedish shop labels. */
const KITCHEN_NAMES: [RegExp, string][] = [
  [/\bground (beef|pork|lamb|turkey|chicken|veal)\b/gi, "$1 mince"],
  [/\bcilantro\b/gi, "coriander"],
  [/\b(?:scallions?|green onions?)\b/gi, "spring onions"],
  [/\beggplants?\b/gi, "aubergine"],
  [/\bzucchinis?\b/gi, "courgette"],
  [/\barugula\b/gi, "rocket"],
  [/\bbell peppers?\b/gi, "pepper"],
  [/\bheavy (?:whipping )?cream\b/gi, "double cream"],
  [/\ball[- ]purpose flour\b/gi, "plain flour"],
  [/\b(?:confectioners'?|powdered) sugar\b/gi, "icing sugar"],
  [/\bgarbanzo beans?\b/gi, "chickpeas"],
  [/\bcornstarch\b/gi, "cornflour"],
];

function kitchenName(line: string): string {
  return KITCHEN_NAMES.reduce((text, [re, to]) => text.replace(re, to), line);
}

// --- Guesses -------------------------------------------------------------

const MEAT = /\b(chicken|beef|pork|lamb|turkey|veal|duck|bacon|ham|sausage|chorizo|salami|mince|steak|prosciutto|pancetta)\b/;
const ANIMAL = /\b(egg|milk|cream|butter|cheese|yoghurt|yogurt|ghee|honey|feta|halloumi|paneer|parmesan|mozzarella|creme fraiche)\b/;
const PLANT = /\b(plant-based|vegan)\b/;
// Plant-based first, so "plant-based chicken pieces" counts as plant-based.
const PROTEINS: [RegExp, string][] = [
  [/\b(tofu|tempeh|plant-based|vegan)\b/, "plant-based"],
  [/\bchicken\b/, "chicken"],
  [/\b(beef|steak)\b/, "beef"],
  [/\b(pork|bacon|ham|sausage|chorizo)\b/, "pork"],
  [/\blamb\b/, "lamb"],
  [/\bturkey\b/, "turkey"],
  [/\blentil\b/, "lentils"],
  [/\bchickpea\b/, "chickpeas"],
  [/\bbean\b/, "beans"],
  [/\b(paneer|halloumi)\b/, "cheese"],
  [/\begg\b/, "eggs"],
];

function guessDiet(names: string[]): Diet {
  if (names.some((n) => MEAT.test(n) && !PLANT.test(n))) return "meat";
  return names.some((n) => ANIMAL.test(n) && !PLANT.test(n)) ? "vegetarian" : "vegan";
}

/** The protein with the most weight in the recipe (or the first one named, if none has a weight). */
function guessProtein(items: ReturnType<typeof parseIngredientLine>[]): string | null {
  let best: { name: string; grams: number } | null = null;
  for (const item of items) {
    const key = ingredientKey(item.name);
    const protein = PROTEINS.find(([re]) => re.test(key))?.[1];
    if (!protein) continue;
    const grams = item.metric?.unit === "g" ? item.metric.value : 0;
    if (!best || grams > best.grams) best = { name: protein, grams };
  }
  return best?.name ?? null;
}

// --- Make-ahead ----------------------------------------------------------

/**
 * Tasks already shared by at least two household recipes whose ingredients this
 * recipe has too ("Cook rice" for a recipe with rice; "Garlic yoghurt" only with
 * both garlic and yoghurt). Under the same name, the suggestion rules link it.
 */
function suggestTasks(draft: ImportDraft, items: ReturnType<typeof parseIngredientLine>[], household: Household): MakeAheadTask[] {
  const have = new Set(draft.makeAhead.map((t) => t.name.toLowerCase()));
  const words = new Set(items.flatMap((i) => ingredientKey(i.name).split(" ")));
  return household.makeAhead
    .filter((task) => task.recipes >= 2 && !have.has(task.name.toLowerCase()))
    .filter((task) => {
      const parts = taskWords(task.name);
      return parts.length > 0 && parts.every((part) => part.every((w) => words.has(w)));
    })
    .sort((a, b) => b.recipes - a.recipes)
    .slice(0, 5)
    .map(({ name, description }) => ({ name, description }));
}

// --- The layer -----------------------------------------------------------

export function normalise(draft: ImportDraft, household: Household): Normalised {
  const changes: string[] = [];
  const check = [...draft.flags];
  const missing: string[] = [];
  const notes = new Set<string>();

  const ingredients = draft.ingredients.map((item) => {
    let line = kitchenName(item.line.trim());
    const converted = metricLine(line);
    if (converted) {
      changes.push(`“${item.line.trim()}” → “${converted.line}”`);
      line = converted.line;
      if (converted.note) notes.add(converted.note);
    } else if (line !== item.line.trim()) {
      changes.push(`“${item.line.trim()}” → “${line}”`);
    }
    return { line, group: item.group };
  });
  const instructions = draft.instructions.map((step) => {
    const converted = metricStep(kitchenName(step));
    if (converted !== step) changes.push(`Step changed to metric or UK names: “${converted.slice(0, 60)}${converted.length > 60 ? "…" : ""}”`);
    return converted;
  });
  check.push(...notes);

  const parsed = ingredients.map((i) => parseIngredientLine(i.line));
  const unread = parsed.filter((p) => p.problems.length > 0).map((p) => p.line);
  if (unread.length) check.push(`These lines couldn't be fully read: ${unread.map((l) => `“${l}”`).join(", ")}.`);
  // Claude writes "?" for what it couldn't make out in a photo, instead of guessing.
  const short = (text: string) => (text.length > 60 ? `${text.slice(0, 60)}…` : text);
  const unclear = [...ingredients.map((i) => i.line), ...instructions].filter((text) => /(^|\s)\?(\s|$)/.test(text));
  if (unclear.length) check.push(`Fill in the parts marked “?”, which couldn't be read: ${unclear.map((t) => `“${short(t)}”`).join(", ")}.`);

  // Cuisine: the household's spelling where it's the same cuisine.
  let cuisine = draft.cuisine?.trim() ?? "";
  if (cuisine) {
    const known = household.cuisines.find((c) => cuisineKey(c) === cuisineKey(cuisine));
    if (known && known !== cuisine) {
      changes.push(`Cuisine “${cuisine}” → “${known}”, as in your other recipes.`);
      cuisine = known;
    }
  } else missing.push("Cuisine");

  let mainProtein = draft.mainProtein?.trim() ?? "";
  if (!mainProtein) {
    const guess = guessProtein(parsed);
    if (guess) {
      mainProtein = guess;
      check.push(`Main protein “${guess}” was guessed from the ingredients.`);
    }
  }

  let diet = draft.diet;
  if (!diet) {
    diet = guessDiet(parsed.map((p) => ingredientKey(p.name)));
    check.push(`Diet “${diet}” was guessed from the ingredients.`);
  }

  if (!draft.title.trim()) missing.push("Title");
  if (!draft.servings) missing.push("Servings");
  if (!draft.timeTotalMin) missing.push("Total time");
  if (draft.goodAsLeftovers === null) missing.push("Good as leftovers?");
  if (draft.freezerFriendly === null) missing.push("Freezer-friendly?");
  if (ingredients.length === 0) missing.push("Ingredients");
  if (instructions.length === 0) missing.push("Steps");

  const values = recipeToFormValues({
    title: draft.title.trim(),
    source: draft.source,
    sourceUrl: draft.sourceUrl,
    servings: draft.servings ?? 0,
    timeTotalMin: draft.timeTotalMin ?? 0,
    timeActiveMin: draft.timeActiveMin,
    cuisine,
    diet,
    mainProtein: mainProtein || null,
    freezerFriendly: draft.freezerFriendly ?? false,
    goodAsLeftovers: draft.goodAsLeftovers ?? false,
    tags: draft.tags,
    isTemplate: false,
    ingredients,
    instructions,
    makeAhead: draft.makeAhead,
    notes: draft.notes,
  });
  if (!draft.servings) values.servings = "";
  if (!draft.timeTotalMin) values.timeTotalMin = "";

  return {
    values,
    changes,
    check,
    missing,
    suggestedMakeAhead: suggestTasks(draft, parsed, household),
    seafood: checkRecipeForSeafood({ title: draft.title, ingredients: parsed }),
  };
}
