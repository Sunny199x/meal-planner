import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorBox } from "@/components/ui";
import { describeDatabaseError, getDb } from "@/lib/db";
import type { RecipeRow } from "@/lib/db/schema";
import type { GroceryListData } from "@/lib/groceries/list";
import { loadGroceryList } from "@/lib/groceries/store";
import { toPlanRecipe } from "@/lib/plan/suggest";
import { getAllRecipes } from "@/lib/recipes/queries";
import { GroceryList } from "./grocery-list";

export default function GroceriesPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Grocery list</h1>
      <Suspense fallback={<p className="text-muted">Loading the list…</p>}>
        <Groceries />
      </Suspense>
    </div>
  );
}

async function Groceries() {
  await connection();
  let list: GroceryListData;
  let recipeRows: RecipeRow[];
  try {
    [list, recipeRows] = await Promise.all([loadGroceryList(await getDb()), getAllRecipes()]);
  } catch (error) {
    return <ErrorBox>{describeDatabaseError(error)}</ErrorBox>;
  }
  return <GroceryList initial={list} recipes={recipeRows.map(toPlanRecipe)} />;
}
