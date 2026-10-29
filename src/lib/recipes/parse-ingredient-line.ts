// Reads one ingredient line, e.g. "2 cans black beans (400 g each), drained",
// into amount, unit, name and note. The line as written is always kept, and
// anything the parser can't read is reported rather than guessed.

export type MetricAmount = {
  /** Total amount in grams or millilitres for the whole line. */
  value: number;
  unit: "g" | "ml";
  /** True for "about 600 g" and for ranges like "2–3 tbsp" (upper value used). */
  approximate: boolean;
};

export type ParsedIngredient = {
  line: string;
  quantity: number | null;
  /** Upper end of a range such as "2–3"; null otherwise. */
  quantityMax: number | null;
  unit: string | null;
  name: string;
  note: string | null;
  optional: boolean;
  metric: MetricAmount | null;
  problems: string[];
};

type UnitInfo = { unit: string; kind: "mass" | "volume" | "count"; factor: number };

const UNITS: Record<string, UnitInfo> = {};
function addUnit(unit: string, kind: UnitInfo["kind"], factor: number, aliases: string[]) {
  for (const alias of aliases) UNITS[alias] = { unit, kind, factor };
}
addUnit("g", "mass", 1, ["g", "gram", "grams", "gr"]);
addUnit("kg", "mass", 1000, ["kg", "kilo", "kilos", "kilogram", "kilograms"]);
addUnit("ml", "volume", 1, ["ml", "millilitre", "millilitres", "milliliter", "milliliters"]);
addUnit("cl", "volume", 10, ["cl"]);
addUnit("dl", "volume", 100, ["dl"]);
addUnit("l", "volume", 1000, ["l", "litre", "litres", "liter", "liters"]);
// Metric measuring spoons: 1 tsp = 5 ml, 1 tbsp = 15 ml. Swedish tsk/msk/krm are accepted too.
addUnit("tsp", "volume", 5, ["tsp", "teaspoon", "teaspoons", "tsk"]);
addUnit("tbsp", "volume", 15, ["tbsp", "tablespoon", "tablespoons", "msk"]);
addUnit("ml", "volume", 1, ["krm"]);
addUnit("can", "count", 1, ["can", "cans", "tin", "tins"]);
addUnit("jar", "count", 1, ["jar", "jars"]);
addUnit("pack", "count", 1, ["pack", "packs", "packet", "packets", "package", "packages"]);
addUnit("bag", "count", 1, ["bag", "bags"]);
addUnit("bottle", "count", 1, ["bottle", "bottles"]);
addUnit("clove", "count", 1, ["clove", "cloves"]);
addUnit("bunch", "count", 1, ["bunch", "bunches"]);
addUnit("pinch", "count", 1, ["pinch", "pinches"]);
addUnit("handful", "count", 1, ["handful", "handfuls"]);
addUnit("slice", "count", 1, ["slice", "slices"]);
addUnit("sprig", "count", 1, ["sprig", "sprigs"]);
addUnit("stalk", "count", 1, ["stalk", "stalks"]);
addUnit("stick", "count", 1, ["stick", "sticks"]);
addUnit("sheet", "count", 1, ["sheet", "sheets"]);
addUnit("head", "count", 1, ["head", "heads"]);
addUnit("piece", "count", 1, ["piece", "pieces", "pc", "pcs"]);

/** Containers are labelled per container, so "2 cans (400 g)" means 400 g each. */
const CONTAINERS = new Set(["can", "jar", "pack", "bag", "bottle"]);

const NON_METRIC = new Set([
  "cup", "cups", "oz", "ounce", "ounces", "lb", "lbs", "pound", "pounds",
  "pint", "pints", "quart", "quarts", "gallon", "gallons", "fl",
]);

const UNICODE_FRACTIONS: Record<string, number> = {
  "½": 1 / 2, "⅓": 1 / 3, "⅔": 2 / 3, "¼": 1 / 4, "¾": 3 / 4,
  "⅕": 1 / 5, "⅖": 2 / 5, "⅗": 3 / 5, "⅘": 4 / 5, "⅙": 1 / 6, "⅚": 5 / 6,
  "⅛": 1 / 8, "⅜": 3 / 8, "⅝": 5 / 8, "⅞": 7 / 8,
};
const FR = Object.keys(UNICODE_FRACTIONS).join("");

