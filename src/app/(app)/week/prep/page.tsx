import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorBox } from "@/components/ui";
import { describeDatabaseError, getDb } from "@/lib/db";
import type { RecipeRow, WeekPlanRow } from "@/lib/db/schema";
import { defaultWeekStart, readWeekStart, stockholmToday } from "@/lib/plan/dates";
import { getPrepLimits } from "@/lib/plan/prep-limits";
import { getPlan } from "@/lib/plan/store";
import { toPlanRecipe } from "@/lib/plan/suggest";
import { getAllRecipes } from "@/lib/recipes/queries";
import { WeekHeader } from "../week-header";
import { PrepList } from "./prep-list";

export default function PrepPage({ searchParams }: PageProps<"/week/prep">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<p className="text-muted">Loading the prep list…</p>}>
        <Prep searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Prep({ searchParams }: Pick<PageProps<"/week/prep">, "searchParams">) {
  const { week } = await searchParams;
  await connection();
  const comingWeek = defaultWeekStart(stockholmToday());
  const weekStart = readWeekStart(Array.isArray(week) ? week[0] : week) ?? comingWeek;

  let plan: WeekPlanRow | null;
  let recipeRows: RecipeRow[];
  let limits: Record<string, number>;
  try {
    const db = await getDb();
    [plan, recipeRows, limits] = await Promise.all([getPlan(db, weekStart), getAllRecipes(), getPrepLimits(db)]);
  } catch (error) {
    return <ErrorBox>{describeDatabaseError(error)}</ErrorBox>;
  }

  return (
    <>
      <WeekHeader weekStart={weekStart} comingWeek={comingWeek} tab="/week/prep" />
      {!plan || plan.dishes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-5 text-muted">
          The prep list is made from the week&apos;s dinners.{" "}
          <Link href={`/week?week=${weekStart}`} className="text-accent underline">
            {plan ? "Choose the dinners first" : "Set up the week and choose the dinners first"}
          </Link>
          .
        </p>
      ) : (
        <PrepList
          key={weekStart}
          weekStart={weekStart}
          initial={{ setup: plan.setup, dishes: plan.dishes, shopping: plan.shopping, prep: plan.prep }}
          recipes={recipeRows.map(toPlanRecipe)}
          limits={limits}
        />
      )}
    </>
  );
}
