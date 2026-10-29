// The weekly plan: which evenings we cook, how much time there is, portions,
// and the dishes chosen.

export const TIME_SLOTS = {
  quick: { label: "Quick", maxMinutes: 25 },
  normal: { label: "Normal", maxMinutes: 45 },
  relaxed: { label: "Relaxed", maxMinutes: null },
} as const;
export type TimeSlot = keyof typeof TIME_SLOTS;

export const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** One entry per day, Monday first. */
export type Evening = { cooking: boolean; time: TimeSlot };

export type Person = {
  name: string;
  /** Dinner size in portions; 1 is a normal portion. */
  dinnerPortion: number;
  /** Lunch boxes from leftovers this week. */
  lunches: number;
};

export type WeekSetup = {
  evenings: Evening[];
  people: Person[];
  /** "What would you like to use?" Free text, one ingredient per entry. */
  ingredientsToUse: string[];
};

export type PlannedDish = {
  recipeId: string;
  /** 0 = Monday … 6 = Sunday; null while not yet on an evening. */
  day: number | null;
  addedAt: string;
  via: "start" | "suggestion" | "browse";
  /** Lunch boxes from this dish per person (same order as the setup's people). Unset = shared out automatically. */
  lunches?: number[];
  /** Extra portions for the freezer. */
  freezer?: number;
  /** A second evening this dish is eaten as leftovers, with no cooking. */
  alsoOn?: number | null;
};

/** Ticks on the week's shopping list, shared by both phones. Keys are shopping-list item keys. */
export type ShoppingState = {
  /** Item key → how much was bought (see `covers` in shopping.ts), so a bigger amount later shows up. */
  bought?: Record<string, string>;
  /** Already in the house: item key → the amount at the time. */
  have?: Record<string, string>;
  /** Items added by hand, by id. */
  extra?: Record<string, { text: string; addedAt: string }>;
};

export const PORTION_CHOICES = [0.75, 1, 1.25, 1.5, 2];
export const MAX_LUNCHES = 7;
export const MAX_FREEZER = 12;

export const DEFAULT_SETUP: WeekSetup = {
  evenings: DAY_NAMES.map((_, day) => ({ cooking: day < 5, time: day < 5 ? "normal" : "relaxed" })),
  people: [
    { name: "Sunny", dinnerPortion: 1.5, lunches: 4 },
    { name: "Victoria", dinnerPortion: 1, lunches: 0 },
  ],
  ingredientsToUse: [],
};

export function cookingEvenings(setup: WeekSetup): number[] {
  return setup.evenings.flatMap((evening, day) => (evening.cooking ? [day] : []));
}

/** Portions needed for the week: every cooking evening's dinners plus all lunches. */
export function portionsNeeded(setup: WeekSetup) {
  const perDinner = setup.people.reduce((sum, p) => sum + p.dinnerPortion, 0);
  const dinners = perDinner * cookingEvenings(setup).length;
  const lunches = setup.people.reduce((sum, p) => sum + p.lunches, 0);
  return { perDinner, dinners, lunches, total: dinners + lunches };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const VIA = ["start", "suggestion", "browse"];

const isDay = (value: unknown) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= 6;
const isCount = (value: unknown, max: number) => Number.isInteger(value) && (value as number) >= 0 && (value as number) <= max;

/** Checks the chosen dishes sent from the browser; returns null if anything is off. */
export function readDishes(input: unknown): PlannedDish[] | null {
  if (!Array.isArray(input) || input.length > 14) return null;
  const seen = new Set<string>();
  const dishes: PlannedDish[] = [];
  for (const d of input) {
    const dish = d as Record<string, unknown>;
    const day = dish?.day;
    if (typeof dish?.recipeId !== "string" || !UUID.test(dish.recipeId) || seen.has(dish.recipeId)) return null;
    if (day !== null && !isDay(day)) return null;
    if (typeof dish.addedAt !== "string" || Number.isNaN(Date.parse(dish.addedAt))) return null;
    if (!VIA.includes(String(dish.via))) return null;
    const clean: PlannedDish = { recipeId: dish.recipeId, day: day as number | null, addedAt: dish.addedAt, via: dish.via as PlannedDish["via"] };
    if (dish.lunches !== undefined) {
      if (!Array.isArray(dish.lunches) || dish.lunches.length > 6 || !dish.lunches.every((n) => isCount(n, 14))) return null;
      clean.lunches = dish.lunches as number[];
    }
    if (dish.freezer !== undefined) {
      if (!isCount(dish.freezer, MAX_FREEZER)) return null;
      clean.freezer = dish.freezer as number;
    }
    if (dish.alsoOn !== undefined) {
      if (dish.alsoOn !== null && !isDay(dish.alsoOn)) return null;
      clean.alsoOn = dish.alsoOn as number | null;
    }
    seen.add(dish.recipeId);
    dishes.push(clean);
  }
  return dishes;
}

/** Checks a setup sent from the browser; returns null if anything is off. */
export function readSetup(input: unknown): WeekSetup | null {
  if (!input || typeof input !== "object") return null;
  const value = input as Record<string, unknown>;
  const evenings = value.evenings;
  const people = value.people;
  const ingredients = value.ingredientsToUse;
  if (!Array.isArray(evenings) || evenings.length !== 7) return null;
  if (!Array.isArray(people) || people.length < 1 || people.length > 6) return null;
  if (!Array.isArray(ingredients) || ingredients.length > 30) return null;

  const cleanEvenings: Evening[] = [];
  for (const e of evenings) {
    const evening = e as Record<string, unknown>;
    if (typeof evening?.cooking !== "boolean" || !(String(evening.time) in TIME_SLOTS)) return null;
    cleanEvenings.push({ cooking: evening.cooking, time: evening.time as TimeSlot });
  }
  const cleanPeople: Person[] = [];
  for (const p of people) {
    const person = p as Record<string, unknown>;
    const name = typeof person?.name === "string" ? person.name.trim().slice(0, 40) : "";
    const portion = Number(person?.dinnerPortion);
    const lunches = Number(person?.lunches);
    if (!name || !PORTION_CHOICES.includes(portion)) return null;
    if (!Number.isInteger(lunches) || lunches < 0 || lunches > MAX_LUNCHES) return null;
    cleanPeople.push({ name, dinnerPortion: portion, lunches });
  }
  const cleanIngredients = ingredients
    .map((i) => (typeof i === "string" ? i.trim().slice(0, 60) : ""))
    .filter(Boolean);
  return { evenings: cleanEvenings, people: cleanPeople, ingredientsToUse: cleanIngredients };
}
