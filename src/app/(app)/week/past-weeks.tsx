"use client";

import Link from "next/link";
import { useState } from "react";
import { RecipeTile } from "@/components/ui";
import { formatWeek } from "@/lib/plan/dates";
import { repeatWeek, type PastWeek, type Repeated } from "@/lib/plan/history";
import type { PlanRecipe } from "@/lib/plan/suggest";
import { DAY_SHORT, type PlannedDish, type WeekSetup } from "@/lib/plan/types";

const SHOWN_AT_ONCE = 3;

/** Earlier weeks' dinners, each with a button to repeat it in this week. */
export function PastWeeks({
  weeks,
  byId,
  setup,
  dishes,
  onRepeat,
}: {
  weeks: PastWeek[];
  byId: Map<string, PlanRecipe>;
  setup: WeekSetup;
  dishes: PlannedDish[];
  onRepeat: (week: PastWeek, repeated: Repeated) => void;
}) {
  const [shown, setShown] = useState(SHOWN_AT_ONCE);
  const chosen = new Set(dishes.map((d) => d.recipeId));
  return (
    <div className="space-y-3 rounded-2xl border border-line bg-paper p-4">
      <p className="text-sm text-muted">
        Repeating a week puts its dinners on the same evenings. Dinners already chosen stay; a dinner whose evening is
        taken goes on the next free evening it fits. Lunch boxes are shared out afresh. Swap or remove any afterwards.
      </p>
      <ul className="space-y-3">
        {weeks.slice(0, shown).map((week) => {
          const repeated = repeatWeek(dishes, week.dishes, setup, byId);
          const ordered = [...week.dishes].sort((a, b) => (a.day ?? 7) - (b.day ?? 7));
          return (
            <li key={week.weekStart} className="rounded-xl border border-line p-3">
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-display font-extrabold tracking-tight">{formatWeek(week.weekStart)}</h3>
                <Link href={`/week?week=${week.weekStart}`} className="text-sm text-muted underline hover:text-ink">
                  Open
                </Link>
              </div>
              <ul className="mt-2 space-y-1.5">
                {ordered.map((dish) => {
                  const recipe = byId.get(dish.recipeId);
                  return (
                    <li key={dish.recipeId} className="flex items-center gap-3">
                      <span className="w-9 shrink-0 text-xs font-bold tracking-wide text-muted uppercase">
                        {dish.day === null ? "–" : DAY_SHORT[dish.day]}
                      </span>
                      {recipe ? (
                        <>
                          <RecipeTile title={recipe.title} cuisine={recipe.cuisine} photo={recipe.photo} size="sm" />
                          <span className="min-w-0 flex-1">
                            <span className="block leading-snug">{recipe.title}</span>
                            <span className="text-sm text-muted">
                              {recipe.timeTotalMin} min
                              {dish.alsoOn != null && <> · again {DAY_SHORT[dish.alsoOn]}</>}
                              {chosen.has(recipe.id) && <> · already in this week</>}
                              {recipe.seafood === "contains" && <> · contains seafood, left out</>}
                            </span>
                          </span>
                        </>
                      ) : (
                        <span className="text-muted">A recipe that has since been deleted</span>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => onRepeat(week, repeated)}
                  disabled={repeated.added.length === 0}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-40"
                >
                  Repeat this week
                </button>
                <span className="text-sm text-muted">{describe(repeated)}</span>
              </div>
            </li>
          );
        })}
      </ul>
      {weeks.length > shown && (
        <button
          type="button"
          onClick={() => setShown(shown + SHOWN_AT_ONCE)}
          className="rounded-full border border-line px-4 py-2 text-sm hover:border-accent/50"
        >
          Show older weeks
        </button>
      )}
    </div>
  );
}

function describe({ added, noRoom }: Repeated): string {
  if (added.length === 0) return noRoom.length > 0 ? "No free evening left for these." : "Nothing new to add.";
  const adds = `Adds ${added.length} ${added.length === 1 ? "dinner" : "dinners"}`;
  return noRoom.length > 0 ? `${adds}; ${noRoom.length} won't fit.` : `${adds}.`;
}
