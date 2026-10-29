"use client";

import { useState, useTransition } from "react";
import { saveWeekSetupAction } from "@/lib/plan/actions";
import {
  DAY_NAMES,
  DAY_SHORT,
  MAX_LUNCHES,
  PORTION_CHOICES,
  TIME_SLOTS,
  cookingEvenings,
  portionsNeeded,
  type TimeSlot,
  type WeekSetup,
} from "@/lib/plan/types";
import { formatQuantity } from "@/lib/recipes/format";

const TIME_OPTION_LABEL: Record<TimeSlot, string> = {
  quick: "Quick · 25 min",
  normal: "Normal · 45 min",
  relaxed: "Relaxed · no limit",
};

const selectClass = "rounded-xl border border-line bg-cream px-2 py-2 text-base";

export function WeekSetupPanel({
  weekStart,
  savedSetup,
  startingSetup,
  onSaved,
}: {
  weekStart: string;
  savedSetup: WeekSetup | null;
  startingSetup: WeekSetup;
  onSaved: (setup: WeekSetup) => void;
}) {
  const [saved, setSaved] = useState(savedSetup);
  const [editing, setEditing] = useState(savedSetup === null);
  const [draft, setDraft] = useState(startingSetup);
  const [ingredientsText, setIngredientsText] = useState(startingSetup.ingredientsToUse.join(", "));
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  if (!editing && saved) {
    return (
      <section className="space-y-3 rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">This week&apos;s setup</h2>
          <button
            type="button"
            onClick={() => {
              setDraft(saved);
              setIngredientsText(saved.ingredientsToUse.join(", "));
              setEditing(true);
            }}
            className="rounded-full border border-line px-3 py-1 text-sm hover:border-terracotta/50"
          >
            Edit setup
          </button>
        </div>
        <SetupSummary setup={saved} />
      </section>
    );
  }

  function updateEvening(day: number, change: Partial<WeekSetup["evenings"][number]>) {
    setDraft((d) => ({ ...d, evenings: d.evenings.map((e, i) => (i === day ? { ...e, ...change } : e)) }));
  }
  function updatePerson(index: number, change: Partial<WeekSetup["people"][number]>) {
    setDraft((d) => ({ ...d, people: d.people.map((p, i) => (i === index ? { ...p, ...change } : p)) }));
  }

  function save() {
    const setup = {
      ...draft,
      ingredientsToUse: ingredientsText.split(",").map((s) => s.trim()).filter(Boolean),
    };
    setError(null);
    startSaving(async () => {
      const result = await saveWeekSetupAction(weekStart, setup);
      if (result.error || !result.setup) {
        setError(result.error ?? "Couldn't save the setup.");
        return;
      }
      setSaved(result.setup);
      setEditing(false);
      onSaved(result.setup);
    });
  }

  const cooking = cookingEvenings(draft).length;

  return (
    <section className="space-y-5 rounded-2xl border border-line bg-paper p-5 shadow-sm">
      <h2 className="font-display text-xl font-semibold">Set up the week</h2>

      <fieldset className="min-w-0">
        <legend className="text-sm font-medium">Which evenings are you cooking, and how much time is there?</legend>
        <ul className="mt-2 divide-y divide-line">
          {draft.evenings.map((evening, day) => (
            <li key={day} className="flex items-center justify-between gap-2 py-2">
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={evening.cooking}
                  onChange={(e) => updateEvening(day, { cooking: e.target.checked })}
                  className="h-5 w-5 accent-terracotta"
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
        <p className="text-sm text-muted">Dinner size per person, and lunch boxes from leftovers this week.</p>
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

      <label className="block">
        <span className="text-sm font-medium">Anything you&apos;d like to use up? (optional)</span>
        <span className="block text-sm text-muted">
          E.g. what&apos;s in the fridge, or something that looked good at the shop. Separate with commas.
        </span>
        <input
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          placeholder="e.g. spinach, feta, aubergine"
          className="mt-1 block w-full rounded-xl border border-line bg-cream px-3 py-2 text-base"
        />
      </label>

      <p className="text-sm text-muted">
        {cooking} {cooking === 1 ? "dinner" : "dinners"} to choose
        {cooking > 0 && <>: about {formatQuantity(portionsNeeded(draft).total)} portions including lunches.</>}
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving || cooking === 0}
          className="rounded-xl bg-terracotta px-5 py-3 font-medium text-white hover:bg-terracotta-dark disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save setup"}
        </button>
        {saved && (
          <button type="button" onClick={() => setEditing(false)} className="px-3 py-3 text-muted hover:text-ink">
            Cancel
          </button>
        )}
      </div>
    </section>
  );
}

function SetupSummary({ setup }: { setup: WeekSetup }) {
  const days = cookingEvenings(setup);
  const portions = portionsNeeded(setup);
  return (
    <div className="space-y-2 text-sm">
      <ul className="flex flex-wrap gap-2">
        {setup.evenings.map((evening, day) => (
          <li
            key={day}
            className={
              evening.cooking
                ? "rounded-full bg-sage-light px-3 py-1 text-sage"
                : "rounded-full border border-line px-3 py-1 text-muted line-through"
            }
          >
            {DAY_SHORT[day]}
            {evening.cooking && ` · ${TIME_SLOTS[evening.time].label}`}
          </li>
        ))}
      </ul>
      <p>
        {days.length} dinners.{" "}
        {setup.people
          .map((p) => `${p.name} ${formatQuantity(p.dinnerPortion)} ${p.dinnerPortion === 1 ? "portion" : "portions"}`)
          .join(", ")}
        .{" "}
        {portions.lunches > 0 &&
          `Lunches: ${setup.people
            .filter((p) => p.lunches > 0)
            .map((p) => `${p.name} ${p.lunches}`)
            .join(", ")}. `}
        About {formatQuantity(portions.total)} portions in total.
      </p>
      {setup.ingredientsToUse.length > 0 && <p>To use up: {setup.ingredientsToUse.join(", ")}.</p>}
    </div>
  );
}
