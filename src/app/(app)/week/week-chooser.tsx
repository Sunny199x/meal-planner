"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  recordSuggestionEventsAction,
  saveDismissedAction,
  saveEaseAction,
  saveWeekDishesAction,
} from "@/lib/plan/actions";
import { addDays, formatWeek } from "@/lib/plan/dates";
import { recentDinners, type PastWeek, type Repeated } from "@/lib/plan/history";
import { usableCombinations, type LikedCombination } from "@/lib/plan/liked";
import { addDish, minutesToChoose, moveDish, pickEvening, removeDish, setRepeat, timeClash } from "@/lib/plan/choose";
import {
  changeFreezer,
  changeLunchBoxes,
  lunchStatus,
  planPortions,
  shareLunchesAutomatically,
  type DishPortions,
} from "@/lib/plan/portions";
import { openEvenings, rankCandidates, shortlist, type PlanRecipe, type Suggestion } from "@/lib/plan/suggest";
import { DAY_NAMES, DAY_SHORT, MAX_FREEZER, TIME_SLOTS, type PlannedDish, type WeekSetup } from "@/lib/plan/types";
import { RecipeTile } from "@/components/ui";
import { setRecipeStatusAction } from "@/lib/recipes/actions";
import { matchesWords } from "@/lib/recipes/filters";
import type { RecipeStatus } from "@/lib/recipes/types";
import { formatQuantity } from "@/lib/recipes/format";
import { LikeDishes, LikedList } from "./liked";
import { PastWeeks } from "./past-weeks";

