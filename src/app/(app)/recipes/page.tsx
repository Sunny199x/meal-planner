import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorBox } from "@/components/ui";
import { describeDatabaseError } from "@/lib/db";
import type { RecipeRow } from "@/lib/db/schema";
import { getAllRecipes } from "@/lib/recipes/queries";
import { toSummary } from "@/lib/recipes/summary";
import { RecipeBrowser } from "./recipe-browser";

export default function RecipesPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-3xl font-semibold">Recipes</h1>
        <div className="flex gap-2">
          <Link
            href="/recipes/import"
            className="rounded-xl border border-terracotta px-4 py-2 text-sm font-medium text-terracotta hover:bg-cream"
          >
            Import
          </Link>
          <Link
            href="/recipes/new"
            className="rounded-xl bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-dark"
          >
            + Add recipe
          </Link>
        </div>
      </div>
      <Suspense fallback={<CollectionSkeleton />}>
        <Collection />
      </Suspense>
    </div>
  );
}

async function Collection() {
  await connection();
  let rows: RecipeRow[];
  try {
    rows = await getAllRecipes();
  } catch (error) {
    return <ErrorBox>{describeDatabaseError(error)}</ErrorBox>;
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-line bg-paper p-8 text-center">
        <p className="font-medium">No recipes yet.</p>
        <p className="mt-2 text-muted">
          Go to{" "}
          <Link href="/settings" className="text-terracotta underline">
            Settings
          </Link>{" "}
          and press <strong>Load recipes from files</strong>, or{" "}
          <Link href="/recipes/new" className="text-terracotta underline">
            add one by hand
          </Link>
          .
        </p>
      </div>
    );
  }

  return <RecipeBrowser recipes={rows.map(toSummary)} />;
}

function CollectionSkeleton() {
  return (
    <div className="space-y-3" aria-label="Loading recipes">
      <div className="h-12 animate-pulse rounded-xl bg-line/60" />
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-2xl bg-line/40" />
        ))}
      </div>
    </div>
  );
}
