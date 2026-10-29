// The add/edit recipe form. Fields are plain text, in the same format as the
// recipe files, and are checked here with plain-language messages.
import { parseIngredientLine } from "./parse-ingredient-line";
import { checkRecipeForSeafood } from "./seafood";
import { DIETS, type Diet, type IngredientLine, type MakeAheadTask, type RecipeContent } from "./types";

export type RecipeFormValues = {
  title: string;
  source: string;
  sourceUrl: string;
  servings: string;
  timeTotalMin: string;
  timeActiveMin: string;
  cuisine: string;
  diet: string;
  mainProtein: string;
  freezerFriendly: boolean;
  goodAsLeftovers: boolean;
  tags: string;
  ingredients: string;
  instructions: string;
  makeAhead: string;
  notes: string;
};

export type FieldErrors = Partial<Record<keyof RecipeFormValues, string>>;

export const EMPTY_FORM: RecipeFormValues = {
  title: "",
  source: "",
  sourceUrl: "",
  servings: "",
  timeTotalMin: "",
  timeActiveMin: "",
  cuisine: "",
  diet: "",
  mainProtein: "",
  freezerFriendly: false,
  goodAsLeftovers: false,
  tags: "",
  ingredients: "",
  instructions: "",
  makeAhead: "",
  notes: "",
};

const TEXT_FIELDS = Object.keys(EMPTY_FORM).filter(
  (key) => typeof EMPTY_FORM[key as keyof RecipeFormValues] === "string",
) as (keyof RecipeFormValues)[];

export function formValuesFromFormData(data: FormData): RecipeFormValues {
  const values = { ...EMPTY_FORM };
  for (const key of TEXT_FIELDS) {
    (values as Record<string, unknown>)[key] = String(data.get(key) ?? "");
  }
  values.freezerFriendly = data.get("freezerFriendly") === "on";
  values.goodAsLeftovers = data.get("goodAsLeftovers") === "on";
  return values;
}

export function recipeToFormValues(recipe: RecipeContent): RecipeFormValues {
  const ingredientLines: string[] = [];
  let group: string | null = null;
  for (const item of recipe.ingredients) {
    if (item.group !== group) {
      if (item.group) ingredientLines.push(`### ${item.group}`);
      group = item.group;
    }
    ingredientLines.push(item.line);
  }
  return {
    title: recipe.title,
    source: recipe.source,
    sourceUrl: recipe.sourceUrl ?? "",
    servings: String(recipe.servings),
    timeTotalMin: String(recipe.timeTotalMin),
    timeActiveMin: recipe.timeActiveMin === null ? "" : String(recipe.timeActiveMin),
    cuisine: recipe.cuisine,
    diet: recipe.diet,
    mainProtein: recipe.mainProtein ?? "",
    freezerFriendly: recipe.freezerFriendly,
    goodAsLeftovers: recipe.goodAsLeftovers,
    tags: recipe.tags.join(", "),
    ingredients: ingredientLines.join("\n"),
    instructions: recipe.instructions.join("\n"),
    makeAhead: recipe.makeAhead.map((t) => (t.description ? `${t.name}: ${t.description}` : t.name)).join("\n"),
    notes: recipe.notes ?? "",
  };
}

function lines(text: string): string[] {
  return text.split("\n").map((l) => l.trim()).filter(Boolean);
}

/** "### For the sauce" (or "## …") starts a group; "- " at the start is optional. */
export function readIngredientLines(text: string): IngredientLine[] {
  const result: IngredientLine[] = [];
  let group: string | null = null;
  for (const line of lines(text)) {
    const heading = line.match(/^#{1,6}\s*(.+?)\s*:?\s*$/);
    if (heading) {
      group = heading[1];
      continue;
    }
    result.push({ line: line.replace(/^[-*]\s+/, "").trim(), group });
  }
  return result;
}

/** One step per line; numbering like "1." or "2)" is optional and removed. */
export function readInstructions(text: string): string[] {
  return lines(text).map((l) => l.replace(/^(?:\d+[.)]|[-*])\s+/, "").trim()).filter(Boolean);
}

