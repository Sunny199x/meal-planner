import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorBox } from "@/components/ui";
import { describeDatabaseError, getDb } from "@/lib/db";
import type { RecipeRow, WeekPlanRow } from "@/lib/db/schema";
import { defaultWeekStart, readWeekStart, stockholmToday } from "@/lib/plan/dates";
import type { PastWeek } from "@/lib/plan/history";
import type { LikedCombination } from "@/lib/plan/liked";
import { getLikedCombinations } from "@/lib/plan/liked-store";
import { getPastWeeks, getPlan } from "@/lib/plan/store";
import { getUsualWeek } from "@/lib/plan/usual-week";
import { toPlanRecipe } from "@/lib/plan/suggest";
import type { WeekSetup } from "@/lib/plan/types";
import { getAllRecipes } from "@/lib/recipes/queries";
import { WeekHeader } from "./week-header";
import { WeekView } from "./week-view";

export default function WeekPage({ searchParams }: PageProps<"/week">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<p className="text-muted">Loading the week…</p>}>
        <Week searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Week({ searchParams }: Pick<PageProps<"/week">, "searchParams">) {
  const { week } = await searchParams;
  await connection();
  const comingWeek = defaultWeekStart(stockholmToday());
  const weekStart = readWeekStart(Array.isArray(week) ? week[0] : week) ?? comingWeek;

  let plan: WeekPlanRow | null;
  let startingSetup: WeekSetup;
  let recipeRows: RecipeRow[];
  let pastWeeks: PastWeek[];
  let liked: LikedCombination[];
  try {
    const db = await getDb();
    [plan, recipeRows, pastWeeks, liked] = await Promise.all([
      getPlan(db, weekStart),
      getAllRecipes(),
      getPastWeeks(db, weekStart),
      getLikedCombinations(db),
    ]);
    startingSetup = plan?.setup ?? (await getUsualWeek(db));
  } catch (error) {
    return <ErrorBox>{describeDatabaseError(error)}</ErrorBox>;
  }

  return (
    <>
      <WeekHeader weekStart={weekStart} comingWeek={comingWeek} tab="/week" />
      {recipeRows.length === 0 ? (
        <ErrorBox>There are no recipes yet. Add some under Recipes, or load them in Settings.</ErrorBox>
      ) : (
        <WeekView
          key={weekStart}
          weekStart={weekStart}
          savedSetup={plan?.setup ?? null}
          startingSetup={startingSetup}
          dishes={plan?.dishes ?? []}
          dismissed={plan?.dismissed ?? []}
          choosingStartedAt={plan?.choosingStartedAt?.toISOString() ?? null}
          recipes={recipeRows.map(toPlanRecipe)}
          pastWeeks={pastWeeks}
          likedCombinations={liked}
        />
      )}
    </>
  );
}
