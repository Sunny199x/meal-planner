// Scales an ingredient line to a different number of portions, for cooking.
// Amounts are rounded to what a kitchen scale or measuring spoon can manage;
// the shopping list rounds separately, up to what can be bought. Lines without
// an amount, or that couldn't be fully read, are shown as written.
import { formatMetric, formatQuantity, formatUnit } from "./format";
import { splitNote, type ParsedIngredient } from "./parse-ingredient-line";

const TO_BASE: Record<string, ["g" | "ml", number]> = {
  g: ["g", 1],
  kg: ["g", 1000],
  ml: ["ml", 1],
  cl: ["ml", 10],
  l: ["ml", 1000],
};

/** Units that already say how much; pieces, packs and cans may have a weight in brackets as well. */
const MEASURED = new Set(["g", "kg", "ml", "cl", "dl", "l", "tsp", "tbsp"]);

/** Grams and millilitres to a sensible step; spoons and pieces to quarters, or halves from 3 up. */
export function roundForKitchen(value: number, unit: string | null): number {
  if (unit === "g" || unit === "ml") {
    const step = value < 10 ? 0.5 : value < 100 ? 5 : value < 1000 ? 10 : 50;
    return Math.max(step, Math.round(value / step) * step);
  }
  const step = value < 3 ? 0.25 : 0.5;
  return Math.max(0.25, Math.round(value / step) * step);
}

const IRREGULAR_PLURAL: Record<string, string> = { chilli: "chillies", tomato: "tomatoes", potato: "potatoes" };

/** "red onion" → "red onions", for "1 red onion" made into 2. */
function plural(name: string): string {
  const match = name.match(/^(.*?)([a-z]+)$/i);
  if (!match) return name;
  const [, start, word] = match;
  const lower = word.toLowerCase();
  if (IRREGULAR_PLURAL[lower]) return start + IRREGULAR_PLURAL[lower];
  if (/s$/.test(lower)) return name;
  if (/(ch|sh|x)$/.test(lower)) return `${name}es`;
  if (/[^aeiou]y$/.test(lower)) return `${start}${word.slice(0, -1)}ies`;
  return `${name}s`;
}

/** The line as written, without "(optional)", split into the main part and the note after the comma. */
export function asWritten(item: Pick<ParsedIngredient, "line">): { text: string; note: string | null } {
  const withoutOptional = item.line.replace(/\s*\(\s*optional\s*\)\s*/gi, " ").replace(/,\s*optional\s*$/i, "");
  const [main, note] = splitNote(withoutOptional.trim());
  return { text: main.trim(), note: note.trim() || null };
}

export type ScaledLine = { text: string; note: string | null; scaled: boolean };

/** One ingredient line for `factor` times the recipe, e.g. 1.5 for 3 portions of a 2-portion recipe. */
export function scaleLine(item: ParsedIngredient, factor: number): ScaledLine {
  if (Math.abs(factor - 1) < 0.001 || item.quantity === null || item.problems.length > 0) {
    return { ...asWritten(item), scaled: false };
  }
  const { quantity, quantityMax, unit } = item;
  let amount: string;
  if (unit && TO_BASE[unit]) {
    const [base, toBase] = TO_BASE[unit];
    const low = roundForKitchen(quantity * factor * toBase, base);
    const high = quantityMax !== null ? roundForKitchen(quantityMax * factor * toBase, base) : null;
    const show = (value: number) => formatMetric({ value, unit: base, approximate: false });
    if (high === null || high === low) {
      amount = show(low);
    } else {
      const [lowNumber, lowUnit] = show(low).split(" ");
      amount = show(high).endsWith(` ${lowUnit}`) ? `${lowNumber}–${show(high)}` : `${show(low)}–${show(high)}`;
    }
  } else {
    const low = roundForKitchen(quantity * factor, unit);
    const high = quantityMax !== null ? roundForKitchen(quantityMax * factor, unit) : null;
    const top = high ?? low;
    const number = high !== null && high !== low ? `${formatQuantity(low)}–${formatQuantity(high)}` : formatQuantity(low);
    amount = unit ? `${number} ${formatUnit(unit, top)}` : number;
  }

  const many = (quantityMax ?? quantity) <= 1 && roundForKitchen((quantityMax ?? quantity) * factor, unit) > 1;
  const name = !unit && many ? plural(item.name) : item.name;
  let weight = "";
  if (item.metric && !MEASURED.has(unit ?? "")) {
    const value = roundForKitchen(item.metric.value * factor, item.metric.unit);
    weight = ` (${formatMetric({ ...item.metric, value })}${quantity * factor > 1 ? " in total" : ""})`;
  }
  return { text: `${amount} ${name}${weight}`, note: item.note, scaled: true };
}