export function WeekChooser({
  weekStart,
  setup,
  setupIfNew,
  onWeekSaved,
  initialDishes,
  initialDismissed,
  initialEase,
  choosingStartedAt,
  recipes: recipeRows,
  pastWeeks,
  likedCombinations,
}: {
  weekStart: string;
  setup: WeekSetup;
  /** The setup to create the week with on its first save, while it isn't saved yet. */
  setupIfNew: WeekSetup | null;
  onWeekSaved: () => void;
  initialDishes: PlannedDish[];
  /** "Not this one" for this week, as saved. */
  initialDismissed: string[];
  /** "How hard did choosing feel?" (1–5), if answered. */
  initialEase: number | null;
  choosingStartedAt: string | null;
  recipes: PlanRecipe[];
  /** Earlier weeks with dinners, newest first. */
  pastWeeks: PastWeek[];
  /** Combinations the household liked, newest first. */
  likedCombinations: LikedCombination[];
}) {
  const [dishes, setDishes] = useState(initialDishes);
  const [history, setHistory] = useState<PlannedDish[][]>([]);
  const [dismissed, setDismissed] = useState<string[]>(initialDismissed);
  const [page, setPage] = useState(0);
  const [browsing, setBrowsing] = useState(false);
  const [showingPast, setShowingPast] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [liked, setLiked] = useState(likedCombinations);
  const [showingLiked, setShowingLiked] = useState(false);
  // "Any dishes you really want this week?": open at the start of a week, until a suggestion is picked.
  const [wanting, setWanting] = useState(initialDishes.length === 0);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [startedAt, setStartedAt] = useState(choosingStartedAt);
  const [, startSaving] = useTransition();

  // Statuses changed here ("keep it in your rotation?") apply straight away.
  const [statusChanges, setStatusChanges] = useState<Record<string, RecipeStatus>>({});
  const recipes = useMemo(
    () => recipeRows.map((r) => (statusChanges[r.id] ? { ...r, status: statusChanges[r.id] } : r)),
    [recipeRows, statusChanges],
  );
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const known = useMemo(() => dishes.filter((d) => byId.has(d.recipeId)), [dishes, byId]);
  const usable = useMemo(() => usableCombinations(liked, byId), [liked, byId]);
  const recent = useMemo(() => recentDinners(pastWeeks, weekStart), [pastWeeks, weekStart]);
  // New dishes tried the week before, to keep in the rotation or not.
  const [notYet, setNotYet] = useState<string[]>([]);
  const tried = useMemo(() => {
    const lastWeek = pastWeeks.find((w) => w.weekStart === addDays(weekStart, -7));
    return (lastWeek?.dishes ?? [])
      .filter((d) => d.day !== null)
      .map((d) => byId.get(d.recipeId))
      .filter((r): r is PlanRecipe => r?.status === "trial" && !notYet.includes(r.id));
  }, [pastWeeks, weekStart, byId, notYet]);
  const [keepError, setKeepError] = useState<string | null>(null);
  const [, startKeeping] = useTransition();
  function decide(recipe: PlanRecipe, status: RecipeStatus) {
    setStatusChanges((c) => ({ ...c, [recipe.id]: status }));
    startKeeping(async () => {
      const result = await setRecipeStatusAction([recipe.id], status);
      if (result.error) {
        setKeepError(result.error);
        setStatusChanges((c) => ({ ...c, [recipe.id]: "trial" }));
      } else {
        setKeepError(null);
      }
    });
  }
  // Weeks whose dishes have all been deleted have nothing to repeat.
  const repeatable = useMemo(() => pastWeeks.filter((w) => w.dishes.some((d) => byId.has(d.recipeId))), [pastWeeks, byId]);
  const plan = { setup, dishes: known, dismissed };
  const ranked = useMemo(
    () =>
      rankCandidates(recipes, { setup, dishes: known, dismissed, liked: usable.map((c) => c.recipeIds), recent }, weekStart),
    [recipes, setup, known, dismissed, usable, recent, weekStart],
  );
  const open = openEvenings(plan);
  const shown = shortlist(ranked, 3, page);
  const hasMore = shortlist(ranked, 3, page + 1).length > 0;
  // Each suggestion is counted as shown once per visit to the page.
  const reported = useRef(new Set<string>());
  const shownIds = shown.map((s) => s.recipe.id).join(",");
  useEffect(() => {
    const fresh = shownIds.split(",").filter((id) => id && !reported.current.has(id));
    fresh.forEach((id) => reported.current.add(id));
    if (fresh.length > 0) void recordSuggestionEventsAction(weekStart, "shown", fresh);
  }, [shownIds, weekStart]);
  const cookingDays = setup.evenings.flatMap((e, day) => (e.cooking ? [day] : []));
  const minutes = minutesToChoose(startedAt, known);
  const offEvening = known.filter((d) => d.day === null || !setup.evenings[d.day]?.cooking);
  const portions = useMemo(() => planPortions(setup, known, byId), [setup, known, byId]);

  // What was shown, hidden and picked is recorded quietly for a later recipe review.
  function record(kind: "shown" | "dismissed" | "picked", ids: string[]) {
    if (ids.length > 0) void recordSuggestionEventsAction(weekStart, kind, ids);
  }
  function changeDismissed(next: string[]) {
    setDismissed(next);
    startSaving(async () => {
      const result = await saveDismissedAction(weekStart, next, setupIfNew);
      if (!result.error) onWeekSaved();
    });
  }
  function dismiss(id: string) {
    changeDismissed([...dismissed, id]);
    record("dismissed", [id]);
  }
  function save(next: PlannedDish[]) {
    startSaving(async () => {
      const result = await saveWeekDishesAction(weekStart, next, setupIfNew);
      setSaveError(result.error ?? null);
      if (!result.error) onWeekSaved();
      if (result.choosingStartedAt) setStartedAt(result.choosingStartedAt);
    });
  }
  function change(next: PlannedDish[]) {
    const before = new Set(dishes.map((d) => d.recipeId));
    record("picked", next.map((d) => d.recipeId).filter((id) => !before.has(id)));
    setHistory((h) => [...h, dishes]);
    setDishes(next);
    setPage(0);
    setNotice(null);
    save(next);
  }
  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setNotice(null);
    setHistory((h) => h.slice(0, -1));
    setDishes(previous);
    save(previous);
  }
  function add(recipe: PlanRecipe, via: PlannedDish["via"]) {
    change(addDish(dishes, recipe, setup, via));
  }
  function addLiked(recipeIds: string[]) {
    let next = dishes;
    for (const id of recipeIds) {
      const recipe = byId.get(id);
      if (recipe) next = addDish(next, recipe, setup, "liked");
    }
    change(next);
    setShowingLiked(false);
  }
  function repeat(week: PastWeek, repeated: Repeated) {
    change(repeated.dishes);
    setShowingPast(false);
    const count = repeated.added.length;
    const missing = repeated.noRoom.map((id) => byId.get(id)?.title).filter(Boolean);
    setNotice(
      `Added ${count} ${count === 1 ? "dinner" : "dinners"} from ${formatWeek(week.weekStart)}. ` +
        (missing.length > 0 ? `No free evening was left for ${missing.join(", ")}. ` : "") +
        "Undo takes them all back.",
    );
  }
  function renderDish(dish: PlannedDish) {
    return (
      <ChosenDish
        weekStart={weekStart}
        dish={dish}
        recipe={byId.get(dish.recipeId)!}
        portions={portions.get(dish.recipeId)!}
        setup={setup}
        cookingDays={cookingDays}
        repeatDays={open.filter((day) => dish.day !== null && day > dish.day)}
        onMove={(to) => change(moveDish(dishes, dish.recipeId, to))}
        onRemove={() => change(removeDish(dishes, dish.recipeId))}
        onLunch={(person, by) => change(changeLunchBoxes(dishes, portions, dish.recipeId, person, by))}
        onFreezer={(by) => change(changeFreezer(dishes, dish.recipeId, by))}
        onRepeat={(day) => change(setRepeat(dishes, dish.recipeId, day))}
      />
    );
  }

  return (
    <>
      {tried.length > 0 && (
        <section className="space-y-2 rounded-2xl border border-note/40 bg-note-light p-5">
          <h2 className="font-display text-lg font-extrabold tracking-tight">
            You tried {tried[0].title} last week
          </h2>
          <p className="text-sm">Keep it in your rotation, so it&apos;s suggested like your other dishes?</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => decide(tried[0], "rotation")}
              className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
            >
              Yes, keep it
            </button>
            <button
              type="button"
              onClick={() => decide(tried[0], "excluded")}
              className="rounded-full border border-line bg-paper px-4 py-2 text-sm hover:border-accent/50"
            >
              No, stop suggesting it
            </button>
            <button
              type="button"
              onClick={() => setNotYet((n) => [...n, tried[0].id])}
              className="px-2 py-2 text-sm text-muted underline"
            >
              Not yet
            </button>
          </div>
          {keepError && (
            <p role="alert" className="text-sm text-danger">
              Not saved: {keepError}
            </p>
          )}
        </section>
      )}
      <section className="space-y-3 rounded-2xl border border-line bg-paper p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-extrabold tracking-tight">
            Your week{" "}
            <span className="text-base font-normal text-muted">
              · {cookingDays.length - open.length} of {cookingDays.length} chosen
            </span>
          </h2>
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0}
            className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent/50 disabled:opacity-40"
          >
            Undo
          </button>
        </div>
        <RemainingNeeds
          setup={setup}
          open={open}
          portions={portions}
          automatic={known.every((d) => !d.lunches)}
          onShareOut={() => change(shareLunchesAutomatically(dishes))}
        />
        <ul className="divide-y divide-line">
          {cookingDays.map((day) => {
            const dish = known.find((d) => d.day === day);
            const repeat = known.find((d) => d.alsoOn === day);
            return (
              <li key={day} className="py-2">
                <p className="text-xs tracking-wide text-muted uppercase">
                  {DAY_NAMES[day]} · {TIME_SLOTS[setup.evenings[day].time].label}
                </p>
                {dish ? (
                  renderDish(dish)
                ) : repeat ? (
                  <RepeatDinner
                    dish={repeat}
                    recipe={byId.get(repeat.recipeId)!}
                    onStop={() => change(setRepeat(dishes, repeat.recipeId, null))}
                  />
                ) : (
                  <p className="text-muted">Nothing yet</p>
                )}
              </li>
            );
          })}
          {offEvening.map((dish) => (
            <li key={dish.recipeId} className="py-2">
              <p className="text-xs tracking-wide text-muted uppercase">Backup dinner · no evening</p>
              <p className="text-xs text-muted">Still on the shopping list: cook it if a night&apos;s plan falls through.</p>
              {renderDish(dish)}
            </li>
          ))}
        </ul>
        {known.length >= 2 && (
          <LikeDishes weekStart={weekStart} dishes={known} byId={byId} liked={liked} onSaved={setLiked} />
        )}
        {notice && (
          <p role="status" className="rounded-xl bg-good-light px-3 py-2 text-sm text-good">
            {notice}
          </p>
        )}
        {saveError && (
          <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
            Not saved: {saveError}
          </p>
        )}
      </section>

      {open.length > 0 ? (
        <section className="space-y-3">
          <h2 className="font-display text-xl font-extrabold tracking-tight">
            {wanting
              ? known.length === 0
                ? "Any dishes you really want this week?"
                : "Anything else you really want?"
              : known.length === 0
                ? "Pick a first dish"
                : "Suggestions for the rest of the week"}
          </h2>
          {wanting && (
            <>
              <p className="text-sm text-muted">
                Type to find them and add as many as you like. Or start from a suggestion below
                {repeatable.length > 0 && <>, or repeat a past week</>}: they update after each pick.
              </p>
              <WantedSearch recipes={recipes} chosen={known} onAdd={(r) => add(r, "browse")} />
              {known.length > 0 && (
                <button type="button" onClick={() => setWanting(false)} className="text-sm text-accent underline">
                  That&apos;s all: suggest the rest
                </button>
              )}
            </>
          )}
          {known.length === 0 && usable.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-bold">♥ Start from a combination you liked</h3>
              <LikedList combinations={usable} byId={byId} chosen={known} onAdd={addLiked} onChanged={setLiked} />
            </div>
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
                    onAdd={() => {
                      add(s.recipe, known.length === 0 ? "start" : "suggestion");
                      setWanting(false);
                    }}
                    onDismiss={() => dismiss(s.recipe.id)}
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
                className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent/50"
              >
                {hasMore ? "Show others" : "Back to the best suggestions"}
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setBrowsing(!browsing);
                setShowingPast(false);
                setShowingLiked(false);
              }}
              aria-expanded={browsing}
              className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent/50"
            >
              {browsing ? "Hide all recipes" : "Browse all recipes"}
            </button>
            {known.length > 0 && usable.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowingLiked(!showingLiked);
                  setBrowsing(false);
                  setShowingPast(false);
                }}
                aria-expanded={showingLiked}
                className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent/50"
              >
                {showingLiked ? "Hide combinations" : "♥ Combinations you liked"}
              </button>
            )}
            {repeatable.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setShowingPast(!showingPast);
                  setBrowsing(false);
                  setShowingLiked(false);
                }}
                aria-expanded={showingPast}
                className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent/50"
              >
                {showingPast ? "Hide past weeks" : "Repeat a past week"}
              </button>
            )}
            {dismissed.length > 0 && (
              <button type="button" onClick={() => changeDismissed([])} className="px-2 py-2 text-sm text-accent underline">
                Bring back {dismissed.length} hidden
              </button>
            )}
          </div>
          {showingLiked && known.length > 0 && (
            <LikedList combinations={usable} byId={byId} chosen={known} onAdd={addLiked} onChanged={setLiked} />
          )}
          {showingPast && <PastWeeks weeks={repeatable} byId={byId} setup={setup} dishes={known} onRepeat={repeat} />}
          {browsing && (
            <BrowseAll
              recipes={recipes}
              chosen={known}
              recent={recent}
              onAdd={(r) => {
                add(r, "browse");
                setBrowsing(false);
              }}
            />
          )}
        </section>
      ) : (
        <section className="rounded-2xl border border-good/40 bg-good-light p-5">
          <h2 className="font-display text-xl font-extrabold tracking-tight text-good">All {cookingDays.length} dinners chosen</h2>
          <p className="mt-1 text-sm">
            {minutes !== null && <>Chosen in {minutes} {minutes === 1 ? "minute" : "minutes"}. </>}
            Check the portions above: <strong>Change</strong> on a dish moves lunch boxes, adds freezer
            portions or plans it again as leftovers. Then open the{" "}
            <Link href={`/week/shopping?week=${weekStart}`} className="text-accent underline">
              shopping list
            </Link>{" "}
            and the{" "}
            <Link href={`/week/prep?week=${weekStart}`} className="text-accent underline">
              prep list
            </Link>
            .
          </p>
          <EaseRating weekStart={weekStart} initial={initialEase} />
        </section>
      )}
    </>
  );
}

