"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DAY_NAMES,
  DAY_SHORT,
  MAX_LUNCHES,
  TIME_SLOTS,
  cookingEvenings,
  portionsNeeded,
  prepDaysOf,
  type TimeSlot,
  type WeekSetup,
} from "@/lib/plan/types";
import { formatQuantity } from "@/lib/recipes/format";

/** The Saturday before the week first, then Sunday to Friday. */
const PREP_DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

/**
 * This week's nights, from the usual week: one tap per night to change it.
 * Lunch boxes and ingredients to use up sit under "More". Every change is
 * saved straight away.
 */
export function WeekNights({
  setup,
  saved,
  error,
  onChange,
}: {
  setup: WeekSetup;
  /** False while the week only shows the usual week and nothing is saved yet. */
  saved: boolean;
  error: string | null;
  onChange: (setup: WeekSetup) => void;
}) {
  const [more, setMore] = useState(false);
  const [ingredientsText, setIngredientsText] = useState(setup.ingredientsToUse.join(", "));
  const cooking = cookingEvenings(setup).length;
  const prepDays = [...prepDaysOf(setup)].sort((a, b) => PREP_DAY_ORDER.indexOf(a) - PREP_DAY_ORDER.indexOf(b));
  const ingredients = ingredientsText.split(",").map((s) => s.trim()).filter(Boolean);
  const ingredientsChanged = ingredients.join(",") !== setup.ingredientsToUse.join(",");

  function setNight(day: number, value: string) {
    onChange({
      ...setup,
      evenings: setup.evenings.map((e, i) =>
        i !== day ? e : value === "off" ? { ...e, cooking: false } : { cooking: true, time: value as TimeSlot },
      ),
    });
  }
  function setLunches(index: number, lunches: number) {
    onChange({ ...setup, people: setup.people.map((p, i) => (i === index ? { ...p, lunches } : p)) });
  }

  return (
    <section className="space-y-3 rounded-2xl border border-line bg-paper p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-display text-xl font-extrabold tracking-tight">This week</h2>
        <span className="text-sm text-muted">{saved ? "Saved" : "From your usual week"}</span>
      </div>
      <p className="text-sm text-muted">Tap a night to change it for this week only.</p>
      <ul className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {setup.evenings.map((evening, day) => (
          <li key={day}>
            <label
              className={`flex flex-col gap-1 rounded-xl border px-2 py-2 ${
                evening.cooking ? "border-good/40 bg-good-light" : "border-line"
              }`}
            >
              <span className={`text-xs font-bold tracking-wide uppercase ${evening.cooking ? "text-good" : "text-muted"}`}>
                {DAY_SHORT[day]}
              </span>
              <select
                aria-label={`${DAY_NAMES[day]}: cooking time`}
                value={evening.cooking ? evening.time : "off"}
                onChange={(e) => setNight(day, e.target.value)}
                className={`w-full cursor-pointer appearance-none bg-transparent text-sm ${
                  evening.cooking ? "font-medium" : "text-muted"
                }`}
              >
                <option value="off">Off</option>
                {(Object.keys(TIME_SLOTS) as TimeSlot[]).map((slot) => (
                  <option key={slot} value={slot}>
                    {TIME_SLOTS[slot].label}
                  </option>
                ))}
              </select>
            </label>
          </li>
        ))}
      </ul>
      <p className="text-sm text-muted">
        {cooking} {cooking === 1 ? "dinner" : "dinners"}
        {cooking > 0 && <>, about {formatQuantity(portionsNeeded(setup).total)} portions with lunches</>}. Prep:{" "}
        {prepDays.length > 0 ? prepDays.map((d) => DAY_NAMES[d]).join(", ") : "none"}. Quick is up to 25 min, Normal
        up to 45.
      </p>
      <button
        type="button"
        onClick={() => setMore(!more)}
        aria-expanded={more}
        className="block text-left text-sm text-accent underline"
      >
        {more ? "Less" : "More for this week: lunch boxes, ingredients to use up"}
      </button>
      {more && (
        <div className="space-y-4 border-t border-line pt-3">
          <fieldset className="min-w-0">
            <legend className="text-sm font-medium">Lunch boxes this week</legend>
            <div className="mt-1 flex flex-wrap gap-x-5 gap-y-2">
              {setup.people.map((person, index) => (
                <label key={person.name} className="flex items-center gap-2 text-sm">
                  {person.name}
                  <select
                    value={person.lunches}
                    onChange={(e) => setLunches(index, Number(e.target.value))}
                    className="rounded-xl border border-line bg-soft px-2 py-1.5 text-base"
                  >
                    {Array.from({ length: MAX_LUNCHES + 1 }, (_, n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>
          <div>
            <label className="block">
              <span className="text-sm font-medium">Anything you&apos;d like to use up?</span>
              <span className="block text-sm text-muted">Separate with commas. Suggestions that use them come first.</span>
              <input
                value={ingredientsText}
                onChange={(e) => setIngredientsText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && ingredientsChanged) onChange({ ...setup, ingredientsToUse: ingredients });
                }}
                placeholder="e.g. spinach, feta, aubergine"
                className="mt-1 block w-full rounded-xl border border-line bg-soft px-3 py-2 text-base"
              />
            </label>
            {ingredientsChanged && (
              <button
                type="button"
                onClick={() => onChange({ ...setup, ingredientsToUse: ingredients })}
                className="mt-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-dark"
              >
                Use these
              </button>
            )}
          </div>
          <p className="text-sm text-muted">
            Dinner portions and prep days are set in{" "}
            <Link href="/settings#usual-week" className="text-accent underline">
              Settings → Your usual week
            </Link>
            .
          </p>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          Not saved: {error}
        </p>
      )}
    </section>
  );
}
