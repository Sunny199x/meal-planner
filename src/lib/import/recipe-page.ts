// Finding the recipe in a web page. Most recipe sites describe the recipe in a
// standard machine-readable block (schema.org "Recipe" in JSON-LD); that is read
// first. Without one, the page's visible text is used, and Claude finds the
// recipe in it.

export type PageRecipe = {
  title: string;
  servings: string | null;
  totalMinutes: number | null;
  prepMinutes: number | null;
  cookMinutes: number | null;
  cuisine: string | null;
  ingredients: string[];
  steps: string[];
};

export type PageReading = {
  recipe: PageRecipe | null;
  /** The page's visible text, for when there is no recipe block. */
  text: string;
  image: string | null;
  siteName: string | null;
  title: string | null;
};

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", ndash: "–", mdash: "—", deg: "°", frac12: "½", frac14: "¼", frac34: "¾" };

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+\d*);/gi, (match, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : match;
    }
    return ENTITIES[code.toLowerCase()] ?? match;
  });
}

const clean = (text: unknown): string =>
  typeof text === "string" ? decodeEntities(text.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim() : "";

/** "PT1H30M" → 90; "P0DT0H25M" → 25. */
export function isoMinutes(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const match = value.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:\d+S)?)?$/i);
  if (!match) return null;
  const minutes = Number(match[1] ?? 0) * 1440 + Number(match[2] ?? 0) * 60 + Number(match[3] ?? 0);
  return minutes > 0 ? minutes : null;
}

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : value === undefined || value === null ? [] : [value]);

function isRecipe(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== "object") return false;
  return asArray((node as Record<string, unknown>)["@type"]).some((t) => t === "Recipe");
}

/** The first Recipe anywhere in the JSON-LD (inside arrays and "@graph"). */
function findRecipeNode(value: unknown, depth = 0): Record<string, unknown> | null {
  if (depth > 6 || !value || typeof value !== "object") return null;
  if (isRecipe(value)) return value;
  const children = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
  for (const child of children) {
    const found = findRecipeNode(child, depth + 1);
    if (found) return found;
  }
  return null;
}

/** Steps from a string, a list of strings, HowToStep objects or HowToSection groups. */
function readSteps(value: unknown): string[] {
  const steps: string[] = [];
  for (const item of asArray(value)) {
    if (typeof item === "string") {
      const text = clean(item);
      // One long string: split it into sentences so each step stands alone.
      if (asArray(value).length === 1) steps.push(...text.split(/(?<=\.)\s+(?=[A-Z])/).filter(Boolean));
      else if (text) steps.push(text);
    } else if (item && typeof item === "object") {
      const node = item as Record<string, unknown>;
      if (asArray(node["@type"]).includes("HowToSection")) {
        const name = clean(node.name).replace(/\s*:$/, ""); // some sites write "Sauce:"
        const inner = readSteps(node.itemListElement);
        steps.push(...inner.map((step, i) => (i === 0 && name ? `${name}: ${step}` : step)));
      } else {
        const text = clean(node.text ?? node.name);
        if (text) steps.push(text);
      }
    }
  }
  return steps;
}

function readImage(value: unknown, pageUrl: string): string | null {
  for (const item of asArray(value)) {
    const url = typeof item === "string" ? item : item && typeof item === "object" ? (item as Record<string, unknown>).url : null;
    if (typeof url === "string" && url.trim()) {
      try {
        return new URL(decodeEntities(url.trim()), pageUrl).toString();
      } catch {
        // Not a usable address; try the next one.
      }
    }
  }
  return null;
}

function meta(html: string, property: string): string | null {
  const tag = html.match(new RegExp(`<meta[^>]+(?:property|name)=["']${property}["'][^>]*>`, "i"))?.[0];
  const content = tag?.match(/content=["']([^"']*)["']/i)?.[1];
  return content ? decodeEntities(content).trim() || null : null;
}

/** The text a person would see: no scripts, styles, menus or footers. */
export function visibleText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|nav|header|footer|form|iframe)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<\/(p|div|li|h[1-6]|tr|section|article)>|<br\s*\/?>/gi, "\n")
      .replace(/<[^>]*>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function readRecipePage(html: string, pageUrl: string): PageReading {
  let node: Record<string, unknown> | null = null;
  for (const block of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      node = findRecipeNode(JSON.parse(block[1].trim()));
    } catch {
      continue; // Some sites publish broken blocks; skip them.
    }
    if (node) break;
  }
  const recipe: PageRecipe | null = node
    ? {
        title: clean(node.name),
        servings: asArray(node.recipeYield).map((y) => clean(String(y))).find((y) => /\d/.test(y)) ?? null,
        totalMinutes: isoMinutes(node.totalTime),
        prepMinutes: isoMinutes(node.prepTime),
        cookMinutes: isoMinutes(node.cookTime),
        cuisine: asArray(node.recipeCuisine).map(clean).filter(Boolean).join(", ") || null,
        ingredients: asArray(node.recipeIngredient).map(clean).filter(Boolean),
        steps: readSteps(node.recipeInstructions),
      }
    : null;
  return {
    recipe: recipe && recipe.ingredients.length > 0 ? recipe : null,
    text: visibleText(html).slice(0, 30_000),
    image: (node && readImage(node.image, pageUrl)) ?? readImage(meta(html, "og:image"), pageUrl),
    siteName: meta(html, "og:site_name"),
    title: meta(html, "og:title") ?? clean(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]) ?? null,
  };
}

/** The recipe block written out as plain text for Claude, so it reads a short, clean version. */
export function recipeAsText(recipe: PageRecipe): string {
  const times = [
    recipe.totalMinutes ? `total ${recipe.totalMinutes} minutes` : null,
    recipe.prepMinutes ? `preparation ${recipe.prepMinutes} minutes` : null,
    recipe.cookMinutes ? `cooking ${recipe.cookMinutes} minutes` : null,
  ].filter((time) => time !== null);
  return [
    `Title: ${recipe.title}`,
    recipe.servings ? `Servings: ${recipe.servings}` : null,
    times.length > 0 ? `Time: ${times.join(", ")}` : null,
    recipe.cuisine ? `Cuisine: ${recipe.cuisine}` : null,
    "",
    "Ingredients:",
    ...recipe.ingredients.map((line) => `- ${line}`),
    "",
    "Steps:",
    ...recipe.steps.map((step, i) => `${i + 1}. ${step}`),
  ]
    .filter((line) => line !== null)
    .join("\n");
}