const EASE_LABELS = ["", "Very easy", "Easy", "OK", "Hard", "Very hard"];

/** One tap after choosing: how hard did that feel? Saved with the week to see the trend. */
function EaseRating({ weekStart, initial }: { weekStart: string; initial: number | null }) {
  const [ease, setEase] = useState(initial);
  const [error, setError] = useState<string | null>(null);
  const [, startSaving] = useTransition();
  function choose(value: number) {
    const next = value === ease ? null : value;
    setEase(next);
    startSaving(async () => {
      const result = await saveEaseAction(weekStart, next);
      setError(result.error ?? null);
    });
  }
  return (
    <div className="mt-3 space-y-1 border-t border-good/30 pt-3">
      <p className="text-sm font-medium">How hard did choosing feel?</p>
      <div role="group" aria-label="How hard did choosing feel?" className="flex gap-1">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={ease === value}
            aria-label={`${value}: ${EASE_LABELS[value]}`}
            onClick={() => choose(value)}
            className={`h-10 w-10 rounded-full border text-sm font-medium ${
              ease === value ? "border-good bg-good text-white" : "border-good/40 bg-paper hover:border-good"
            }`}
          >
            {value}
          </button>
        ))}
      </div>
      <p className="text-xs text-muted">
        {ease ? `${EASE_LABELS[ease]}. Thanks: this helps see whether choosing gets easier.` : "1 is very easy, 5 is very hard."}
      </p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          Not saved: {error}
        </p>
      )}
    </div>
  );
}

