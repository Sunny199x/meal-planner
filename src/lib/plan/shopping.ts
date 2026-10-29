// The shopping list: every chosen dish's ingredients, scaled to its portions,
// added up per ingredient and grouped by supermarket section. Amounts are only
// added together when that is honest (grams with grams, cans with cans, a pack
// with grams when the pack's weight is known); anything else is shown side by
// side. Amounts are rounded up to what can be bought. No prices.
import { formatMetric, formatQuantity, formatUnit } from "../recipes/format";
import type { ParsedIngredient } from "../recipes/parse-ingredient-line";
import { scaleLine } from "../recipes/scale";
import { ingredientKey } from "./ingredients";
import type { DishPortions } from "./portions";
import type { PlanRecipe } from "./suggest";
import type { PlannedDish } from "./types";

export const SECTIONS = [
  "Fruit and veg",
  "Bread and wraps",
  "Meat",
  "Vegetarian protein",
  "Dairy and eggs",
  "Rice, pasta and grains",
  "Cans, jars and sauces",
  "Nuts, snacks and dried fruit",
  "Frozen",
  "Other",
  "Check the cupboard",
] as const;
export type Section = (typeof SECTIONS)[number];

const words = (list: string) => new RegExp(`\\b(${list})\\b`);

/** Never on the list. */
const SKIP = /^(water|boiling water|cold water|hot water|ice|ice cube)$/;

// Checked in this order; the first match wins.
const SECTION_RULES: [RegExp, Section][] = [
  [
    new RegExp(
      "^(salt|sea salt|flaky salt|pepper|black pepper|white pepper)$|black pepper$|\\b(oil|vinegar)\\b|" +
        "^ground (?!beef|pork|lamb|turkey|chicken|meat)|(cumin|fennel|mustard|coriander|caraway|nigella|sesame|poppy) seed$|" +
        "\\b(sugar|flour|cornflour|cornstarch|baking powder|bicarbonate of soda|powder|flake|spice|spice mix|seasoning|" +
        "stock cube|stock powder|stock concentrate|bouillon|bay leaf)$|^dried (oregano|thyme|basil|mint|parsley|dill|rosemary)$|" +
        "^(paprika|sweet paprika|smoked paprika|turmeric|cumin|cinnamon|nutmeg|garam masala|curry powder|oregano|chilli powder|" +
        "cayenne|allspice|cardamom|clove|sumac|za'atar)$",
    ),
    "Check the cupboard",
  ],
  [words("frozen"), "Frozen"],
  [words("green bean|runner bean|broad bean|bean sprout"), "Fruit and veg"],
  [
    words(
      "crushed tomato|chopped tomato|tomato paste|tomato puree|passata|coconut milk|coconut cream|bean|chickpea|" +
        "cooked lentil|cooked green lentil|sweetcorn|stock|broth|sauce|chutney|paste|mayonnaise|mayo|dressing|mustard|" +
        "ketchup|sriracha|honey|syrup|gravy|pesto|harissa|tahini|jam|olive|pickle|caper|salsa",
    ),
    "Cans, jars and sauces",
  ],
  [words("plant-based|vegan|tofu|tempeh|quorn|seitan|falafel"), "Vegetarian protein"],
  [
    words(
      "tortilla chip|crisp|peanut|almond|cashew|walnut|pecan|pistachio|hazelnut|pine nut|nut|desiccated coconut|" +
        "coconut flake|dried|raisin|cranberry|chocolate|cracker",
    ),
    "Nuts, snacks and dried fruit",
  ],
  [words("bread|baguette|pita|pitta|flatbread|tortilla|wrap|naan|bun|bagel|ciabatta|focaccia|brioche"), "Bread and wraps"],
  [
    words(
      "rice|pasta|spaghetti|penne|fusilli|macaroni|linguine|tagliatelle|rigatoni|orzo|lasagne|noodle|couscous|bulgur|" +
        "bulgar|quinoa|lentil|split pea|oat|breadcrumb|panko|gnocchi",
    ),
    "Rice, pasta and grains",
  ],
  [
    words("chicken|beef|pork|lamb|turkey|mince|steak|bacon|sausage|ham|chorizo|salami|meatball|veal|duck|prosciutto|pancetta"),
    "Meat",
  ],
  [
    words(
      "egg|milk|cream|yoghurt|butter|cheese|feta|halloumi|paneer|gruyere|parmesan|mozzarella|cheddar|creme fraiche|quark|" +
        "ricotta|mascarpone|burrata|ghee|skyr",
    ),
    "Dairy and eggs",
  ],
  [
    words(
      "onion|shallot|garlic|ginger|chilli|jalapeno|pepper|carrot|cucumber|tomato|potato|cauliflower|broccoli|broccolini|" +
        "celeriac|celery|kale|spinach|lettuce|salad|cabbage|kohlrabi|pak choi|bok choy|radish|avocado|lemon|lime|orange|" +
        "mango|pomegranate|apple|pear|banana|berry|grape|courgette|aubergine|leek|mushroom|pea|beetroot|parsnip|squash|" +
        "pumpkin|fennel|asparagus|rocket|watercress|herb|coriander|parsley|mint|basil|dill|chive|rosemary|thyme|sage|" +
        "tarragon|lemongrass|sprout|corn",
    ),
    "Fruit and veg",
  ],
];

