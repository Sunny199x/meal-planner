// Reads a recipe Markdown file (format: seed-recipes/README.md). Problems are
// collected in plain language: errors stop the recipe loading, warnings don't.
import matter from "gray-matter";
import { parseIngredientLine } from "./parse-ingredient-line";
import { checkRecipeForSeafood } from "./seafood";
import { DIETS, type Diet, type IngredientLine, type MakeAheadTask, type Problem, type RecipeContent } from "./types";

export type RecipeFileResult = {
  slug: string;
  recipe: RecipeContent | null;
  problems: Problem[];
};

const KNOWN_FIELDS = new Set([
  "title", "template", "source", "source_url", "servings", "time_total_min", "time_active_min",
  "cuisine", "diet", "main_protein", "freezer_friendly", "good_as_leftovers", "tags",
]);

const SECTION_NAMES: Record<string, Section> = {
  ingredients: "ingredients",
  instructions: "instructions",
  method: "instructions",
  steps: "instructions",
  "make ahead": "makeAhead",
  "make-ahead": "makeAhead",
  notes: "notes",
};
type Section = "ingredients" | "instructions" | "makeAhead" | "notes";

export function slugFromFileName(fileName: string): string {
  return fileName.replace(/^.*[\\/]/, "").replace(/\.md$/i, "");
}

export function parseRecipeFile(fileName: string, text: string): RecipeFileResult {
  const slug = slugFromFileName(fileName);
  const problems: Problem[] = [];
  const error = (message: string) => problems.push({ level: "error", message });
  const warn = (message: string) => problems.push({ level: "warning", message });

  let data: Record<string, unknown>;
  let body: string;
  try {
    // An empty options object stops gray-matter caching results between calls.
    const parsed = matter(text, {});
    data = parsed.data;
    body = parsed.content;
  } catch (e) {
    error(`The top section (between the --- lines) couldn't be read: ${firstLine(e)}`);
    return { slug, recipe: null, problems };
  }
  if (!text.trimStart().startsWith("---")) {
    error("The file must start with a top section between two --- lines.");
    return { slug, recipe: null, problems };
  }
  const bodyStartLine = text.split("\n").length - body.split("\n").length + 1;

  for (const key of Object.keys(data)) {
    if (!KNOWN_FIELDS.has(key)) warn(`Unknown field "${key}" in the top section was ignored.`);
  }

  const title = requiredText(data, "title", error);
  const source = requiredText(data, "source", error);
  const cuisine = requiredText(data, "cuisine", error);
  const servings = positiveInteger(data.servings);
  if (servings === null) error('"servings" must be a whole number above 0.');
  const timeTotalMin = positiveInteger(data.time_total_min);
  if (timeTotalMin === null) error('"time_total_min" must be a whole number of minutes above 0.');

  let timeActiveMin: number | null = null;
  if (!isBlank(data.time_active_min)) {
    timeActiveMin = positiveInteger(data.time_active_min);
    if (timeActiveMin === null) warn('"time_active_min" isn\'t a whole number of minutes, so it was ignored.');
    else if (timeTotalMin !== null && timeActiveMin > timeTotalMin) {
      warn('"time_active_min" is longer than "time_total_min". Please check the times.');
    }
  }

  const dietText = typeof data.diet === "string" ? data.diet.trim().toLowerCase() : "";
  const diet = (DIETS as readonly string[]).includes(dietText) ? (dietText as Diet) : null;
  if (!diet) error('"diet" must be vegetarian, vegan or meat.');

  const freezerFriendly = yesNo(data.freezer_friendly);
  if (freezerFriendly === null) error('"freezer_friendly" must be true or false.');
  const goodAsLeftovers = yesNo(data.good_as_leftovers);
  if (goodAsLeftovers === null) error('"good_as_leftovers" must be true or false.');
  const isTemplate = yesNo(data.template) ?? false;

  let sourceUrl: string | null = null;
  if (!isBlank(data.source_url)) {
    const url = String(data.source_url).trim();
    if (/^https?:\/\/\S+$/i.test(url)) sourceUrl = url;
    else warn('"source_url" should be a web address starting with http:// or https://, so it was ignored.');
  }

  const mainProtein = isBlank(data.main_protein) ? null : String(data.main_protein).trim();
  const tags = readTags(data.tags);

  const sections = readSections(body, bodyStartLine, warn);
  const ingredients = sections.ingredients;
  if (ingredients.length === 0) error('No ingredients found. List them under "## Ingredients", one per line starting with "- ".');
  for (const { line, lineNumber } of sections.ingredientLineNumbers) {
    for (const message of parseIngredientLine(line).problems) {
      warn(`Line ${lineNumber} ("${line}"): ${message}`);
    }
  }
  if (sections.instructions.length === 0) warn('No instructions found under "## Instructions".');

  if (title !== null) {
    const findings = checkRecipeForSeafood({
      title,
      ingredients: ingredients.map((i) => ({ name: parseIngredientLine(i.line).name })),
    });
    for (const f of findings) {
      warn(
        f.level === "contains"
          ? `Contains seafood ("${f.text}"). It will be marked and never suggested.`
          : `"${f.text}" may contain fish. Check the label, or use a vegetarian version.`,
      );
    }
  }

  if (problems.some((p) => p.level === "error")) return { slug, recipe: null, problems };
  return {
    slug,
    problems,
    recipe: {
      title: title!,
      source: source!,
      sourceUrl,
      servings: servings!,
      timeTotalMin: timeTotalMin!,
      timeActiveMin,
      cuisine: cuisine!,
      diet: diet!,
      mainProtein,
      freezerFriendly: freezerFriendly!,
      goodAsLeftovers: goodAsLeftovers!,
      tags,
      isTemplate,
      ingredients,
      instructions: sections.instructions,
      makeAhead: sections.makeAhead,
      notes: sections.notes,
    },
  };
}