/** What the week still needs: open evenings and lunch boxes. */
function RemainingNeeds({
  setup,
  open,
  portions,
  automatic,
  onShareOut,
}: {
  setup: WeekSetup;
  open: number[];
  portions: Map<string, DishPortions>;
  automatic: boolean;
  onShareOut: () => void;
}) {
  const lunches = lunchStatus(setup, portions);
  const short = lunches.some((l) => l.planned < l.needed);
  return (
    <p className="text-sm text-muted">
      {open.length > 0 ? <>Still open: {open.map((day) => DAY_SHORT[day]).join(", ")}. </> : null}
      {lunches.length > 0 && (
        <>
          Lunch boxes: {lunches.map((l) => `${l.name} ${l.planned} of ${l.needed}`).join(", ")} planned.
          {short && " Choose a dish that's good as leftovers, or use Change on a dish."}
        </>
      )}
      {!automatic && (
        <>
          {" "}
          <button type="button" onClick={onShareOut} className="text-accent underline">
            Share lunch boxes out automatically
          </button>
        </>
      )}
    </p>
  );
}

const fmt = formatQuantity;

/** "dinner 2½ · again Thu 2½ · Sunny's lunch ×2 (3) · freezer 1" */
function portionParts(portions: DishPortions, setup: WeekSetup, alsoOn: number | null | undefined): string[] {
  const parts = [`dinner ${fmt(portions.dinner)}`];
  if (portions.repeat && alsoOn != null) parts.push(`again ${DAY_SHORT[alsoOn]} ${fmt(portions.repeat)}`);
  portions.lunchBoxes.forEach((boxes, i) => {
    if (!boxes) return;
    const person = setup.people[i];
    const size = boxes * person.dinnerPortion;
    parts.push(`${person.name}'s lunch ×${boxes}${size === boxes ? "" : ` (${fmt(size)})`}`);
  });
  if (portions.freezer) parts.push(`freezer ${fmt(portions.freezer)}`);
  return parts;
}

