import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FavouriteButton } from "@/components/favourite-button";
import { Chip, DIET_LABEL, ErrorBox, formatMinutes, RecipeTile } from "@/components/ui";
import { describeDatabaseError } from "@/lib/db";
import type { RecipeRow } from "@/lib/db/schema";
import { readWeekStart } from "@/lib/plan/dates";
import {
  carbLabel,
  CARB_RULE_TEXT,
  LABEL_DISCLAIMER,
  proteinLabel,
  PROTEIN_RULE_TEXT,
  type LabelResult,
} from "@/lib/recipes/labels";
import { parseIngredientLine } from "@/lib/recipes/parse-ingredient-line";
import { photoUrl } from "@/lib/recipes/photo-url";
import { getRecipe } from "@/lib/recipes/queries";
import { checkRecipeForSeafood } from "@/lib/recipes/seafood";
import { describeSourceLink } from "@/lib/recipes/source-link";
import { BackToRecipes } from "./back-link";
import { PhotoControls } from "./photo-controls";
import { RecipeBody, Section } from "./recipe-body";
import { SavedNotice } from "./saved-notice";

export default function RecipePage({ params, searchParams }: PageProps<"/recipes/[id]">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<p className="text-muted">Loading recipe…</p>}>
        <RecipeDetail params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

/** Portions asked for in the address (from the week plan), if sensible. */
function readPortions(value: string | string[] | undefined): number | null {
  const portions = Number(Array.isArray(value) ? value[0] : value);
  return Number.isFinite(portions) && portions >= 0.5 && portions <= 40 ? Math.round(portions * 4) / 4 : null;
}