function readSections(body: string, firstLineNumber: number, warn: (message: string) => void) {
  const ingredients: IngredientLine[] = [];
  const ingredientLineNumbers: { line: string; lineNumber: number }[] = [];
  const instructions: string[] = [];
  const makeAhead: MakeAheadTask[] = [];
  const notes: string[] = [];
  let section: Section | null = null;
  let group: string | null = null;

  body.split("\n").forEach((rawLine, index) => {
    const lineNumber = firstLineNumber + index;
    const line = rawLine.trim();
    if (!line) {
      if (section === "notes") notes.push("");
      return;
    }

    const heading = line.match(/^##\s+(.+?)\s*#*$/);
    if (heading && !line.startsWith("###")) {
      const name = heading[1].trim().toLowerCase();
      section = SECTION_NAMES[name] ?? null;
      group = null;
      if (!section) warn(`Line ${lineNumber}: unknown section "## ${heading[1]}" was ignored.`);
      return;
    }

    switch (section) {
      case "ingredients": {
        const sub = line.match(/^###\s+(.+?)\s*:?\s*$/);
        if (sub) {
          group = sub[1];
          return;
        }
        let text = line.replace(/^[-*]\s+/, "");
        if (text === line) warn(`Line ${lineNumber}: ingredient lines should start with "- ".`);
        text = text.trim();
        ingredients.push({ line: text, group });
        ingredientLineNumbers.push({ line: text, lineNumber });
        return;
      }
      case "instructions": {
        const step = line.match(/^(?:\d+[.)]|[-*])\s+(.*)$/);
        if (step) instructions.push(step[1].trim());
        else if (instructions.length) instructions[instructions.length - 1] += " " + line;
        else instructions.push(line);
        return;
      }
      case "makeAhead": {
        const text = line.replace(/^[-*]\s+/, "");
        const colon = text.indexOf(":");
        if (colon > 0) {
          makeAhead.push({ name: text.slice(0, colon).trim(), description: text.slice(colon + 1).trim() });
        } else {
          warn(`Line ${lineNumber}: make-ahead tasks should look like "Name: what to do".`);
          makeAhead.push({ name: text.trim(), description: "" });
        }
        return;
      }
      case "notes":
        notes.push(line);
        return;
      default:
        warn(`Line ${lineNumber} is outside any section and was ignored.`);
    }
  });

  const notesText = notes.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  return {
    ingredients,
    ingredientLineNumbers,
    instructions,
    makeAhead,
    notes: notesText || null,
  };
}

function requiredText(data: Record<string, unknown>, key: string, error: (m: string) => void) {
  const value = data[key];
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number") return String(value);
  error(`"${key}" is missing.`);
  return null;
}

function positiveInteger(value: unknown): number | null {
  const n = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof n === "number" && Number.isInteger(n) && n > 0 ? n : null;
}

function yesNo(value: unknown): boolean | null {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const v = value.trim().toLowerCase();
    if (v === "true" || v === "yes") return true;
    if (v === "false" || v === "no") return false;
  }
  return null;
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || (typeof value === "string" && !value.trim());
}

function readTags(value: unknown): string[] {
  const list = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  return list.map((t) => String(t).trim()).filter(Boolean);
}

function firstLine(e: unknown): string {
  return (e instanceof Error ? e.message : String(e)).split("\n")[0];
}
