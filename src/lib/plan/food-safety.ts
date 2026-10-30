// How far ahead a make-ahead task may be done. The app never makes up storage
// times: a limit comes either from published food-safety guidance, quoted with
// its source, or from the household itself. A task with neither is done on the
// evening of the dinner, which is always safe.
import { prepKey } from "./ingredients";

export type PrepLimit = {
  /** At most this many days before the dinner; 0 = on the day itself. */
  days: number;
  by: "guidance" | "household";
  /** For guidance: what it says in a few words ("eat cooked leftovers within two days"), who says it, and where. */
  note?: string;
  source?: string;
  sourceUrl?: string;
};

type GuidanceRule = {
  /** Whether the rule is about this task, from its name. */
  covers: (name: string) => boolean;
  days: number;
  note: string;
  /** The guidance's own words. */
  quote: string;
  /** What the limit means in practice, when that isn't obvious. */
  tip?: string;
  source: string;
  sourceUrl: string;
};

// A task is cooked food only when its name says so. Raw prep (chopping, pickling,
// marinating, mixing) isn't covered by the guidance below and stays on the day.
const COOKED =
  /\b(cook|cooked|boil|boiled|steam|steamed|roast|roasted|bake|baked|simmer|simmered|braise|braised|stew|stewed|fry|fried|grill|grilled|sear|seared)\b/;

const FSA = "UK Food Standards Agency";

/**
 * Published guidance per kind of task, read from the source itself and quoted
 * with its address; never from memory. The first rule that covers a task wins.
 *
 * Livsmedelsverket (the Swedish Food Agency) gives no limit per food: see
 * SWEDISH_ADVICE. The UK Food Standards Agency does, so the day limits are its.
 */
export const GUIDANCE: GuidanceRule[] = [
  {
    covers: (name) => COOKED.test(name) && /\brice\b/.test(name),
    days: 1,
    note: "keep cooked rice in the fridge no more than one day",
    tip: "A day ahead means the day before the dinner, so cook the rice late on the prep day to stay within 24 hours.",
    quote:
      "Put the rice in the fridge and consume within 24 hours. … Keep rice in the fridge for no more than one day until reheating.",
    source: FSA,
    // "Home food fact checker", updated 21 August 2026.
    sourceUrl: "https://www.gov.uk/government/publications/home-food-fact-checker/home-food-fact-checker",
  },
  {
    covers: (name) => COOKED.test(name),
    days: 2,
    note: "eat cooked leftovers within two days",
    quote: "eat leftovers within two days or freeze if you think this won’t be possible",
    source: FSA,
    // "How to chill, freeze and defrost food safely".
    sourceUrl:
      "https://www.gov.uk/government/publications/how-to-chill-freeze-and-defrost-food-safely/how-to-chill-freeze-and-defrost-food-safely",
  },
];

/** What the Swedish Food Agency says instead, shown next to the limits. Read 29 October 2026. */
export const SWEDISH_ADVICE = {
  source: "Livsmedelsverket",
  quote: "I kylskåp håller tillagad mat ofta flera dagar, ibland upp till ungefär en vecka.",
  translation: "In the fridge, cooked food often keeps several days, sometimes up to about a week.",
  /** The rest of the same page, in short. */
  more: "It adds that the fridge's temperature mainly decides how long (4 °C is suitable), and that food should cool quickly after cooking and be kept covered.",
  sourceUrl: "https://www.livsmedelsverket.se/livsmedel-och-innehall/tillagning-forvaring-hallbarhet/forvaring-av-kyld-mat/",
};

export const MAX_PREP_DAYS = 6;

/** The guidance that covers a task, if any. */
export function guidanceFor(name: string): PrepLimit | null {
  const rule = GUIDANCE.find((r) => r.covers(name.toLowerCase()));
  return rule ? { days: rule.days, by: "guidance", note: rule.note, source: rule.source, sourceUrl: rule.sourceUrl } : null;
}

/**
 * The limit for a task: the household's own choice, but never longer than the
 * guidance allows; the guidance alone; or none (done on the evening).
 */
export function limitFor(name: string, household: Map<string, number>): PrepLimit | null {
  const guidance = guidanceFor(name);
  const own = household.get(prepKey(name));
  if (own !== undefined && (!guidance || own <= guidance.days)) return { days: own, by: "household" };
  return guidance;
}
