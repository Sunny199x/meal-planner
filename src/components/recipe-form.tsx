"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, type ReactNode } from "react";
import { readIngredientLines, readMakeAhead, type FieldErrors, type RecipeFormValues } from "@/lib/recipes/form";
import type { RecipeFormState } from "@/lib/recipes/form-actions";
import { formatAmount, formatMetric } from "@/lib/recipes/format";
import { parseIngredientLine } from "@/lib/recipes/parse-ingredient-line";
import { checkRecipeForSeafood } from "@/lib/recipes/seafood";
import type { MakeAheadTask } from "@/lib/recipes/types";

type Props = {
  initial: RecipeFormValues;
  action: (state: RecipeFormState, data: FormData) => Promise<RecipeFormState>;
  submitLabel: string;
  cancelHref: string;
  cuisines: string[];
  prepNames: string[];
  /** Make-ahead tasks offered for this recipe, e.g. by an import (one tap adds the whole line). */
  suggestedMakeAhead?: MakeAheadTask[];
  /** Runs after a successful save, before the saved recipe opens (e.g. to attach an imported photo). */
  afterSave?: (savedPath: string) => Promise<void>;
};

const inputClass =
  "mt-1 block w-full rounded-xl border border-line bg-soft px-3 py-2 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30";

export function RecipeForm({
  initial,
  action,
  submitLabel,
  cancelHref,
  cuisines,
  prepNames,
  suggestedMakeAhead = [],
  afterSave,
}: Props) {
  const [values, setValues] = useState(initial);
  const [state, formAction, saving] = useActionState(action, {});
  const leaving = Boolean(state.openNext);

  // After a successful save, open the recipe with a normal full page load so it
  // shows the saved version straight away (see form-actions.ts). This also
  // leaves the form empty for the next recipe.
  useEffect(() => {
    const next = state.openNext;
    if (!next) return;
    if (afterSave) afterSave(next).finally(() => window.location.assign(next));
    else window.location.assign(next);
  }, [state.openNext, afterSave]);

  // Errors come from the last save attempt; each one disappears as soon as its
  // field is changed, so a fixed field doesn't keep showing an old message.
  const [errors, setErrors] = useState<FieldErrors>({});
  const [errorsFrom, setErrorsFrom] = useState(state);
  if (errorsFrom !== state) {
    setErrorsFrom(state);
    setErrors(state.fieldErrors ?? {});
  }

  const set = <K extends keyof RecipeFormValues>(key: K, value: RecipeFormValues[K]) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const rest = { ...current };
      delete rest[key];
      return rest;
    });
  };

  const ingredients = useMemo(
    () => readIngredientLines(values.ingredients).map((i) => ({ ...parseIngredientLine(i.line), group: i.group })),
    [values.ingredients],
  );
  const seafood = useMemo(
    () => checkRecipeForSeafood({ title: values.title, ingredients }),
    [values.title, ingredients],
  );
  const makeAhead = useMemo(() => readMakeAhead(values.makeAhead), [values.makeAhead]);

  const notYetAdded = suggestedMakeAhead.filter(
    (task) => !makeAhead.tasks.some((t) => t.name.toLowerCase() === task.name.toLowerCase()),
  );
  function addTaskLine(line: string) {
    const current = values.makeAhead.trimEnd();
    set("makeAhead", `${current ? current + "\n" : ""}${line}`);
  }
  function addPrepName(name: string) {
    addTaskLine(`${name}: `);
  }

  const text = (key: keyof RecipeFormValues) => ({
    name: key,
    value: values[key] as string,
    onChange: (e: { target: { value: string } }) => set(key, e.target.value as never),
    "aria-invalid": errors[key] ? true : undefined,
    "aria-describedby": errors[key] ? `${key}-error` : undefined,
  });

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <Section title="Basics">
        <Field label="Name" error={errors.title} id="title">
          <input {...text("title")} className={inputClass} autoComplete="off" />
        </Field>
        <Field
          label="Where it's from"
          hint='E.g. "HelloFresh card", "Own recipe", a cookbook or website name.'
          error={errors.source}
          id="source"
        >
          <input {...text("source")} className={inputClass} />
        </Field>
        <Field
          label="Link to the original (optional)"
          hint="A website, Instagram post or YouTube video."
          error={errors.sourceUrl}
          id="sourceUrl"
        >
          <input {...text("sourceUrl")} type="url" inputMode="url" placeholder="https://" className={inputClass} />
        </Field>
      </Section>

      <Section title="Time and servings">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Field label="Servings" error={errors.servings} id="servings">
            <input {...text("servings")} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="Total minutes" error={errors.timeTotalMin} id="timeTotalMin">
            <input {...text("timeTotalMin")} inputMode="numeric" className={inputClass} />
          </Field>
          <Field label="Hands-on minutes" error={errors.timeActiveMin} id="timeActiveMin">
            <input {...text("timeActiveMin")} inputMode="numeric" className={inputClass} />
          </Field>
        </div>
        <p className="text-sm text-muted">
          Total is start to plate, including oven and simmering. Hands-on is the time you&apos;re actually busy.
        </p>
      </Section>

      <Section title="About the dish">
        <Field label="Cuisine" error={errors.cuisine} id="cuisine">
          <input {...text("cuisine")} list="cuisine-options" className={inputClass} />
          <datalist id="cuisine-options">
            {cuisines.map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
        </Field>
        <fieldset aria-describedby={errors.diet ? "diet-error" : undefined}>
          <legend className="text-sm font-medium">Diet</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(["vegetarian", "vegan", "meat"] as const).map((diet) => (
              <label
                key={diet}
                className={`cursor-pointer rounded-full border px-4 py-2 text-sm capitalize ${
                  values.diet === diet ? "border-accent bg-accent text-white" : "border-line"
                }`}
              >
                <input
                  type="radio"
                  name="diet"
                  value={diet}
                  checked={values.diet === diet}
                  onChange={() => set("diet", diet)}
                  className="sr-only"
                />
                {diet}
              </label>
            ))}
          </div>
          {errors.diet && <ErrorText id="diet-error">{errors.diet}</ErrorText>}
        </fieldset>
        <Field label="Main protein (optional)" hint="E.g. chicken, lentils, paneer, eggs." id="mainProtein">
          <input {...text("mainProtein")} className={inputClass} />
        </Field>
        <div className="space-y-2">
          <Checkbox
            name="freezerFriendly"
            checked={values.freezerFriendly}
            onChange={(v) => set("freezerFriendly", v)}
            label="Freezer-friendly"
            hint="Only if you've actually frozen it and it was fine."
          />
          <Checkbox
            name="goodAsLeftovers"
            checked={values.goodAsLeftovers}
            onChange={(v) => set("goodAsLeftovers", v)}
            label="Good as leftovers"
            hint="Reheats well as a next-day lunch."
          />
        </div>
        <Field label="Tags (optional)" hint="Separated by commas, e.g. one-pot, comfort." id="tags">
          <input {...text("tags")} className={inputClass} />
        </Field>
      </Section>

      <Section title="Ingredients">
        <Field
          label="One ingredient per line"
          hint='E.g. "250 g red lentils, rinsed". Anything after a comma is a note. Add "(optional)" for optional ones, and "### For the sauce" to start a group.'
          error={errors.ingredients}
          id="ingredients"
        >
          <textarea {...text("ingredients")} rows={8} className={`${inputClass} font-mono text-sm`} />
        </Field>
        {seafood.length > 0 && (
          <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
            {seafood.map((f) => `${f.text}: ${f.level === "contains" ? "seafood" : "may contain fish"}`).join("; ")}.
            The household rule is no seafood. You can still save it, but it will be marked and never suggested.
          </p>
        )}
        {ingredients.length > 0 && (
          <div>
            <p className="text-sm font-medium">How the app reads them</p>
            <ul className="mt-1 divide-y divide-line rounded-xl border border-line bg-soft text-sm">
              {ingredients.map((item, i) => (
                <li key={i} className="px-3 py-2">
                  {item.group && (i === 0 || ingredients[i - 1].group !== item.group) && (
                    <span className="mb-1 block text-xs font-medium tracking-wide text-muted uppercase">
                      {item.group}
                    </span>
                  )}
                  <span className="font-semibold">{formatAmount(item) || "no amount"}</span>
                  {" · "}
                  <span>{item.name || "?"}</span>
                  {item.metric && !isMeasuredUnit(item.unit) && (
                    <span className="text-muted"> · {formatMetric(item.metric)} in total</span>
                  )}
                  {item.note && <span className="text-muted"> · note: {item.note}</span>}
                  {item.optional && <span className="text-muted"> · optional</span>}
                  {item.problems.map((problem) => (
                    <span key={problem} className="mt-0.5 block text-danger">
                      {problem}
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      <Section title="Instructions">
        <Field label="One step per line" hint="Numbers are optional. Oven temperatures in °C." id="instructions">
          <textarea {...text("instructions")} rows={8} className={inputClass} />
        </Field>
      </Section>

      <Section title="Make ahead (optional)">
        <Field
          label='Sunday prep tasks, one per line, as "Name: what to do"'
          hint="Recipes that use exactly the same name can share one batch, so reuse names where you can."
          id="makeAhead"
        >
          <textarea {...text("makeAhead")} rows={4} className={inputClass} />
        </Field>
        {notYetAdded.length > 0 && (
          <div className="rounded-xl bg-good-light px-3 py-2">
            <p className="text-sm">
              Suggested for this recipe: your other recipes already share these, so the same name lets them share a
              batch (tap to add):
            </p>
            <div className="mt-1 flex flex-wrap gap-2">
              {notYetAdded.map((task) => (
                <button
                  key={task.name}
                  type="button"
                  onClick={() => addTaskLine(`${task.name}: ${task.description}`)}
                  className="rounded-full border border-good/40 bg-paper px-3 py-1 text-sm hover:border-good"
                >
                  + {task.name}
                </button>
              ))}
            </div>
          </div>
        )}
        {prepNames.length > 0 && (
          <div>
            <p className="text-sm text-muted">Names already used in other recipes (tap to add):</p>
            <div className="mt-1 flex flex-wrap gap-2">
              {prepNames.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => addPrepName(name)}
                  className="rounded-full border border-line px-3 py-1 text-sm hover:border-good"
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>
        )}
        {makeAhead.withoutName.length > 0 && (
          <p className="text-sm text-danger">
            Missing a name: {makeAhead.withoutName.join("; ")}. Write it as &quot;Name: what to do&quot;.
          </p>
        )}
      </Section>

      <Section title="Notes (optional)">
        <Field label="Anything else" hint="What you'd change next time, what to serve it with, who liked it." id="notes">
          <textarea {...text("notes")} rows={3} className={inputClass} />
        </Field>
      </Section>

      <div className="space-y-3">
        {Object.keys(errors).length > 0 && (
          <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
            Some fields need fixing. They are marked in red above.
          </p>
        )}
        {state.error && (
          <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving || leaving}
            className="rounded-full bg-accent px-5 py-3 font-medium text-white hover:bg-accent-dark disabled:opacity-60"
          >
            {saving ? "Saving…" : leaving ? "Saved, opening…" : submitLabel}
          </button>
          <Link href={cancelHref} className="px-3 py-3 text-muted hover:text-ink">
            Cancel
          </Link>
        </div>
      </div>
    </form>
  );
}

/** Weights, volumes and spoons already say the amount; "2 cans" gets a total added. */
function isMeasuredUnit(unit: string | null): boolean {
  return unit !== null && ["g", "kg", "ml", "cl", "dl", "l", "tsp", "tbsp"].includes(unit);
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 rounded-2xl border border-line bg-paper p-5">
      <h2 className="font-display text-xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

function Field({
  label,
  hint,
  error,
  id,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  id: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="block">
        <span className="text-sm font-medium">{label}</span>
        {hint && <span className="block text-sm text-muted">{hint}</span>}
        {children}
      </label>
      {error && <ErrorText id={`${id}-error`}>{error}</ErrorText>}
    </div>
  );
}

function ErrorText({ id, children }: { id: string; children: ReactNode }) {
  return (
    <span id={id} className="mt-1 block text-sm text-danger">
      {children}
    </span>
  );
}

function Checkbox({
  name,
  checked,
  onChange,
  label,
  hint,
}: {
  name: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-5 w-5 accent-ink"
      />
      <span>
        <span className="block font-medium">{label}</span>
        <span className="block text-sm text-muted">{hint}</span>
      </span>
    </label>
  );
}