// One amount: "1 1/2", "1/2", "0.5", "0,5", "1½", "1 ½", "½". Longer forms come
// first because the regex takes the first alternative that matches.
const NUM = `(?:\\d+\\s+\\d+\\/\\d+|\\d+\\/\\d+|\\d+(?:[.,]\\d+)?(?:\\s*[${FR}])?|[${FR}])`;
const QUANTITY_RE = new RegExp(`^(${NUM})(?:\\s*(?:-|–|—|to)\\s*(${NUM}))?`);
const WORD_RE = /^([a-zA-Z]+)\.?(?=\s|$|[(])/;
const TIMES_RE = new RegExp(`^(${NUM})\\s*[x×]\\s*(${NUM})\\s*([a-zA-Z]+)\\.?(?=\\s|$)`);
const WEIGHT_NOTE_RE = new RegExp(
  `^(?:(about|approx\\.?|approximately|ca\\.?|c\\.|roughly|around|~)\\s*)?(${NUM})\\s*(g|kg|ml|cl|dl|l)\\.?\\s*(each|per\\s+\\w+|in\\s+total|total)?$`,
  "i",
);

export function parseAmount(text: string): number | null {
  const t = text.trim().replace(/\s+/g, " ");
  let m = t.match(/^(\d+) (\d+)\/(\d+)$/);
  if (m) return divide(Number(m[1]) * Number(m[3]) + Number(m[2]), Number(m[3]));
  m = t.match(/^(\d+)\/(\d+)$/);
  if (m) return divide(Number(m[1]), Number(m[2]));
  m = t.match(new RegExp(`^(\\d+)? ?([${FR}])$`));
  if (m) return (m[1] ? Number(m[1]) : 0) + UNICODE_FRACTIONS[m[2]];
  if (/^\d+(?:[.,]\d+)?$/.test(t)) return Number(t.replace(",", "."));
  return null;
}

function divide(a: number, b: number): number | null {
  return b === 0 ? null : a / b;
}

/** Splits at the first comma that isn't inside brackets or a decimal like "1,5". */
function splitNote(text: string): [string, string] {
  let depth = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === "(") depth++;
    else if (c === ")") depth = Math.max(0, depth - 1);
    else if (c === "," && depth === 0 && !(/\d/.test(text[i - 1]) && /\d/.test(text[i + 1]))) {
      return [text.slice(0, i), text.slice(i + 1)];
    }
  }
  return [text, ""];
}

function tidy(text: string): string {
  return text.replace(/\s+/g, " ").replace(/\s+([,.)])/g, "$1").replace(/\(\s+/g, "(").trim();
}

function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}

function unitOf(word: string): UnitInfo | undefined {
  return UNITS[word.toLowerCase()];
}

type BracketWeight = { value: number; unit: UnitInfo; each: boolean | null; approximate: boolean };

function readBracketWeight(content: string): BracketWeight | null {
  const w = content.match(WEIGHT_NOTE_RE);
  const amount = w ? parseAmount(w[2]) : null;
  if (!w || amount === null) return null;
  const qualifier = w[4]?.toLowerCase() ?? "";
  return {
    value: amount,
    unit: unitOf(w[3])!,
    each: qualifier === "" ? null : qualifier === "each" || qualifier.startsWith("per"),
    approximate: Boolean(w[1]),
  };
}