function ChosenDish({
  weekStart,
  dish,
  recipe,
  portions,
  setup,
  cookingDays,
  repeatDays,
  onMove,
  onRemove,
  onLunch,
  onFreezer,
  onRepeat,
}: {
  weekStart: string;
  dish: PlannedDish;
  recipe: PlanRecipe;
  portions: DishPortions;
  setup: WeekSetup;
  cookingDays: number[];
  /** Open evenings after this dish's own, for eating it again. */
  repeatDays: number[];
  onMove: (day: number | null) => void;
  onRemove: () => void;
  onLunch: (person: number, by: 1 | -1) => void;
  onFreezer: (by: 1 | -1) => void;
  onRepeat: (day: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const clash = timeClash(recipe, setup, dish.day);
  const lunchPeople = setup.people.flatMap((person, i) => (person.lunches > 0 || portions.lunchBoxes[i] > 0 ? [i] : []));
  const canFreeze = recipe.freezerFriendly || portions.freezer > 0;
  const canRepeat = (recipe.goodAsLeftovers && dish.day !== null) || dish.alsoOn != null;
  const repeatOptions = [...new Set([...repeatDays, ...(dish.alsoOn != null ? [dish.alsoOn] : [])])].sort((a, b) => a - b);
  return (
    <div className="mt-1">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <Link
            href={`/recipes/${recipe.id}?portions=${portions.total}&week=${weekStart}`}
            className="font-medium hover:text-accent"
          >
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
          className="w-20 shrink-0 rounded-xl border border-line bg-soft px-2 py-1 text-sm"
        >
          {cookingDays.map((day) => (
            <option key={day} value={day}>
              {DAY_SHORT[day]}
            </option>
          ))}
          <option value="">Backup (no evening)</option>
        </select>
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${recipe.title}`}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-soft hover:text-ink"
        >
          ×
        </button>
      </div>
      <p className="mt-1 text-sm">
        <span className="font-medium">Cook {fmt(portions.total)} portions</span>
        <span className="text-muted">: {portionParts(portions, setup, dish.alsoOn).join(" · ")}</span>
        {(lunchPeople.length > 0 || canFreeze || canRepeat) && (
          <>
            {" "}
            <button
              type="button"
              onClick={() => setEditing(!editing)}
              aria-expanded={editing}
              className="text-accent underline"
            >
              {editing ? "Done" : "Change"}
            </button>
          </>
        )}
      </p>
      {editing && (
        <div className="mt-2 space-y-2 rounded-xl bg-soft p-3 text-sm">
          {lunchPeople.map((i) => (
            <Stepper
              key={i}
              label={`${setup.people[i].name}'s lunch boxes`}
              value={portions.lunchBoxes[i]}
              max={14}
              onChange={(by) => onLunch(i, by)}
            />
          ))}
          {canFreeze && (
            <Stepper label="Portions for the freezer" value={portions.freezer} max={MAX_FREEZER} onChange={onFreezer} />
          )}
          {canRepeat && (
            <label className="flex items-center justify-between gap-3">
              <span>Eat again as leftovers</span>
              <select
                value={dish.alsoOn ?? ""}
                onChange={(e) => onRepeat(e.target.value === "" ? null : Number(e.target.value))}
                className="rounded-xl border border-line bg-paper px-2 py-1"
              >
                <option value="">No</option>
                {repeatOptions.map((day) => (
                  <option key={day} value={day}>
                    {DAY_NAMES[day]}
                  </option>
                ))}
              </select>
            </label>
          )}
          {canRepeat && repeatOptions.length === 0 && (
            <p className="text-muted">No open evening later in the week for leftovers.</p>
          )}
          <p className="text-xs text-muted">
            A lunch box is the size of that person&apos;s dinner. {recipe.servings} portions is the recipe as written.
          </p>
        </div>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (by: 1 | -1) => void;
}) {
  const button = "flex h-8 w-8 items-center justify-center rounded-full border border-line bg-paper text-lg disabled:opacity-40";
  return (
    <div className="flex items-center justify-between gap-3">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <button type="button" onClick={() => onChange(-1)} disabled={value <= 0} aria-label={`Fewer: ${label}`} className={button}>
          −
        </button>
        <span className="w-6 text-center font-medium">{value}</span>
        <button type="button" onClick={() => onChange(1)} disabled={value >= max} aria-label={`More: ${label}`} className={button}>
          +
        </button>
      </span>
    </div>
  );
}

