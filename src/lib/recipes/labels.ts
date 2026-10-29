// "Protein-rich" and "Carb-focused" labels, worked out from the ingredient
// list with a simple rule that is shown to the user. They are a household rule
// of thumb, not a nutrition calculation: no grams of protein are claimed.
import type { ParsedIngredient } from "./parse-ingredient-line";

export const PROTEIN_RULE_TEXT =
  "Protein-rich means each serving includes at least one of these, or a mix adding up to the same: " +
  "100 g of meat, poultry, tofu, tempeh, paneer or halloumi; 150 g of canned or cooked beans, " +
  "chickpeas or lentils; 50 g of dry lentils, split peas or dried beans; or 2 eggs. Amounts are as " +
  "bought, taken from the ingredient list. Ingredients without a weight can't be counted.";

export const CARB_RULE_TEXT =
  "Carb-focused means each serving includes at least 75 g of uncooked rice, pasta, noodles or " +
  "other grains, or 250 g of potatoes, sweet potatoes or gnocchi (or a mix adding up to the same). " +
  "Bread, tortillas and flatbreads aren't counted because recipes rarely give their weight. It " +
  "describes the dish; it isn't a judgement.";

export const LABEL_DISCLAIMER =
  "These labels are a household rule of thumb based on ingredient amounts, not a nutrition calculation.";

type Category = { label: string; perServing: number; unit: "g" | "count" };

const MEAT_OR_ALTERNATIVE: Category = { label: "meat, poultry or alternative", perServing: 100, unit: "g" };
const COOKED_PULSES: Category = { label: "canned or cooked beans, chickpeas or lentils", perServing: 150, unit: "g" };
const DRY_PULSES: Category = { label: "dry lentils, split peas or dried beans", perServing: 50, unit: "g" };
const EGGS: Category = { label: "eggs", perServing: 2, unit: "count" };
const DRY_GRAINS: Category = { label: "uncooked rice, pasta, noodles or grains", perServing: 75, unit: "g" };
const COOKED_GRAINS: Category = { label: "cooked rice or grains", perServing: 225, unit: "g" };
const POTATOES: Category = { label: "potatoes, sweet potatoes or gnocchi", perServing: 250, unit: "g" };

const has = (name: string, pattern: string) => new RegExp(`\\b(?:${pattern})\\b`, "i").test(name);

const NOT_PROTEIN =
  "stock|broth|bouillon|cubes?|powder|gravy|seasoning|sauce|paste|noodles|fat|lard|dripping|" +
  "lamb's lettuce|beef tomato(?:es)?|green beans?|runner beans?|french beans?|string beans?|fine beans?|" +
  "bean sprouts?|vanilla|coffee|jelly beans?";
const MEAT =
  "chicken|beef|lamb|pork|turkey|duck|mince|minced|sausages?|chorizo|bacon|pancetta|ham|gammon|" +
  "steaks?|venison|veal|meatballs?|tofu|tempeh|seitan|paneer|halloumi|quorn";
const LENTILS = "lentils?|split peas?|dh?aa?l|moong|toor|urad|masoor";
const BEANS =
  "beans?|chickpeas?|garbanzos?|edamame|black-eyed peas?|kidney beans?|cannellini|borlotti|pinto|" +
  "haricot|butter beans?";
const NOT_CARB = "vinegar|wine|flour|paper|sauce|stock|milk|cakes?|crackers?|bran";
const GRAINS =
  "rice|pasta|spaghetti|penne|fusilli|macaroni|linguine|tagliatelle|rigatoni|farfalle|orzo|lasagne|" +
  "noodles|couscous|bulgu?a?r|quinoa|barley|freekeh|farro|polenta";
const POTATO = "potato(?:es)?|sweet potato(?:es)?|gnocchi";

function proteinCategory(item: ParsedIngredient): Category | null {
  const name = item.name;
  if (has(name, NOT_PROTEIN)) return null;
  if (has(name, "eggs?")) return EGGS;
  if (has(name, MEAT)) return MEAT_OR_ALTERNATIVE;
  const cooked = item.unit === "can" || has(name, "cooked|canned|tinned|drained");
  if (has(name, LENTILS)) return cooked ? COOKED_PULSES : DRY_PULSES;
  if (has(name, BEANS)) return has(name, "dried|dry") ? DRY_PULSES : COOKED_PULSES;
  return null;
}

function carbCategory(item: ParsedIngredient): Category | null {
  const name = item.name;
  if (has(name, NOT_CARB)) return null;
  if (has(name, POTATO)) return POTATOES;
  if (has(name, GRAINS)) return has(name, "cooked|leftover") ? COOKED_GRAINS : DRY_GRAINS;
  return null;
}

export type LabelResult = {
  applies: boolean;
  /** Each counted ingredient with its amount per serving, e.g. "62.5 g red lentils". */
  counted: string[];
  /** Relevant ingredients that couldn't be counted because they have no weight. */
  notCounted: string[];
};

function evaluate(
  ingredients: ParsedIngredient[],
  servings: number,
  categoryOf: (item: ParsedIngredient) => Category | null,
): LabelResult {
  let share = 0;
  const counted: string[] = [];
  const notCounted: string[] = [];
  for (const item of ingredients) {
    if (item.optional) continue;
    const category = categoryOf(item);
    if (!category) continue;
    let amount: number | null = null;
    if (category.unit === "count") amount = item.unit === null ? (item.quantityMax ?? item.quantity) : null;
    else if (item.metric?.unit === "g") amount = item.metric.value;
    if (amount === null || servings <= 0) {
      notCounted.push(item.line);
      continue;
    }
    const perServing = amount / servings;
    share += perServing / category.perServing;
    counted.push(
      category.unit === "count"
        ? `${formatNumber(perServing)} ${item.name} per serving`
        : `${formatNumber(perServing)} g ${item.name} per serving`,
    );
  }
  return { applies: share >= 0.995, counted, notCounted };
}

export function proteinLabel(ingredients: ParsedIngredient[], servings: number): LabelResult {
  return evaluate(ingredients, servings, proteinCategory);
}

export function carbLabel(ingredients: ParsedIngredient[], servings: number): LabelResult {
  return evaluate(ingredients, servings, carbCategory);
}

function formatNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}