export function shoppingSection(key: string, unit: string | null): Section {
  for (const [rule, section] of SECTION_RULES) {
    if (section === "Cans, jars and sauces" && (unit === "can" || unit === "jar")) return section;
    if (rule.test(key)) return section;
  }
  return "Other";
}

/** Names that are the same thing to buy. Kept short on purpose: "red onion" and "onion" stay apart. */
const SAME_THING: Record<string, string> = {
  "feta cheese": "feta",
  "halloumi cheese": "halloumi",
  "parmesan cheese": "parmesan",
  "mozzarella cheese": "mozzarella",
  "cheddar cheese": "cheddar",
  "spinach leaf": "spinach",
};

/** The key two lines must share to be added up; "2 garlic cloves" becomes garlic, counted in cloves. */
export function shoppingKey(item: Pick<ParsedIngredient, "name" | "unit">): { key: string; unit: string | null; name: string } {
  const key = ingredientKey(item.name);
  if (key === "garlic clove" && item.unit === null) return { key: "garlic", unit: "clove", name: "garlic" };
  return { key: SAME_THING[key] ?? key, unit: item.unit, name: item.name };
}

type Kind = "g" | "ml" | "spoon" | "count" | "piece" | "some";
type Part = { kind: Kind; unit: string | null; amount: number; metric: number | null; metricUnit: "g" | "ml" | null; approximate: boolean };

const TO_BASE: Record<string, ["g" | "ml", number]> = { g: ["g", 1], kg: ["g", 1000], ml: ["ml", 1], cl: ["ml", 10], dl: ["ml", 100], l: ["ml", 1000] };
const SPOON_ML: Record<string, number> = { tsp: 5, tbsp: 15 };

function toPart(item: ParsedIngredient, unit: string | null, factor: number): Part {
  const top = item.quantityMax ?? item.quantity;
  const approximate = item.quantityMax !== null;
  if (top === null) return { kind: "some", unit: null, amount: 0, metric: null, metricUnit: null, approximate: false };
  if (unit && TO_BASE[unit]) {
    const [base, toBase] = TO_BASE[unit];
    return { kind: base, unit: base, amount: top * toBase * factor, metric: null, metricUnit: null, approximate };
  }
  if (unit && SPOON_ML[unit]) {
    return { kind: "spoon", unit: "ml", amount: top * SPOON_ML[unit] * factor, metric: null, metricUnit: null, approximate };
  }
  return {
    kind: unit ? "count" : "piece",
    unit,
    amount: top * factor,
    metric: item.metric ? item.metric.value * factor : null,
    metricUnit: item.metric?.unit ?? null,
    approximate: approximate || Boolean(item.metric?.approximate),
  };
}

/**
 * Adds up parts of the same kind and unit. Spoons join millilitres; packs and
 * cans stay apart from grams ("1 can + 200 g"), since a can's contents aren't
 * the same as its weight on the label.
 */
function combine(parts: Part[]): Part[] {
  const sums = new Map<string, Part>();
  for (const part of parts) {
    const id = `${part.kind}:${part.unit}`;
    const sum = sums.get(id);
    if (!sum) {
      sums.set(id, { ...part });
      continue;
    }
    sum.amount += part.amount;
    sum.approximate ||= part.approximate;
    sum.metric = sum.metric !== null && part.metric !== null && sum.metricUnit === part.metricUnit ? sum.metric + part.metric : null;
  }
  let result = [...sums.values()];
  const ml = result.find((p) => p.kind === "ml");
  const spoons = result.find((p) => p.kind === "spoon");
  if (ml && spoons) {
    ml.amount += spoons.amount;
    ml.approximate ||= spoons.approximate;
    result = result.filter((p) => p !== spoons);
  }
  if (result.length > 1) result = result.filter((p) => p.kind !== "some");
  return result;
}

/** Up to a step you can weigh or buy: 5 g below 100, 10 g below 1,000, then 50 g. */
export function roundUpForShop(value: number): number {
  const step = value < 100 ? 5 : value < 1000 ? 10 : 50;
  return Math.ceil(value / step - 1e-9) * step;
}

