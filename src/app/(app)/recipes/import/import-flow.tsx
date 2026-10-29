"use client";

import { useState, useTransition } from "react";
import { RecipeForm } from "@/components/recipe-form";
import { readRecipeTextAction, type ImportResult } from "@/lib/import/actions";
import { createRecipeAction } from "@/lib/recipes/form-actions";

const inputClass =
  "mt-1 block w-full rounded-xl border border-line bg-paper px-3 py-2 text-base outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/30";

/** Paste a recipe, have it read, then check and save it in the normal recipe form. */
export function ImportFlow({ cuisines, prepNames, ready }: { cuisines: string[]; prepNames: string[]; ready: boolean }) {
  const [text, setText] = useState("");
  const [from, setFrom] = useState("");
  const [result, setResult] = useState<Required<Pick<ImportResult, "normalised" | "language">> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reading, startReading] = useTransition();

  function read(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startReading(async () => {
      const answer = await readRecipeTextAction(text, from);
      if (answer.normalised && answer.language) setResult({ normalised: answer.normalised, language: answer.language });
      else setError(answer.error ?? "Something went wrong. Please try again.");
    });
  }

  if (result) {
    const { normalised } = result;
    return (
      <div className="space-y-4">
        <section className="space-y-3 rounded-2xl border border-saffron/50 bg-saffron-light p-4 text-sm">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">Check before saving</h2>
            <button type="button" onClick={() => setResult(null)} className="shrink-0 text-terracotta underline">
              Start again
            </button>
          </div>
          {normalised.missing.length > 0 && (
            <div>
              <p className="font-medium">Please fill in below:</p>
              <ul className="ml-5 list-disc">
                {normalised.missing.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {normalised.check.length > 0 && (
            <div>
              <p className="font-medium">Please check:</p>
              <ul className="ml-5 list-disc">
                {normalised.check.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
          )}
          {normalised.seafood.length > 0 && (
            <p className="rounded-xl bg-danger-light px-3 py-2 text-danger">
              <strong>Seafood:</strong> {normalised.seafood.map((f) => f.text).join(", ")}. The household rule is no
              seafood, so this recipe would never be suggested.
            </p>
          )}
          {normalised.changes.length > 0 && (
            <details>
              <summary className="cursor-pointer font-medium">What the app changed ({normalised.changes.length})</summary>
              <ul className="mt-1 ml-5 list-disc">
                {normalised.changes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </details>
          )}
        </section>
        <RecipeForm
          initial={normalised.values}
          action={createRecipeAction}
          submitLabel="Save recipe"
          cancelHref="/recipes"
          cuisines={cuisines}
          prepNames={prepNames}
          suggestedMakeAhead={normalised.suggestedMakeAhead}
        />
      </div>
    );
  }

  return (
    <form onSubmit={read} className="space-y-4">
      <div className="space-y-2 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">
        <p>
          Paste a recipe in any language: text from a website, an Instagram caption, a YouTube description, or the
          text of a photo (iPhone Live Text or Google Lens). Claude reads it and writes it out in English with metric
          units, then you check it before saving. Each recipe costs about 1–3 öre.
        </p>
        <p>
          <strong className="text-ink">Not available yet:</strong> pasting a link to read a website directly. That
          comes next.
        </p>
      </div>
      {!ready && (
        <p role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm text-danger">
          Reading recipes needs an Anthropic API key, which isn&apos;t set up yet. Add{" "}
          <code>ANTHROPIC_API_KEY</code> in Vercel&apos;s environment variables.
        </p>
      )}
      <label className="block">
        <span className="font-medium">Recipe text</span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={12}
          required
          placeholder="Paste the ingredients and steps here"
          className={inputClass}
        />
      </label>
      <label className="block">
        <span className="font-medium">Where is it from?</span> <span className="text-sm text-muted">(optional)</span>
        <input
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          maxLength={80}
          placeholder="For example: Instagram, @someone"
          className={inputClass}
        />
      </label>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={reading || !text.trim()}
        className="rounded-xl bg-terracotta px-5 py-3 font-medium text-white hover:bg-terracotta-dark disabled:opacity-50"
      >
        {reading ? "Reading the recipe… (a few seconds)" : "Read recipe"}
      </button>
    </form>
  );
}
