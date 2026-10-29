// How far ahead a make-ahead task may be done. The app never makes up storage
// times: a limit comes either from published food-safety guidance, quoted with
// its source, or from the household itself. A task with neither is done on the
// evening of the dinner, which is always safe.
import { prepKey } from "./ingredients";

export type PrepLimit = {
  /** At most this many days before the dinner; 0 = on the day itself. */
  days: number;
  by: "guidance" | "household";
  /** For guidance: what it says, and where. */
  note?: string;
  sourceUrl?: string;
};

type GuidanceRule = { match: RegExp; days: number; note: string; sourceUrl: string };

/**
 * Published guidance per kind of task. Filled in only from the source itself
 * (Livsmedelsverket, the Swedish Food Agency), quoted with its address; never
 * from memory. Empty until the source can be read.
 */
export const GUIDANCE: GuidanceRule[] = [];

export const MAX_PREP_DAYS = 6;

/**
 * The limit for a task: the household's own choice, but never longer than the
 * guidance allows; the guidance alone; or none (done on the evening).
 */
export function limitFor(name: string, household: Map<string, number>): PrepLimit | null {
  const guidance = GUIDANCE.find((rule) => rule.match.test(name.toLowerCase()));
  const own = household.get(prepKey(name));
  if (own !== undefined && (!guidance || own <= guidance.days)) return { days: own, by: "household" };
  if (guidance) return { days: guidance.days, by: "guidance", note: guidance.note, sourceUrl: guidance.sourceUrl };
  return null;
}