/** An evening of leftovers from a dish cooked earlier in the week. */
function RepeatDinner({ dish, recipe, onStop }: { dish: PlannedDish; recipe: PlanRecipe; onStop: () => void }) {
  return (
    <div className="mt-1 flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{recipe.title}</p>
        <p className="text-sm text-muted">
          Leftovers from {dish.day !== null ? DAY_NAMES[dish.day] : "earlier"}: no cooking tonight
        </p>
      </div>
      <button
        type="button"
        onClick={onStop}
        aria-label={`Don't eat ${recipe.title} again`}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted hover:bg-soft hover:text-ink"
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
  const { recipe, notes } = suggestion;
  // The household's own judgement first, marked apart from the rules' reasons.
  const yours = suggestion.reasons.filter((r) => r.kind === "liked");
  const reasons = suggestion.reasons.filter((r) => r.kind !== "liked");
  const visible = allReasons ? reasons : reasons.slice(0, 3);
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-paper">
      {recipe.photo && (
        // eslint-disable-next-line @next/next/no-img-element -- photos are already shrunk and served by the app
        <img src={recipe.photo} alt="" loading="lazy" className="aspect-[16/9] w-full object-cover" />
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="font-medium leading-snug">
          <Link href={`/recipes/${recipe.id}`} className="hover:text-accent">
            {recipe.title}
          </Link>
        </h3>
        <p className="text-sm text-muted">
          {recipe.timeTotalMin} min · {recipe.cuisine}
        </p>
        {yours.map((r) => (
          <p key={r.text} className="flex gap-2 text-sm font-medium">
            <span aria-hidden>♥</span>
            <span>
              {r.text} <span className="font-normal text-muted">(your combination)</span>
            </span>
          </p>
        ))}
        {visible.length > 0 && (
          <ul className="space-y-1 text-sm">
            {visible.map((r) => (
              <li key={r.text} className="flex gap-2">
                <span aria-hidden className="text-good">
                  ✓
                </span>
                <span>{r.text}</span>
              </li>
            ))}
          </ul>
        )}
        {reasons.length > 3 && (
          <button type="button" onClick={() => setAllReasons(!allReasons)} className="self-start text-sm text-accent underline">
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
            className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
          >
            {day === null ? "Add" : `Add to ${DAY_NAMES[day]}`}
          </button>
          <button type="button" onClick={onDismiss} className="rounded-xl border border-line px-3 py-2 text-sm hover:bg-soft">
            Not this one
          </button>
        </div>
      </div>
    </article>
  );
}

/** A search box for the dishes you really want; results show only while typing, and stay open for more. */
function WantedSearch({
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
  const matches =
    query.trim().length < 2
      ? []
      : recipes
          .filter((r) => !chosenIds.has(r.id) && r.seafood !== "contains" && r.status !== "excluded")
          .filter((r) => matchesWords([r.title, r.cuisine, r.source, r.site], query))
          .slice(0, 6);
  return (
    <div className="space-y-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="e.g. korma, tacos, Andy Cooks"
        aria-label="Find a dish you want this week"
        className="block w-full rounded-xl border border-line bg-paper px-3 py-2 text-base"
      />
      {matches.length > 0 && (
        <ul className="divide-y divide-line rounded-2xl border border-line bg-paper px-3">
          {matches.map((r) => (
            <li key={r.id} className="flex items-center gap-3 py-2">
              <RecipeTile title={r.title} cuisine={r.cuisine} photo={r.photo} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="block leading-snug">{r.title}</span>
                <span className="text-sm text-muted">
                  {r.timeTotalMin} min · {r.cuisine}
                  {r.status === "trial" && <> · new to try</>}
                </span>
              </span>
              <button
                type="button"
                onClick={() => {
                  onAdd(r);
                  setQuery("");
                }}
                className="shrink-0 rounded-xl border border-line px-3 py-1 text-sm hover:border-accent/50"
              >
                Add
              </button>
            </li>
          ))}
        </ul>
      )}
      {query.trim().length >= 2 && matches.length === 0 && <p className="text-sm text-muted">No recipes match.</p>}
    </div>
  );
}

function BrowseAll({
  recipes,
  chosen,
  recent,
  onAdd,
}: {
  recipes: PlanRecipe[];
  chosen: PlannedDish[];
  /** Dinners of the last two weeks: 1 = the week before, 2 = two weeks before. */
  recent: Record<string, number>;
  onAdd: (recipe: PlanRecipe) => void;
}) {
  const [query, setQuery] = useState("");
  const chosenIds = new Set(chosen.map((d) => d.recipeId));
  const list = recipes
    .filter((r) => !chosenIds.has(r.id) && r.seafood !== "contains" && r.status !== "excluded")
    .filter((r) => matchesWords([r.title, r.cuisine, r.source, r.site], query))
    .sort((a, b) => a.title.localeCompare(b.title));
  return (
    <div className="space-y-2 rounded-2xl border border-line bg-paper p-4">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name, cuisine or where it's from"
        className="block w-full rounded-xl border border-line bg-soft px-3 py-2 text-base"
      />
      <ul className="divide-y divide-line">
        {list.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2">
            <RecipeTile title={r.title} cuisine={r.cuisine} photo={r.photo} size="sm" />
            <span className="min-w-0 flex-1">
              <span className="block">{r.title}</span>
              <span className="text-sm text-muted">
                {r.timeTotalMin} min · {r.cuisine}
                {r.status === "trial" && <> · new to try</>}
                {recent[r.id] && <> · had {recent[r.id] === 1 ? "the week before" : "two weeks before"}</>}
              </span>
            </span>
            <button
              type="button"
              onClick={() => onAdd(r)}
              className="shrink-0 rounded-xl border border-line px-3 py-1 text-sm hover:border-accent/50"
            >
              Add
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="py-2 text-muted">No recipes match.</li>}
      </ul>
      <p className="text-xs text-muted">Recipes with seafood, and those marked “Not suggested”, are left out.</p>
    </div>
  );
}