export function parseIngredientLine(input: string): ParsedIngredient {
  const line = input.trim().replace(/^[-*]\s+/, "");
  const problems: string[] = [];
  const notes: string[] = [];
  let optional = false;
  let weight: BracketWeight | null = null;

  const [rawHead, rawTail] = splitNote(line);

  // Brackets before the comma hold a weight like "(400 g each)", "(optional)" or a note.
  let head = rawHead.replace(/\(([^()]*)\)/g, (_match, inner: string) => {
    const content = inner.trim();
    const bracketWeight = weight ? null : readBracketWeight(content);
    if (/^optional$/i.test(content)) optional = true;
    else if (bracketWeight) weight = bracketWeight;
    else if (content) notes.push(content);
    return " ";
  });

  // After the comma everything is a note, apart from "(optional)".
  let tail = rawTail.replace(/\(\s*optional\s*\)/gi, () => {
    optional = true;
    return " ";
  });
  if (/^\s*optional\s*$/i.test(tail)) {
    optional = true;
    tail = "";
  }
  if (tidy(tail)) notes.unshift(tidy(tail));

  head = tidy(head);
  let quantity: number | null = null;
  let quantityMax: number | null = null;
  let unit: UnitInfo | null = null;
  let perItem: { value: number; unit: UnitInfo } | null = null;

  const times = head.match(TIMES_RE);
  const timesUnit = times ? unitOf(times[3]) : undefined;
  if (times && timesUnit && timesUnit.kind !== "count") {
    // "2 x 400 g cans chopped tomatoes"
    quantity = parseAmount(times[1]);
    const size = parseAmount(times[2]);
    if (size !== null) perItem = { value: size, unit: timesUnit };
    head = head.slice(times[0].length).trim();
    const next = head.match(WORD_RE);
    if (next && unitOf(next[1])?.kind === "count") {
      unit = unitOf(next[1])!;
      head = head.slice(next[0].length).trim();
    }
  } else {
    const q = head.match(QUANTITY_RE);
    if (q) {
      quantity = parseAmount(q[1]);
      quantityMax = q[2] ? parseAmount(q[2]) : null;
      if (quantity === null || (q[2] && quantityMax === null)) {
        problems.push(`Couldn't read the amount "${q[0].trim()}".`);
        quantity = null;
        quantityMax = null;
      }
      head = head.slice(q[0].length).trim();
    } else {
      // "a pinch of salt": only when "a" is followed by a unit.
      const a = head.match(/^an?\s+([a-zA-Z]+)/i);
      if (a && unitOf(a[1])?.kind === "count") {
        quantity = 1;
        head = head.replace(/^an?\s+/i, "");
      }
    }

    const word = quantity !== null ? head.match(WORD_RE) : null;
    if (word && unitOf(word[1])) {
      unit = unitOf(word[1])!;
      head = head.slice(word[0].length).trim();
    } else if (word && NON_METRIC.has(word[1].toLowerCase())) {
      problems.push(`"${word[1]}" isn't a metric unit. Please use g, kg, ml, dl, l, tsp or tbsp.`);
    }
  }

  const name = head.replace(/^of\s+/i, "").trim();
  if (!name) problems.push("No ingredient name found.");

  const top = quantityMax ?? quantity;
  let metric: MetricAmount | null = null;
  if (unit && unit.kind !== "count" && top !== null) {
    metric = { value: top * unit.factor, unit: baseUnit(unit), approximate: quantityMax !== null };
  } else if (perItem) {
    metric = {
      value: (quantity ?? 1) * perItem.value * perItem.unit.factor,
      unit: baseUnit(perItem.unit),
      approximate: false,
    };
  } else if (weight) {
    const w: BracketWeight = weight;
    const each = w.each ?? (unit !== null && CONTAINERS.has(unit.unit));
    metric = {
      value: (each ? (top ?? 1) : 1) * w.value * w.unit.factor,
      unit: baseUnit(w.unit),
      approximate: w.approximate || (each && quantityMax !== null),
    };
  }
  if (metric) metric.value = round(metric.value);

  return {
    line,
    quantity: quantity === null ? null : round(quantity),
    quantityMax: quantityMax === null ? null : round(quantityMax),
    unit: unit?.unit ?? null,
    name,
    note: notes.length ? notes.join("; ") : null,
    optional,
    metric,
    problems,
  };
}

function baseUnit(unit: UnitInfo): "g" | "ml" {
  return unit.kind === "mass" ? "g" : "ml";
}
