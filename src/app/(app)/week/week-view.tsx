"use client";

import { useState, useTransition } from "react";
import { saveWeekSetupAction } from "@/lib/plan/actions";
import type { PastWeek } from "@/lib/plan/history";
import type { LikedCombination } from "@/lib/plan/liked";
import type { PlanRecipe } from "@/lib/plan/suggest";
import { cookingEvenings, type PlannedDish, type WeekSetup } from "@/lib/plan/types";
import { WeekChooser } from "./week-chooser";
import { WeekNights } from "./week-nights";

export function WeekView({
  weekStart,
  savedSetup,
  startingSetup,
  dishes,
  choosingStartedAt,
  recipes,
  pastWeeks,
  likedCombinations,
}: {
  weekStart: string;
  savedSetup: WeekSetup | null;
  /** The usual week, for a week not saved yet. */
  startingSetup: WeekSetup;
  dishes: PlannedDish[];
  choosingStartedAt: string | null;
  recipes: PlanRecipe[];
  pastWeeks: PastWeek[];
  likedCombinations: LikedCombination[];
}) {
  const [setup, setSetup] = useState(savedSetup ?? startingSetup);
  const [saved, setSaved] = useState(savedSetup !== null);
  const [error, setError] = useState<string | null>(null);
  const [, startSaving] = useTransition();

  function changeSetup(next: WeekSetup) {
    setSetup(next);
    startSaving(async () => {
      const result = await saveWeekSetupAction(weekStart, next);
      setError(result.error ?? null);
      if (result.setup) setSaved(true);
    });
  }

  const noNights = cookingEvenings(setup).length === 0;
  return (
    <>
      <WeekNights setup={setup} saved={saved} error={error} onChange={changeSetup} />
      {noNights && (
        <p className="rounded-2xl border border-dashed border-line p-5 text-muted">
          No cooking nights this week. Turn a night on above to choose dinners.
        </p>
      )}
      {/* Hidden, not removed, so the dinners chosen so far stay in place. */}
      <div hidden={noNights} className="space-y-4">
        <WeekChooser
          weekStart={weekStart}
          setup={setup}
          setupIfNew={saved ? null : setup}
          onWeekSaved={() => setSaved(true)}
          initialDishes={dishes}
          choosingStartedAt={choosingStartedAt}
          recipes={recipes}
          pastWeeks={pastWeeks}
          likedCombinations={likedCombinations}
        />
      </div>
    </>
  );
}
