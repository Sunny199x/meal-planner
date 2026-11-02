"use client";

import { useState } from "react";
import type { PastWeek } from "@/lib/plan/history";
import type { PlanRecipe } from "@/lib/plan/suggest";
import type { PlannedDish, WeekSetup } from "@/lib/plan/types";
import { WeekChooser } from "./week-chooser";
import { WeekSetupPanel } from "./week-setup";

export function WeekView({
  weekStart,
  savedSetup,
  startingSetup,
  dishes,
  choosingStartedAt,
  recipes,
  pastWeeks,
}: {
  weekStart: string;
  savedSetup: WeekSetup | null;
  startingSetup: WeekSetup;
  dishes: PlannedDish[];
  choosingStartedAt: string | null;
  recipes: PlanRecipe[];
  pastWeeks: PastWeek[];
}) {
  const [setup, setSetup] = useState(savedSetup);
  return (
    <>
      <WeekSetupPanel weekStart={weekStart} savedSetup={savedSetup} startingSetup={startingSetup} onSaved={setSetup} />
      {setup && (
        <WeekChooser
          weekStart={weekStart}
          setup={setup}
          initialDishes={dishes}
          choosingStartedAt={choosingStartedAt}
          recipes={recipes}
          pastWeeks={pastWeeks}
        />
      )}
    </>
  );
}