async function RecipeDetail({ params, searchParams }: PageProps<"/recipes/[id]">) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const week = readWeekStart(Array.isArray(query.week) ? query.week[0] : query.week);
  const back = week ? (
    <Link href={`/week?week=${week}`} className="text-sm text-accent hover:underline">
      ← Back to the week
    </Link>
  ) : (
    <BackToRecipes />
  );
  let recipe: RecipeRow | null;
  try {
    recipe = await getRecipe(id);
  } catch (error) {
    return (
      <>
        {back}
        <ErrorBox>{describeDatabaseError(error)}</ErrorBox>
      </>
    );
  }
  if (!recipe) notFound();

  const parsed = recipe.ingredients.map((i) => ({ ...parseIngredientLine(i.line), group: i.group }));
  const seafood = checkRecipeForSeafood({ title: recipe.title, ingredients: parsed });
  const protein = proteinLabel(parsed, recipe.servings);
  const carb = carbLabel(parsed, recipe.servings);
  const sourceLink = recipe.sourceUrl ? describeSourceLink(recipe.sourceUrl) : null;
  const photo = photoUrl(recipe.id, recipe.photoVersion);

  return (
    <article className="space-y-5">
      {back}
      <SavedNotice />
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- photos are already shrunk and served by the app
        <img src={photo} alt={recipe.title} className="aspect-[4/3] w-full rounded-2xl object-cover sm:aspect-[16/7]" />
      )}
      <header className="flex gap-4">
        {!photo && <RecipeTile title={recipe.title} cuisine={recipe.cuisine} size="lg" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="font-display text-2xl leading-tight font-extrabold tracking-tight sm:text-3xl">{recipe.title}</h1>
            <FavouriteButton id={recipe.id} isFavourite={recipe.isFavourite} className="-mt-1 -mr-2 shrink-0" />
          </div>
          <p className="mt-1 text-muted">
            {recipe.cuisine} · {DIET_LABEL[recipe.diet]}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Link
              href={`/recipes/${recipe.id}/edit`}
              className="rounded-full border border-line px-3 py-1 text-sm hover:border-accent/50"
            >
              Edit
            </Link>
            <PhotoControls recipeId={recipe.id} hasPhoto={photo !== null} />
          </div>
        </div>
      </header>

      {recipe.isTemplate && (
        <p className="rounded-xl bg-note-light px-4 py-3 text-sm">
          <strong>Illustrative example.</strong> Written by Claude to show the recipe format and not
          tested in a kitchen. Replace it with your own recipes.
        </p>
      )}
      {seafood.length > 0 && (
        <div role="alert" className="rounded-xl bg-danger-light px-4 py-3 text-sm text-danger">
          {seafood.some((f) => f.level === "contains") ? (
            <p>
              <strong>Contains seafood</strong> ({seafood.filter((f) => f.level === "contains").map((f) => f.text).join(", ")}).
              The household rule is no seafood, so this recipe will never be suggested.
            </p>
          ) : (
            <p>
              <strong>May contain fish:</strong> {seafood.map((f) => f.text).join(", ")}. Check the label,
              or use a vegetarian version.
            </p>
          )}
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-line bg-paper p-4 text-sm sm:grid-cols-4">
        <Fact label="Time">
          {formatMinutes(recipe.timeTotalMin)}
          {recipe.timeActiveMin !== null && (
            <span className="block text-muted">{formatMinutes(recipe.timeActiveMin)} hands-on</span>
          )}
        </Fact>
        <Fact label="Makes">{recipe.servings} servings</Fact>
        <Fact label="Freezer">{recipe.freezerFriendly ? "Freezes well" : "Not for freezing"}</Fact>
        <Fact label="Leftovers">{recipe.goodAsLeftovers ? "Good next day" : "Best eaten fresh"}</Fact>
      </dl>

      <p className="text-sm text-muted">
        Source: {recipe.source}
        {sourceLink && (
          <>
            {" · "}
            <a href={recipe.sourceUrl!} target="_blank" rel="noopener noreferrer" className="text-accent underline">
              {sourceLink.label}
            </a>
          </>
        )}
      </p>

      <Section title="Labels">
        <ul className="space-y-2 text-sm">
          <LabelLine name="Protein-rich" result={protein} />
          <LabelLine name="Carb-focused" result={carb} />
        </ul>
        <details className="mt-3 text-sm text-muted">
          <summary className="cursor-pointer text-ink">How are these decided?</summary>
          <div className="mt-2 space-y-2">
            <p>{PROTEIN_RULE_TEXT}</p>
            <p>{CARB_RULE_TEXT}</p>
            <p>{LABEL_DISCLAIMER}</p>
          </div>
        </details>
        {recipe.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {recipe.tags.map((tag) => (
              <Chip key={tag}>#{tag}</Chip>
            ))}
          </div>
        )}
      </Section>

      <RecipeBody
        items={parsed}
        instructions={recipe.instructions}
        servings={recipe.servings}
        initialPortions={readPortions(query.portions) ?? recipe.servings}
      />

      {recipe.makeAhead.length > 0 && (
        <Section title="Make ahead">
          <p className="mb-3 text-sm text-muted">
            Things that can be done on Sunday. Recipes that use the same task name can share a batch.
          </p>
          <ul className="space-y-2">
            {recipe.makeAhead.map((task, i) => (
              <li key={i}>
                <strong>{task.name}</strong>
                {task.description && <>: {task.description}</>}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {recipe.notes && (
        <Section title="Notes">
          <div className="space-y-2">
            {recipe.notes.split(/\n{2,}/).map((paragraph, i) => (
              <p key={i} className="whitespace-pre-line">
                {paragraph}
              </p>
            ))}
          </div>
        </Section>
      )}
    </article>
  );
}

function Fact({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs tracking-wide text-muted uppercase">{label}</dt>
      <dd className="mt-0.5 font-medium">{children}</dd>
    </div>
  );
}

function LabelLine({ name, result }: { name: string; result: LabelResult }) {
  return (
    <li>
      <span className={result.applies ? "font-medium text-good" : "font-medium text-muted"}>
        {result.applies ? "✓" : "✗"} {name}
      </span>
      {result.counted.length > 0 && <span className="text-muted">: {result.counted.join("; ")}</span>}
      {result.counted.length === 0 && result.notCounted.length === 0 && (
        <span className="text-muted">: nothing to count</span>
      )}
      {result.notCounted.length > 0 && (
        <span className="block text-muted">
          Not counted because there is no weight: {result.notCounted.join("; ")}. Add a weight such as
          “(600 g)” to include it.
        </span>
      )}
    </li>
  );
}
