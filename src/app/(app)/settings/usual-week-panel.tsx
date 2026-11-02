"use client";

import { useState, useTransition } from "react";
import { saveUsualWeekAction } from "@/lib/plan/actions";
import {
  DAY_NAMES,
  DAY_SHORT,
  MAX_LUNCHES,
  PORTION_CHOICES,
  TIME_SLOTS,
  cookingEvenings,
  portionsNeeded,
  prepDaysOf,
  type TimeSlot,
  type WeekSetup,
} from "@/lib/plan/types";
import { formatQuantity } from "@/lib/recipes/format";

export const TIME_OPTION_LABEL: Record<TimeSlot, string> = {
  quick: "Quick · 25 min",
  normal: "Normal · 45 min",
  relaxed: "Relaxed · no limit",
};

/** The Saturday before the week first, then Sunday to Friday. */
const PREP_DAY_ORDER = [6, 0, 1, 2, 3, 4, 5];

const selectClass = "rounded-xl border border-line bg-soft px-2 py-2 text-base";

/** Settings → Your usual week: what each new week starts from. */
export function UsualWeekPanel({ usualWeek }: { usualWeek: WeekSetup }) {
  const [draft, setDraft] = useState(usualWeek);
  const [saved, setSaved] = useState(usualWeek);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [saving, startSaving] = useTransition();
  const changed = JSON.stringify(draft) !== JSON.stringify(saved);

  function update(next: (d: WeekSetup) => WeekSetup) {
    setMessage(null);
    setDraft(next);
  }
  function updateEvening(day: number, change: Partial<WeekSetup["evenings"][number]>) {
    update((d) => ({ ...d, evenings: d.evenings.map((e, i) => (i === day ? { ...e, ...change } : e)) }));
  }
  function updatePerson(index: number, change: Partial<WeekSetup["people"][number]>) {
    update((d) => ({ ...d, people: d.people.map((p, i) => (i === index ? { ...p, ...change } : p)) }));
  }
  function togglePrepDay(day: number) {
    update((d) => {
      const days = prepDaysOf(d);
      return { ...d, prepDays: days.includes(day) ? days.filter((x) => x !== day) : [...days, day].sort((a, b) => a - b) };
    });
  }
  function save() {
    startSaving(async () => {
      const result = await saveUsualWeekAction(draft);
      if (result.setup) {
        setSaved(result.setup);
        setDraft(result.setup);
        setMessage({ text: "Saved. New weeks start from this; weeks already planned keep their own." });
      } else {
        setMessage({ text: result.error ?? "Not saved.", error: true });
      }
    });
  }

  const cooking = cookingEvenings(draft).length;

  return (
    <div className="space-y-5">
      <fieldset className="min-w-0">
        <legend className="text-sm font-medium">Which evenings do you usually cook, and how much time is there?</legend>
        <ul className="mt-2 divide-y divide-line">
          {draft.evenings.map((evening, day) => (
            <li key={day} className="flex items-center justify-between gap-2 py-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={evening.cooking}
                  onChange={(e) => updateEvening(day, { cooking: e.target.checked })}
                  className="h-5 w-5 accent-ink"
                />
                <span className={evening.cooking ? "font-medium" : "text-muted"}>{DAY_NAMES[day]}</span>
              </label>
              {evening.cooking ? (
                <select
                  aria-label={`Time on ${DAY_NAMES[day]}`}
                  value={evening.time}
                  onChange={(e) => updateEvening(day, { time: e.target.value as TimeSlot })}
                  className={selectClass}
                >
                  {(Object.keys(TIME_SLOTS) as TimeSlot[]).map((slot) => (
                    <option key={slot} value={slot}>
                      {TIME_OPTION_LABEL[slot]}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-muted">Not cooking</span>
              )}
            </li>
          ))}
        </ul>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="text-sm font-medium">Portions</legend>
        <p className="text-sm text-muted">Dinner size per person, and lunch boxes from leftovers in a usual week.</p>
        <div className="mt-2 space-y-3">
          {draft.people.map((person, index) => (
            <div key={person.name} className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <span className="w-full font-medium sm:w-20">{person.name}</span>
              <label className="flex items-center gap-2 text-sm">
                Dinner
                <select
                  value={person.dinnerPortion}
                  onChange={(e) => updatePerson(index, { dinnerPortion: Number(e.target.value) })}
                  className={selectClass}
                >
                  {PORTION_CHOICES.map((p) => (
                    <option key={p} value={p}>
                      {formatQuantity(p)} {p === 1 ? "portion" : "portions"}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                Lunches
                <select
                  value={person.lunches}
                  onChange={(e) => updatePerson(index, { lunches: Number(e.target.value) })}
                  className={selectClass}
                >
                  {Array.from({ length: MAX_LUNCHES + 1 }, (_, n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          ))}
        </div>
      </fieldset>

      <fieldset className="min-w-0">
        <legend className="text-sm font-medium">Prep days</legend>
        <p className="text-sm text-muted">
          Days with time for bigger prep. Saturday means the Saturday before the week. Each task is done on the latest
          prep day its &ldquo;how far ahead&rdquo; limit allows (see Prep limits below).
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {PREP_DAY_ORDER.map((day) => {
            const on = prepDaysOf(draft).includes(day);
            return (
              <label
                key={day}
                className={`flex cursor-pointer items-center gap-2 rounded-full border px-3 py-1 text-sm ${
                  on ? "border-good bg-good-light text-good" : "border-line"
                }`}
              >
                <input type="checkbox" checked={on} onChange={() => togglePrepDay(day)} className="h-4 w-4 accent-ink" />
                {DAY_SHORT[day]}
              </label>
            );
          })}
        </div>
      </fieldset>

      <p className="text-sm text-muted">
        {cooking} {cooking === 1 ? "dinner" : "dinners"} a week
        {cooking > 0 && <>: about {formatQuantity(portionsNeeded(draft).total)} portions including lunches.</>}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || !changed || cooking === 0}
          className="rounded-full bg-accent px-5 py-3 font-medium text-white hover:bg-accent-dark disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save usual week"}
        </button>
        {changed && (
          <button type="button" onClick={() => setDraft(saved)} className="px-3 py-3 text-muted underline hover:text-ink">
            Undo changes
          </button>
        )}
      </div>
      {message && (
        <p role={message.error ? "alert" : "status"} className={`text-sm ${message.error ? "text-danger" : "text-good"}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
