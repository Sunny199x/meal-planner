import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorBox } from "@/components/ui";
import { describeDatabaseError, getDb } from "@/lib/db";
import type { RecipeRow, WeekPlanRow } from "@/lib/db/schema";
import { defaultWeekStart, readWeekStart, stockholmToday } from "@/lib/plan/dates";
import { getPlan } from "@/lib/plan/store";
import { toPlanRecipe } from "@/lib/plan/suggest";
import { getAllRecipes } from "@/lib/recipes/queries";
import { WeekHeader } from "../week-header";
import { ShoppingList } from "./shopping-list";

export default function ShoppingPage({ searchParams }: PageProps<"/week/shopping">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<p className="text-muted">Loading the shopping list…</p>}>
        <Shopping searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Shopping({ searchParams }: Pick<PageProps<"/week/shopping">, "searchParams">) {
  const { week } = await searchParams;
  await connection();
  const comingWeek = defaultWeekStart(stockholmToday());
  const weekStart = readWeekStart(Array.isArray(week) ? week[0] : week) ?? comingWeek;

  let plan: WeekPlanRow | null;
  let recipeRows: RecipeRow[];
  try {
    [plan, recipeRows] = await Promise.all([getPlan(await getDb(), weekStart), getAllRecipes()]);
  } catch (error) {
    return <ErrorBox>{describeDatabaseError(error)}</ErrorBox>;
  }

  return (
    <>
      <WeekHeader weekStart={weekStart} comingWeek={comingWeek} tab="/week/shopping" />
      {!plan || plan.dishes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-5 text-muted">
          The shopping list is made from the week&apos;s dinners.{" "}
          <Link href={`/week?week=${weekStart}`} className="text-terracotta underline">
            {plan ? "Choose the dinners first" : "Set up the week and choose the dinners first"}
          </Link>
          .
        </p>
      ) : (
        <ShoppingList
          key={weekStart}
          weekStart={weekStart}
          initial={{ setup: plan.setup, dishes: plan.dishes, shopping: plan.shopping, prep: plan.prep }}
          recipes={recipeRows.map(toPlanRecipe)}
        />
      )}
    </>
  );
}
