import { count } from "drizzle-orm";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { signOut } from "@/lib/auth/actions";
import { databaseKind, describeDatabaseError, getDb } from "@/lib/db";
import { recipes } from "@/lib/db/schema";
import { GUIDANCE, guidanceFor, SWEDISH_ADVICE } from "@/lib/plan/food-safety";
import { prepKey } from "@/lib/plan/ingredients";
import { getPrepLimits } from "@/lib/plan/prep-limits";
import { checkRecipes } from "@/lib/recipes/health";
import { getAllRecipes, getImportHousehold } from "@/lib/recipes/queries";
import { PrepLimits, type PrepLimitRow } from "./prep-limits";
import { RecipeFilesPanel } from "./recipe-files-panel";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-settings">Settings</h1>

      <Section title="Database">
        <Suspense fallback={<p className="text-muted">Checking the database…</p>}>
          <DatabaseStatus />
        </Suspense>
      </Section>

      <Section title="Prep limits" id="prep-limits">
        <p className="mb-3 text-sm text-muted">
          How far ahead each make-ahead task may be done. The prep list puts a task on the latest prep day within its
          limit, or on the day of the dinner. Where the guidance below covers a task, you can only choose the same or
          stricter. A task it doesn&apos;t cover is done on the day until you set a limit. The app never makes up how
          long food keeps.
        </p>
        <Suspense fallback={<p className="text-muted">Loading…</p>}>
          <PrepLimitsSection />
        </Suspense>
        <PrepGuidance />
      </Section>

      <Section title="Recipe check" id="recipe-check">
        <p className="mb-3 text-sm text-muted">
          Recipes that won&apos;t work well with the suggestions yet, and make-ahead tasks that are probably the same
          but named differently (only identical names share a batch).
        </p>
        <Suspense fallback={<p className="text-muted">Checking…</p>}>
          <RecipeCheck />
        </Suspense>
      </Section>

      <Section title="Recipes from files">
        <RecipeFilesPanel />
      </Section>

      <Section title="This device">
        <p className="mb-3 text-sm text-muted">
          Signing out only affects this browser. You&apos;ll need the household passcode to get
          back in.
        </p>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-xl border border-line px-4 py-3 font-medium hover:bg-soft"
          >
            Sign out
          </button>
        </form>
      </Section>
    </div>
  );
}

function Section({ title, id, children }: { title: string; id?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-4 rounded-2xl border border-line bg-paper p-5 sm:p-6">
      <h2 className="mb-3 font-display text-xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
  );
}

async function DatabaseStatus() {
  await connection();
  const kind = databaseKind();
  let total: number;
  try {
    const db = await getDb();
    [{ total }] = await db.select({ total: count() }).from(recipes);
  } catch (error) {
    return (
      <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
        {describeDatabaseError(error)}
      </p>
    );
  }
  return (
    <p>
      <span className="text-good">✓</span> Connected to{" "}
      {kind === "neon"
        ? "the Neon database"
        : "the local stand-in database (this only happens during development)"}
      . It holds {total} {total === 1 ? "recipe" : "recipes"}.
    </p>
  );
}

async function PrepLimitsSection() {
  await connection();
  let rows: PrepLimitRow[];
  try {
    const db = await getDb();
    const [household, limits] = await Promise.all([getImportHousehold(), getPrepLimits(db)]);
    rows = household.makeAhead
      .map((task) => {
        const key = prepKey(task.name);
        return { key, name: task.name, recipes: task.recipes, own: limits[key] ?? null, guidance: guidanceFor(task.name) };
      })
      .sort((a, b) => b.recipes - a.recipes || a.name.localeCompare(b.name));
  } catch (error) {
    return (
      <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
        {describeDatabaseError(error)}
      </p>
    );
  }
  return <PrepLimits rows={rows} />;
}

/** The guidance behind the limits, in its own words with links. */
function PrepGuidance() {
  const link = (url: string, text: string) => (
    <a href={url} target="_blank" rel="noopener noreferrer" className="text-accent underline">
      {text}
    </a>
  );
  return (
    <div className="mt-4 space-y-2 border-t border-line pt-3 text-sm">
      <h3 className="font-medium">The guidance</h3>
      <p className="text-muted">
        Applied to make-ahead tasks whose name says the food is cooked (cook, roast, bake, simmer, fry…). Raw prep
        such as chopping, pickling or marinating isn&apos;t covered.
      </p>
      <ul className="space-y-2">
        {GUIDANCE.map((rule) => (
          <li key={rule.sourceUrl}>
            <span className="font-medium">
              {rule.days} {rule.days === 1 ? "day" : "days"} ahead:
            </span>{" "}
            &ldquo;{rule.quote}&rdquo; ({link(rule.sourceUrl, rule.source)})
            {rule.tip && <span className="block text-muted">{rule.tip}</span>}
          </li>
        ))}
      </ul>
      <p className="text-muted">
        {link(SWEDISH_ADVICE.sourceUrl, SWEDISH_ADVICE.source)}, the Swedish Food Agency, gives no limit per food:
        &ldquo;{SWEDISH_ADVICE.quote}&rdquo; (&ldquo;{SWEDISH_ADVICE.translation}&rdquo;) {SWEDISH_ADVICE.more} The app
        uses the UK agency&apos;s stricter day limits because they can be planned with.
      </p>
    </div>
  );
}

async function RecipeCheck() {
  await connection();
  let result: ReturnType<typeof checkRecipes>;
  try {
    result = checkRecipes(await getAllRecipes());
  } catch (error) {
    return (
      <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
        {describeDatabaseError(error)}
      </p>
    );
  }
  if (result.recipes.length === 0 && result.similarTasks.length === 0) {
    return <p><span className="text-good">✓</span> Every recipe is ready for the suggestions.</p>;
  }
  return (
    <div className="space-y-4 text-sm">
      {result.similarTasks.length > 0 && (
        <div>
          <p className="font-medium">Probably the same make-ahead task under different names:</p>
          <ul className="mt-1 space-y-2">
            {result.similarTasks.map((group, i) => (
              <li key={i} className="rounded-xl bg-note-light px-3 py-2">
                {group.names.map((n, j) => (
                  <span key={n.name}>
                    {j > 0 && " · "}
                    <strong>{n.name}</strong> ({n.recipes.map((r) => r.title).join(", ")})
                  </span>
                ))}
                <span className="block text-muted">Use one name in all of them (edit the recipes) so they can share a batch.</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {result.recipes.length > 0 && (
        <ul className="divide-y divide-line">
          {result.recipes.map((recipe) => (
            <li key={recipe.id} className="py-2">
              <Link href={`/recipes/${recipe.id}`} className="font-medium hover:text-accent">
                {recipe.title}
              </Link>
              {recipe.fromFile && <span className="text-muted"> · from a recipe file</span>}
              <ul className="mt-0.5 ml-5 list-disc text-muted">
                {recipe.issues.map((issue) => (
                  <li key={issue}>{issue}</li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
