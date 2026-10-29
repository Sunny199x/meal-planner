// Shows a read ingredient amount the way people write it: "1½ tsp", "2 cans".
import type { MetricAmount, ParsedIngredient } from "./parse-ingredient-line";

const FRACTIONS: [number, string][] = [
  [1 / 4, "¼"],
  [1 / 3, "⅓"],
  [1 / 2, "½"],
  [2 / 3, "⅔"],
  [3 / 4, "¾"],
];

export function formatQuantity(value: number): string {
  const whole = Math.floor(value);
  const rest = value - whole;
  if (rest < 0.001) return String(whole);
  const fraction = FRACTIONS.find(([v]) => Math.abs(v - rest) < 0.01);
  if (fraction) return whole ? `${whole}${fraction[1]}` : fraction[1];
  return String(Math.round(value * 100) / 100);
}

const PLURAL_ES = new Set(["bunch", "pinch"]);
const METRIC_UNITS = new Set(["g", "kg", "ml", "cl", "dl", "l", "tsp", "tbsp"]);

export function formatUnit(unit: string, amount: number): string {
  if (METRIC_UNITS.has(unit) || amount <= 1) return unit;
  return PLURAL_ES.has(unit) ? `${unit}es` : `${unit}s`;
}

/** "250 g", "2–3", "1½ tsp", "2 cans"; empty when there is no amount. */
export function formatAmount(item: Pick<ParsedIngredient, "quantity" | "quantityMax" | "unit">): string {
  if (item.quantity === null) return "";
  const amount =
    item.quantityMax !== null
      ? `${formatQuantity(item.quantity)}–${formatQuantity(item.quantityMax)}`
      : formatQuantity(item.quantity);
  return item.unit ? `${amount} ${formatUnit(item.unit, item.quantityMax ?? item.quantity)}` : amount;
}

export function formatMetric(metric: MetricAmount): string {
  const value =
    metric.unit === "g" && metric.value >= 1000
      ? `${formatQuantity(metric.value / 1000)} kg`
      : metric.unit === "ml" && metric.value >= 1000
        ? `${formatQuantity(metric.value / 1000)} l`
        : `${formatQuantity(metric.value)} ${metric.unit}`;
  return metric.approximate ? `about ${value}` : value;
}
