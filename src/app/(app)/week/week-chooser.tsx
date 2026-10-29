"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { saveWeekDishesAction } from "@/lib/plan/actions";
import { addDish, minutesToChoose, moveDish, pickEvening, removeDish, timeClash } from "@/lib/plan/choose";
import { openEvenings, rankCandidates, shortlist, type PlanRecipe, type Suggestion } from "@/lib/plan/suggest";
import { DAY_NAMES, DAY_SHORT, TIME_SLOTS, type PlannedDish, type WeekSetup } from "@/lib/plan/types";
import { normalise } from "@/lib/recipes/filters";

export function WeekChooser({
  weekStart,
  setup,
  initialDishes,
  choosingStartedAt,
  recipes,
}: {
  weekStart: string;
  setup: WeekSetup;
  initialDishes: PlannedDish[];
  choosingStartedAt: string | null;
  recipes: PlanRecipe[];
}) {
  const [dishes, setDishes] = useState(initialDishes);
  const [history, setHistory] = useState<PlannedDish[][]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [browsing, setBrowsing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(choosingStartedAt);
  const [, startSaving] = useTransition();

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const known = dishes.filter((d) => byId.has(d.recipeId));
  const plan = { setup, dishes: known, dismissed };
  const ranked = useMemo(
    () => rankCandidates(recipes, { setup, dishes: dishes.filter((d) => byId.has(d.recipeId)), dismissed }, weekStart),
    [recipes, byId, setup, dishes, dismissed, weekStart],
  );
  const open = openEvenings(plan);
  const shown = shortlist(ranked, 3, page);
  const hasMore = shortlist(ranked, 3, page + 1).length > 0;
  const cookingDays = setup.evenings.flatMap((e, day) => (e.cooking ? [day] : []));
  const minutes = minutesToChoose(startedAt, known);
  const offEvening = known.filter((d) => d.day === null || !setup.evenings[d.day]?.cooking);

  function save(next: PlannedDish[]) {
    startSaving(async () => {
      const result = await saveWeekDishesAction(weekStart, next);
      setSaveError(result.error ?? null);
      if (result.choosingStartedAt) setStartedAt(result.choosingStartedAt);
    });
  }
  function change(next: PlannedDish[]) {
    setHistory((h) => [...h, dishes]);
    setDishes(next);
    setPage(0);
    save(next);
  }
  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((h) => h.slice(0, -1));
    setDishes(previous);
    save(previous);
  }
  function add(recipe: PlanRecipe, via: PlannedDish["via"]) {
    change(addDish(dishes, recipe, setup, via));
  }

  return (
    <>
      <section className="space-y-3 rounded-2xl border border-line bg-paper p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">
            Your week{" "}
            <span className="text-base font-normal text-muted">
              · {cookingDays.length - open.length} of {cookingDays.length} chosen
            </span>
          </h2>
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            className="rounded-full border border-line px-3 py-1 text-sm hover:border-terracotta/50 disabled:opacity-40"
          >
            Undo
          </button>
        </div>
        <ul className="divide-y divide-line">
          {cookingDays.map((day) => {
            const dish = known.find((d) => d.day === day);
            return (
              <li key={day} className="py-2">
                <p className="text-xs tracking-wide text-muted uppercase">
                  {DAY_NAMES[day]} · {TIME_SLOTS[setup.evenings[day].time].label}
                </p>
                {dish ? (
                  <ChosenDish
                    dish={dish}
                    recipe={byId.get(dish.recipeId)!}
                    setup={setup}
                    cookingDays={cookingDays}
                    onMove={(to) => change(moveDish(dishes, dish.recipeId, to))}
                    onRemove={() => change(removeDish(dishes, dish.recipeId))}
                  />
                ) : (
                  <p className="text-muted">Nothing yet</p>
                )}
              </li>
            );
          })}
          {offEvening.map((dish) => (
            <li key={dish.recipeId} className="py-2">
              <p className="text-xs tracking-wide text-muted uppercase">Not on an evening yet</p>
              <ChosenDish
                dish={dish}
                recipe={byId.get(dish.recipeId)!}
                setup={setup}
                cookingDays={cookingDays}
                onMove={(to) => change(moveDish(dishes, dish.recipeId, to))}
                onRemove={() => change(removeDish(dishes, dish.recipeId))}
              />
            </li>
          ))}
        </ul>
        {saveError && (
          <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
            Not saved: {saveError}
          </p>
        )}
      </section>

      {open.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-semibold">
            {known.length === 0 ? "Pick a first dish" : "Suggestions for the rest of the week"}
          </h2>
          {known.length === 0 && (
            <p className="text-sm text-muted">
              Start with anything you feel like. After each pick, the suggestions update to fit what you&apos;ve chosen.
            </p>
          )}
          {shown.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-line p-5 text-muted">
              Nothing else fits the open evenings. Give an evening more time in the setup, or browse all recipes.
            </p>
          ) : (
            <ul className="grid gap-3 md:grid-cols-3">
              {shown.map((s) => (
                <li key={s.recipe.id}>
                  <SuggestionCard
                    suggestion={s}
                    day={pickEvening(s.recipe, setup, known)}
                    onAdd={() => add(s.recipe, known.length === 0 ? "start" : "suggestion")}
                    onDismiss={() => setDismissed((d) => [...d, s.recipe.id])}
                  />
                </li>
              ))}
            </ul>
          )}
          <div className="flex flex-wrap gap-3">
            {(hasMore || page > 0) && (
              <button
                type="button"
                onClick={() => setPage(hasMore ? page + 1 : 0)}
                className="rounded-full border border-line px-4 py-2 text-sm hover:border-terracotta/50"
              >
                {hasMore ? "Show others" : "Back to the best suggestions"}
              </button>
            )}
            <button
              type="button"
              onClick={() => setBrowsing(!browsing)}
              aria-expanded={browsing}
              className="rounded-full border border-line px-4 py-2 text-sm hover:border-terracotta/50"
            >
              {browsing ? "Hide all recipes" : "Browse all recipes"}
            </button>
            {dismissed.length > 0 && (
              <button type="button" onClick={() => setDismissed([])} className="px-2 py-2 text-sm text-terracotta underline">
                Bring back {dismissed.length} hidden
              </button>
            )}
          </div>
          {browsing && (
            <BrowseAll
              recipes={recipes}
              chosen={known}
              onAdd={(r) => {
                add(r, "browse");
                setBrowsing(false);
              }}
            />
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-sage/40 bg-sage-light p-5">
          <h2 className="font-display text-xl font-semibold text-sage">All {cookingDays.length} dinners chosen</h2>
          <p className="mt-1 text-sm">
            {minutes !== null && <>Chosen in {minutes} {minutes === 1 ? "minute" : "minutes"}. </>}
            The weekly plan view, shopping list and Sunday prep come in the next milestone.
          </p>
        </section>
      )}
    </>
  );
}