/** "Name: what to do", one task per line. */
export function readMakeAhead(text: string): { tasks: MakeAheadTask[]; withoutName: string[] } {
  const tasks: MakeAheadTask[] = [];
  const withoutName: string[] = [];
  for (const raw of lines(text)) {
    const line = raw.replace(/^[-*]\s+/, "");
    const colon = line.indexOf(":");
    if (colon > 0) {
      tasks.push({ name: line.slice(0, colon).trim(), description: line.slice(colon + 1).trim() });
    } else {
      withoutName.push(line);
      tasks.push({ name: line, description: "" });
    }
  }
  return { tasks, withoutName };
}

function positiveWholeNumber(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return n > 0 ? n : null;
}

export type FormResult = {
  recipe: RecipeContent | null;
  fieldErrors: FieldErrors;
  warnings: string[];
};

export function parseRecipeForm(values: RecipeFormValues): FormResult {
  const fieldErrors: FieldErrors = {};
  const warnings: string[] = [];

  const title = values.title.trim();
  if (!title) fieldErrors.title = "Give the recipe a name.";
  const source = values.source.trim();
  if (!source) fieldErrors.source = 'Say where it came from, e.g. "HelloFresh card" or "Own recipe".';
  const cuisine = values.cuisine.trim();
  if (!cuisine) fieldErrors.cuisine = 'Add a cuisine, e.g. "Indian".';

  const sourceUrl = values.sourceUrl.trim();
  if (sourceUrl && !/^https?:\/\/\S+$/i.test(sourceUrl)) {
    fieldErrors.sourceUrl = "This should be a web address starting with https://";
  }

  const servings = positiveWholeNumber(values.servings);
  if (servings === null) fieldErrors.servings = "Enter a whole number, e.g. 4.";
  const timeTotalMin = positiveWholeNumber(values.timeTotalMin);
  if (timeTotalMin === null) fieldErrors.timeTotalMin = "Enter the minutes from start to plate, e.g. 35.";
  let timeActiveMin: number | null = null;
  if (values.timeActiveMin.trim()) {
    timeActiveMin = positiveWholeNumber(values.timeActiveMin);
    if (timeActiveMin === null) fieldErrors.timeActiveMin = "Enter a whole number of minutes, or leave it empty.";
    else if (timeTotalMin !== null && timeActiveMin > timeTotalMin) {
      fieldErrors.timeActiveMin = "Hands-on time can't be longer than the total time.";
    }
  }

  const diet = (DIETS as readonly string[]).includes(values.diet) ? (values.diet as Diet) : null;
  if (!diet) fieldErrors.diet = "Choose vegetarian, vegan or meat.";

  const ingredients = readIngredientLines(values.ingredients);
  if (ingredients.length === 0) fieldErrors.ingredients = "Add at least one ingredient, one per line.";
  const parsed = ingredients.map((i) => parseIngredientLine(i.line));
  parsed.forEach((p) => {
    for (const problem of p.problems) warnings.push(`"${p.line}": ${problem}`);
  });

  const instructions = readInstructions(values.instructions);
  const { tasks: makeAhead, withoutName } = readMakeAhead(values.makeAhead);
  for (const line of withoutName) {
    warnings.push(`Make ahead "${line}" has no name. Write it as "Name: what to do" so it can be matched with other recipes.`);
  }

  if (title) {
    for (const f of checkRecipeForSeafood({ title, ingredients: parsed })) {
      warnings.push(
        f.level === "contains"
          ? `Contains seafood ("${f.text}"). It will be marked and never suggested.`
          : `"${f.text}" may contain fish. Check the label, or use a vegetarian version.`,
      );
    }
  }

  if (Object.keys(fieldErrors).length > 0) return { recipe: null, fieldErrors, warnings };
  return {
    fieldErrors,
    warnings,
    recipe: {
      title,
      source,
      sourceUrl: sourceUrl || null,
      servings: servings!,
      timeTotalMin: timeTotalMin!,
      timeActiveMin,
      cuisine,
      diet: diet!,
      mainProtein: values.mainProtein.trim() || null,
      freezerFriendly: values.freezerFriendly,
      goodAsLeftovers: values.goodAsLeftovers,
      tags: values.tags.split(",").map((t) => t.trim()).filter(Boolean),
      isTemplate: false,
      ingredients,
      instructions,
      makeAhead,
      notes: values.notes.trim() || null,
    },
  };
}
