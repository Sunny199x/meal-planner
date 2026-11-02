"use client";

import { useState, useTransition } from "react";
import { RecipeTile } from "@/components/ui";
import { forgetLikedCombinationAction, saveLikedCombinationAction } from "@/lib/plan/actions";
import { formatWeek } from "@/lib/plan/dates";
import { LIKED_MAX, LIKED_MIN, sameRecipes, type LikedCombination } from "@/lib/plan/liked";
import { shortTitle, type PlanRecipe } from "@/lib/plan/suggest";
import type { PlannedDish } from "@/lib/plan/types";

const SHOWN_AT_ONCE = 3;

/** Combinations the household liked, each with "Add these" and "Forget". */
export function LikedList({
  combinations,
  byId,
  chosen,
  onAdd,
  onChanged,
}: {
  /** Only usable ones: at least two recipes that still exist. */
  combinations: LikedCombination[];
  byId: Map<string, PlanRecipe>;
  chosen: PlannedDish[];
  onAdd: (recipeIds: string[]) => void;
  onChanged: (liked: LikedCombination[]) => void;
}) {
  const [shown, setShown] = useState(SHOWN_AT_ONCE);
  const [forgetting, setForgetting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, startForgetting] = useTransition();
  const inWeek = new Set(chosen.map((d) => d.recipeId));

  function forget(id: string) {
    startForgetting(async () => {
      const result = await forgetLikedCombinationAction(id);
      setError(result.error ?? null);
      if (result.liked) onChanged(result.liked);
      setForgetting(null);
    });
  }

  return (
    <div className="space-y-2">
      <ul className="space-y-2">
        {combinations.slice(0, shown).map((combination) => {
          const recipes = combination.recipeIds.map((id) => byId.get(id)!);
          const missing = recipes.filter((r) => !inWeek.has(r.id));
          return (
            <li key={combination.id} className="rounded-xl border border-line bg-paper p-3">
              <div className="flex items-center gap-3">
                <div className="flex shrink-0 -space-x-3">
                  {recipes.map((r) => (
                    <div key={r.id} className="rounded-xl ring-2 ring-paper">
                      <RecipeTile title={r.title} cuisine={r.cuisine} photo={r.photo} size="sm" />
                    </div>
                  ))}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="leading-snug">{recipes.map((r) => shortTitle(r.title)).join(" + ")}</p>
                  {combination.weekStart && (
                    <p className="text-sm text-muted">Liked in the week of {formatWeek(combination.weekStart)}</p>
                  )}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => onAdd(missing.map((r) => r.id))}
                  disabled={missing.length === 0}
                  className="rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-40"
                >
                  {missing.length === 0
                    ? "All in this week"
                    : missing.length === recipes.length
                      ? "Add these"
                      : `Add the other ${missing.length === 1 ? "one" : missing.length}`}
                </button>
                {forgetting === combination.id ? (
                  <>
                    <span className="text-sm">Forget this combination?</span>
                    <button
                      type="button"
                      onClick={() => forget(combination.id)}
                      disabled={busy}
                      className="rounded-full border border-danger/40 px-3 py-1.5 text-sm text-danger hover:bg-danger-light"
                    >
                      Forget
                    </button>
                    <button type="button" onClick={() => setForgetting(null)} className="px-2 py-1.5 text-sm text-muted underline">
                      Keep
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setForgetting(combination.id)}
                    className="px-2 py-1.5 text-sm text-muted underline hover:text-ink"
                  >
                    Forget
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {combinations.length > shown && (
        <button type="button" onClick={() => setShown(shown + SHOWN_AT_ONCE)} className="text-sm text-accent underline">
          Show {Math.min(SHOWN_AT_ONCE, combinations.length - shown)} more
        </button>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

/** Pick two or three of the week's dishes that went well together, and save them. */
export function LikeDishes({
  weekStart,
  dishes,
  byId,
  liked,
  onSaved,
}: {
  weekStart: string;
  dishes: PlannedDish[];
  byId: Map<string, PlanRecipe>;
  liked: LikedCombination[];
  onSaved: (liked: LikedCombination[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [saving, startSaving] = useTransition();
  const alreadySaved = picked.length >= LIKED_MIN && liked.some((c) => sameRecipes(c.recipeIds, picked));

  function toggle(id: string) {
    setMessage(null);
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < LIKED_MAX ? [...p, id] : p));
  }
  function save() {
    startSaving(async () => {
      const result = await saveLikedCombinationAction(weekStart, picked);
      if (result.liked) {
        onSaved(result.liked);
        setPicked([]);
        setOpen(false);
        setMessage({
          text: "Saved. It's offered when you start a week, and suggestions that go with one of these dishes say “You liked this with …”.",
        });
      } else {
        setMessage({ text: result.error ?? "Not saved.", error: true });
      }
    });
  }

  if (!open) {
    return (
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setMessage(null);
          }}
          className="text-sm text-accent underline"
        >
          ♥ Save dishes that went well together
        </button>
        {message && (
          <p role={message.error ? "alert" : "status"} className={`text-sm ${message.error ? "text-danger" : "text-good"}`}>
            {message.text}
          </p>
        )}
      </div>
    );
  }

  return (
    <fieldset className="space-y-2 rounded-xl border border-line p-3">
      <legend className="px-1 text-sm font-medium">Which {LIKED_MIN} or {LIKED_MAX} dishes went well together?</legend>
      <ul className="space-y-1">
        {dishes.map((dish) => {
          const recipe = byId.get(dish.recipeId)!;
          const checked = picked.includes(recipe.id);
          return (
            <li key={recipe.id}>
              <label className="flex items-center gap-3 py-1">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={!checked && picked.length >= LIKED_MAX}
                  onChange={() => toggle(recipe.id)}
                  className="h-5 w-5 shrink-0 accent-black"
                />
                <span className={!checked && picked.length >= LIKED_MAX ? "text-muted" : ""}>{recipe.title}</span>
              </label>
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={picked.length < LIKED_MIN || alreadySaved || saving}
          className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-40"
        >
          {saving ? "Saving…" : "Save as liked together"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setPicked([]);
          }}
          className="px-2 py-2 text-sm text-muted underline"
        >
          Cancel
        </button>
        {alreadySaved && <span className="text-sm text-muted">Already saved.</span>}
      </div>
      {message?.error && (
        <p role="alert" className="text-sm text-danger">
          {message.text}
        </p>
      )}
    </fieldset>
  );
}