function ChosenDish({
  dish,
  recipe,
  setup,
  cookingDays,
  onMove,
  onRemove,
}: {
  dish: PlannedDish;
  recipe: PlanRecipe;
  setup: WeekSetup;
  cookingDays: number[];
  onMove: (day: number | null) => void;
  onRemove: () => void;
}) {
  const clash = timeClash(recipe, setup, dish.day);
  return (
    <div className="mt-1 flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <Link href={`/recipes/${recipe.id}`} className="font-medium hover:text-terracotta">
          {recipe.title}
        </Link>
        <p className="text-sm text-muted">
          {recipe.timeTotalMin} min · {recipe.cuisine}
        </p>
        {clash && <p className="text-sm text-danger">{clash}</p>}
      </div>
      <select
        aria-label={`Move ${recipe.title}`}
        value={dish.day ?? ""}
        onChange={(e) => onMove(e.target.value === "" ? null : Number(e.target.value))}
        className="w-20 shrink-0 rounded-xl border border-line bg-cream px-2 py-1 text-sm"
      >
        {cookingDays.map((day) => (
          <option key={day} value={day}>
            {DAY_SHORT[day]}
          </option>
        ))}
        <option value="">No evening</option>
      </select>
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove ${recipe.title}`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-cream hover:text-ink"
      >
        ×
      </button>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  day,
  onAdd,
  onDismiss,
}: {
  suggestion: Suggestion;
  day: number | null;
  onAdd: () => void;
  onDismiss: () => void;
}) {
  const [allReasons, setAllReasons] = useState(false);
  const { recipe, reasons, notes } = suggestion;
  const visible = allReasons ? reasons : reasons.slice(0, 3);
  return (
    <article className="flex h-full flex-col gap-2 rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <h3 className="font-medium leading-snug">
        <Link href={`/recipes/${recipe.id}`} className="hover:text-terracotta">
          {recipe.title}
        </Link>
      </h3>
      <p className="text-sm text-muted">
        {recipe.timeTotalMin} min · {recipe.cuisine}
      </p>
      {visible.length > 0 && (
        <ul className="space-y-1 text-sm">
          {visible.map((r) => (
            <li key={r.text} className="flex gap-2">
              <span aria-hidden className="text-sage">
                ✓
              </span>
              <span>{r.text}</span>
            </li>
          ))}
        </ul>
      )}
      {reasons.length > 3 && (
        <button type="button" onClick={() => setAllReasons(!allReasons)} className="self-start text-sm text-terracotta underline">
          {allReasons ? "Fewer reasons" : `${reasons.length - 3} more ${reasons.length - 3 === 1 ? "reason" : "reasons"}`}
        </button>
      )}
      {notes.length > 0 && (
        <ul className="space-y-1 text-sm text-muted">
          {notes.map((n) => (
            <li key={n} className="flex gap-2">
              <span aria-hidden>–</span>
              <span>{n}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-auto flex flex-wrap gap-2 pt-2">
        <button
          type="button"
          onClick={onAdd}
          className="rounded-xl bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-dark"
        >
          {day === null ? "Add" : `Add to ${DAY_NAMES[day]}`}
        </button>
        <button type="button" onClick={onDismiss} className="rounded-xl border border-line px-3 py-2 text-sm hover:bg-cream">
          Not this one
        </button>
      </div>
    </article>
  );
}

function BrowseAll({
  recipes,
  chosen,
  onAdd,
}: {
  recipes: PlanRecipe[];
  chosen: PlannedDish[];
  onAdd: (recipe: PlanRecipe) => void;
}) {
  const [query, setQuery] = useState("");
  const chosenIds = new Set(chosen.map((d) => d.recipeId));
  const words = normalise(query).split(/\s+/).filter(Boolean);
  const list = recipes
    .filter((r) => !chosenIds.has(r.id) && r.seafood !== "contains")
    .filter((r) => words.every((w) => normalise(`${r.title} ${r.cuisine}`).includes(w)))
    .sort((a, b) => a.title.localeCompare(b.title));
  return (
    <div className="space-y-2 rounded-2xl border border-line bg-paper p-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or cuisine"
        className="block w-full rounded-xl border border-line bg-cream px-3 py-2 text-base"
      />
      <ul className="divide-y divide-line">
        {list.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 py-2">
            <span className="min-w-0">
              <span className="block">{r.title}</span>
              <span className="text-sm text-muted">
                {r.timeTotalMin} min · {r.cuisine}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onAdd(r)}
              className="shrink-0 rounded-xl border border-line px-3 py-1 text-sm hover:border-terracotta/50"
            >
              Add
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-2 text-muted">No recipes match.</li>}
      </ul>
      <p className="text-xs text-muted">Recipes with seafood are left out.</p>
    </div>
  );
}
