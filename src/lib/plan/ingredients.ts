// Deciding when two recipes really share an ingredient. Names are reduced to
// a simple key ("Baby spinach leaves" → "spinach leaf"), and ingredients are
// sorted into staples (always in the house), cupboard items (keep for months)
// and fresh food. Only fresh food in a real amount counts as shared.
import type { ParsedIngredient } from "../recipes/parse-ingredient-line";

const DESCRIPTORS = new Set([
  "fresh", "chopped", "sliced", "diced", "grated", "minced", "large", "small", "medium", "ripe",
  "boneless", "skinless", "thin", "thick", "baby", "organic", "whole", "finely", "roughly", "a",
  "of", "extra", "virgin", "free-range", "unsalted", "salted", "plain", "mini", "handful",
]);

const SYNONYMS: Record<string, string> = {
  cilantro: "coriander",
  eggplant: "aubergine",
  zucchini: "courgette",
  yogurt: "yoghurt",
  chili: "chilli",
  chile: "chilli",
  scallion: "spring onion",
  "green onion": "spring onion",
  garbanzo: "chickpea",
  capsicum: "pepper",
  "bell pepper": "pepper",
};

const IRREGULAR: Record<string, string> = { leaves: "leaf", halves: "half", loaves: "loaf" };

function singular(word: string): string {
  if (IRREGULAR[word]) return IRREGULAR[word];
  if (/(ss|us|is)$/.test(word)) return word;
  if (word.endsWith("ies") && word.length > 4) return word.slice(0, -3) + "y";
  if (/(oes|ches|shes|xes)$/.test(word)) return word.slice(0, -2);
  if (word.endsWith("s") && word.length > 3) return word.slice(0, -1);
  return word;
}

/** "Baby spinach leaves" → "spinach leaf"; "Greek yogurt" → "greek yoghurt". */
export function ingredientKey(name: string): string {
  let text = name
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z\s-]/g, " ");
  for (const [from, to] of Object.entries(SYNONYMS)) {
    text = text.replace(new RegExp(`\\b${from}s?\\b`, "g"), to);
  }
  const words = text.split(/\s+/).filter((w) => w && !DESCRIPTORS.has(w));
  return words.map(singular).join(" ");
}

/** Words that can follow an ingredient without making it a different one ("feta cheese"). */
const GENERIC_TAIL = new Set(["cheese", "leaf", "fillet", "piece", "chunk"]);

/**
 * Same ingredient if the keys match, if one ends with the other ("baby spinach" /
 * "spinach"), or if the only extra word is generic ("feta cheese" / "feta").
 * "chicken stock" and "chicken" stay different.
 */
export function sameIngredient(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const [long, short] = a.length > b.length ? [a, b] : [b, a];
  if (long.endsWith(` ${short}`)) return true;
  return long.startsWith(`${short} `) && long.slice(short.length + 1).split(" ").every((w) => GENERIC_TAIL.has(w));
}

const STAPLE = new RegExp(
  "^(salt|pepper|black pepper|white pepper|water|ice)$|" +
    "\\b(oil|ghee|butter|margarine|vinegar|sugar|flour|cornflour|cornstarch|garlic|garlic clove|shallot)$|" +
    "^(onion|red onion|yellow onion|white onion|brown onion)$|" +
    "^(ground|dried) |\\b(seed|powder|flake|spice|spice mix|seasoning|stock|stock cube|bouillon|bay leaf)$|" +
    "^(paprika|smoked paprika|turmeric|cumin|cinnamon|nutmeg|garam masala|curry powder|oregano|chilli powder|cayenne|allspice|cardamom|clove|fennel seed|mustard seed)$",
);

const CUPBOARD = new RegExp(
  "\\b(rice|pasta|spaghetti|penne|fusilli|macaroni|linguine|tagliatelle|rigatoni|orzo|lasagne|noodle|couscous|bulgur|bulgar|quinoa|" +
    "lentil|split pea|tortilla chip|cracker|peanut|almond|cashew|walnut|pine nut|sesame|coconut milk|desiccated coconut|" +
    "sauce|chutney|curry paste|harissa|pesto|mayo|mayonnaise|ketchup|mustard|tahini|tomato paste|tomato puree|passata|" +
    "chopped tomato|honey|maple syrup|syrup|breadcrumb|panko|raisin|chocolate|cocoa|jam|stock|broth)\\b",
);

export type IngredientKind = "staple" | "cupboard" | "fresh";

export function ingredientKind(item: Pick<ParsedIngredient, "name" | "unit">): IngredientKind {
  const key = ingredientKey(item.name);
  if (!key || STAPLE.test(key)) return "staple";
  if (item.unit === "can" || item.unit === "jar" || CUPBOARD.test(key)) return "cupboard";
  return "fresh";
}

const HERB = /\b(coriander|parsley|basil|mint|dill|chive|tarragon|lemongrass)\b/;

/** A real amount: at least 30 g/ml, half an item, or any fresh herbs (a bunch goes off fast). */
export function isRealAmount(item: ParsedIngredient): boolean {
  if (HERB.test(ingredientKey(item.name))) return true;
  if (item.metric && item.unit !== "tsp" && item.unit !== "tbsp") return item.metric.value >= 30;
  const countable = item.unit === null || !["tsp", "tbsp", "pinch"].includes(item.unit);
  return countable && (item.quantityMax ?? item.quantity ?? 0) >= 0.5;
}

/** Make-ahead names match ignoring case, "the/a/an" and punctuation. */
export function prepKey(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["the", "a", "an"].includes(w))
    .join(" ");
}

/** "Mexican-inspired" → "mexican". */
export function cuisineKey(cuisine: string): string {
  return cuisine.toLowerCase().replace(/[-\s]*(inspired|style)$/, "").trim();
}

const PROTEINS: [RegExp, string][] = [
  [/chicken/, "chicken"],
  [/beef|steak/, "beef"],
  [/pork|bacon|ham|sausage/, "pork"],
  [/lamb/, "lamb"],
  [/turkey/, "turkey"],
  [/plant-based|vegan|soy|tofu|tempeh|seitan|quorn/, "plant-based"],
  [/lentil|dal|daal|dhal/, "lentils"],
  [/chickpea/, "chickpeas"],
  [/bean/, "beans"],
  [/egg/, "eggs"],
  [/paneer|halloumi|feta|cheese/, "cheese"],
];

/** "beef and black beans" → "beef"; null when unknown. */
export function proteinKey(mainProtein: string | null): string | null {
  if (!mainProtein) return null;
  const text = mainProtein.toLowerCase();
  return PROTEINS.find(([re]) => re.test(text))?.[1] ?? null;
}
