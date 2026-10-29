import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { describeDatabaseError, getDb } from "@/lib/db";
import { recipes } from "@/lib/db/schema";

const steps = [
  { label: "App skeleton on Vercel", done: true },
  { label: "Household passcode", done: true },
  { label: "Database and loading recipes from files", done: true },
  { label: "Browse, search and filter recipes", done: false },
  { label: "Add and edit recipes by hand", done: false },
  { label: "Polish and phone checks", done: false },
];

export default function Home() {
  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
        <p className="text-sm font-medium uppercase tracking-wide text-sage">
          Milestone 1 · Foundation
        </p>
        <h1 className="mt-1 font-display text-3xl font-semibold">Our recipes</h1>
        <Suspense fallback={<p className="mt-3 text-muted">Loading recipes…</p>}>
          <RecipeList />
        </Suspense>
      </section>

      <section className="rounded-2xl border border-line bg-paper p-6 shadow-sm">
        <h2 className="font-display text-xl font-semibold">Steps</h2>
        <ol className="mt-3 space-y-2">
          {steps.map((step, i) => (
            <li key={step.label} className="flex items-center gap-3">
              <span
                className={
                  step.done
                    ? "flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-sage text-sm font-semibold text-white"
                    : "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-line text-sm text-muted"
                }
                aria-hidden
              >
                {step.done ? "✓" : i + 1}
              </span>
              <span className={step.done ? "" : "text-muted"}>
                {step.label}
                {step.done && <span className="sr-only"> (done)</span>}
              </span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

async function RecipeList() {
  await connection();
  let rows: { id: string; title: string; isTemplate: boolean }[];
  try {
    const db = await getDb();
    rows = await db
      .select({ id: recipes.id, title: recipes.title, isTemplate: recipes.isTemplate })
      .from(recipes)
      .orderBy(recipes.title);
  } catch (error) {
    return (
      <p role="alert" className="mt-3 rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
        {describeDatabaseError(error)}
      </p>
    );
  }

  if (rows.length === 0) {
    return (
      <p className="mt-3 text-muted">
        No recipes yet. Go to{" "}
        <Link href="/settings" className="text-terracotta underline">
          Settings
        </Link>{" "}
        and press <strong>Load recipes from files</strong>.
      </p>
    );
  }

  return (
    <>
      <p className="mt-3 text-muted">
        {rows.length} {rows.length === 1 ? "recipe" : "recipes"} in the database. Browsing,
        search and filters arrive in the next step.
      </p>
      <ul className="mt-3 divide-y divide-line">
        {rows.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-2 py-2">
            <span>{row.title}</span>
            {row.isTemplate && (
              <span className="rounded-full bg-saffron-light px-2 py-0.5 text-xs">
                Illustrative example
              </span>
            )}
          </li>
        ))}
      </ul>
    </>
  );
}