const upTo = (value: number, step: number) => Math.ceil(value / step - 1e-9) * step;

function formatPart(part: Part): string {
  switch (part.kind) {
    case "some":
      return "as needed";
    case "g":
    case "ml":
      return formatMetric({ value: roundUpForShop(part.amount), unit: part.kind, approximate: part.approximate });
    case "spoon":
      return part.amount >= 15 ? `${formatQuantity(upTo(part.amount / 15, 0.5))} tbsp` : `${formatQuantity(upTo(part.amount / 5, 0.25))} tsp`;
    default: {
      const buy = Math.max(1, Math.ceil(part.amount - 0.01));
      const extras: string[] = [];
      const needed = upTo(part.amount, 0.25);
      if (needed < buy) extras.push(`${formatQuantity(needed)} needed`);
      if (part.metric !== null && part.metricUnit) {
        extras.push(formatMetric({ value: roundUpForShop(part.metric), unit: part.metricUnit, approximate: part.approximate }));
      }
      const text = part.unit ? `${buy} ${formatUnit(part.unit, buy)}` : String(buy);
      return extras.length ? `${text} (${extras.join(", ")})` : text;
    }
  }
}

/** "fresh flat-leaf parsley" → "Flat-leaf parsley". */
function displayName(name: string): string {
  const plain = name.replace(/^fresh\s+/i, "");
  return plain.charAt(0).toUpperCase() + plain.slice(1);
}

/** The amount to buy in one part, as a number (grams, millilitres, cans, pieces). */
function buyValue(part: Part): number {
  if (part.kind === "g" || part.kind === "ml") return roundUpForShop(part.amount);
  if (part.kind === "count" || part.kind === "piece") return Math.max(1, Math.ceil(part.amount - 0.01));
  return Math.round(part.amount * 100) / 100;
}

/** "g:g=720;count:can=2": what a tick remembers, so a later change in the plan can be compared. */
function measureOf(parts: Part[]): string {
  return parts.map((p) => `${p.kind}:${p.unit ?? ""}=${buyValue(p)}`).join(";");
}

/** True when what was ticked (`ticked`) is at least what the list asks for now. */
export function covers(ticked: string, now: string): boolean {
  const had = new Map(ticked.split(";").filter(Boolean).map((p) => p.split("=") as [string, string]));
  return now
    .split(";")
    .filter(Boolean)
    .every((p) => {
      const [unit, value] = p.split("=");
      return had.has(unit) && Number(had.get(unit)) >= Number(value) - 1e-9;
    });
}

export type ShoppingSource = { recipeId: string; title: string; day: number | null; line: string };

export type ShoppingItem = {
  key: string;
  name: string;
  section: Section;
  /** "720 g", "3 cans (about 1.2 kg)", "2 (1½ needed)", "2 + 300 g". */
  amount: string;
  /** What a tick remembers; see `covers`. */
  measure: string;
  optional: boolean;
  sources: ShoppingSource[];
};

type Collected = { name: string; unit: string | null; parts: Part[]; optional: boolean; sources: ShoppingSource[] };

export function buildShoppingList(
  dishes: PlannedDish[],
  recipes: Map<string, Pick<PlanRecipe, "id" | "title" | "servings" | "ingredients">>,
  portions: Map<string, DishPortions>,
): ShoppingItem[] {
  const byKey = new Map<string, Collected>();
  const ordered = [...dishes].sort((a, b) => (a.day ?? 7) - (b.day ?? 7));
  for (const dish of ordered) {
    const recipe = recipes.get(dish.recipeId);
    const dishPortions = portions.get(dish.recipeId);
    if (!recipe || !dishPortions) continue;
    const factor = dishPortions.total / recipe.servings;
    for (const item of recipe.ingredients) {
      const { key, unit, name } = shoppingKey(item);
      if (!key || SKIP.test(key)) continue;
      const entry = byKey.get(key) ?? { name, unit, parts: [], optional: true, sources: [] };
      if (name.length < entry.name.length) entry.name = name;
      entry.parts.push(toPart(item, unit, factor));
      entry.optional &&= item.optional;
      entry.sources.push({ recipeId: recipe.id, title: recipe.title, day: dish.day, line: scaleLine(item, factor).text });
      byKey.set(key, entry);
    }
  }
  const items = [...byKey].map(([key, entry]) => {
    const parts = combine(entry.parts);
    return {
      key,
      name: displayName(entry.name),
      section: shoppingSection(key, entry.unit),
      amount: parts.map(formatPart).join(" + "),
      measure: measureOf(parts),
      optional: entry.optional,
      sources: entry.sources,
    };
  });
  return items.sort((a, b) => SECTIONS.indexOf(a.section) - SECTIONS.indexOf(b.section) || a.name.localeCompare(b.name));
}
