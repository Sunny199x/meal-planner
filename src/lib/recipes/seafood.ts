// Household rule: no seafood. This flags recipes that contain fish or shellfish,
// and warns about ingredients that often contain fish without saying so.

export type SeafoodFinding = {
  /** The ingredient (or title) where it was found. */
  text: string;
  term: string;
  level: "contains" | "may contain";
};

const CONTAINS = [
  "fish", "fishes", "seafood", "salmon", "tuna", "cod", "haddock", "pollock", "pollack", "hake",
  "mackerel", "sardine", "sardines", "anchovy", "anchovies", "herring", "trout", "tilapia",
  "sea bass", "seabass", "halibut", "plaice", "catfish", "monkfish", "swordfish", "snapper",
  "prawn", "prawns", "shrimp", "shrimps", "crab", "crabs", "lobster", "lobsters", "crayfish",
  "langoustine", "langoustines", "mussel", "mussels", "clam", "clams", "oyster", "oysters",
  "scallop", "scallops", "squid", "calamari", "octopus", "cuttlefish", "surimi", "caviar", "roe",
  "fish sauce", "nam pla", "oyster sauce", "shrimp paste", "anchovy paste", "bonito",
  // Common Swedish names, in case a recipe is copied from a Swedish source.
  "lax", "torsk", "räkor", "räka", "sill", "tonfisk", "musslor", "kräftor", "kaviar", "sej",
];

const MAY_CONTAIN = [
  "worcestershire sauce", "worcestershire", "caesar dressing", "curry paste", "red curry paste",
  "green curry paste", "yellow curry paste", "kimchi", "dashi", "xo sauce", "furikake",
];

/** Phrases that mention a seafood word but aren't seafood, or that the household allows. */
const NOT_SEAFOOD = [
  // The household's choice (Sunny, 2 November 2026): oyster sauce is fine. Fish sauce isn't.
  "oyster sauce",
  "oyster mushroom", "oyster mushrooms", "lobster mushroom", "lobster mushrooms",
  "vegan fish sauce", "vegetarian fish sauce", "vegan oyster sauce", "vegetarian oyster sauce",
  "mushroom oyster sauce", "fish-free", "fish free", "vegan worcestershire sauce",
  "vegetarian worcestershire sauce", "vegan kimchi", "vegan caesar dressing",
];

function wordPattern(term: string): RegExp {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/ /g, "\\s+");
  return new RegExp(`(?<!\\p{L})${escaped}(?!\\p{L})`, "iu");
}

const containsPatterns = CONTAINS.map((term) => ({ term, re: wordPattern(term) }));
const mayContainPatterns = MAY_CONTAIN.map((term) => ({ term, re: wordPattern(term) }));
const excludePatterns = NOT_SEAFOOD.map((term) => new RegExp(wordPattern(term).source, "giu"));

export function findSeafood(text: string): SeafoodFinding | null {
  let cleaned = text;
  for (const re of excludePatterns) cleaned = cleaned.replace(re, " ");
  const contains = containsPatterns.find(({ re }) => re.test(cleaned));
  if (contains) return { text, term: contains.term, level: "contains" };
  const may = mayContainPatterns.find(({ re }) => re.test(cleaned));
  if (may) return { text, term: may.term, level: "may contain" };
  return null;
}

/** Checks the title and every ingredient name; returns one finding per ingredient. */
export function checkRecipeForSeafood(recipe: {
  title: string;
  ingredients: { name: string }[];
}): SeafoodFinding[] {
  const findings: SeafoodFinding[] = [];
  const title = findSeafood(recipe.title);
  if (title) findings.push(title);
  for (const ingredient of recipe.ingredients) {
    const finding = findSeafood(ingredient.name);
    if (finding) findings.push(finding);
  }
  return findings;
}
