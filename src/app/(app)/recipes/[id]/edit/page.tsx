import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { RecipeForm } from "@/components/recipe-form";
import { ErrorBox } from "@/components/ui";
import { describeDatabaseError } from "@/lib/db";
import type { RecipeRow } from "@/lib/db/schema";
import { recipeToFormValues } from "@/lib/recipes/form";
import { updateRecipeAction } from "@/lib/recipes/form-actions";
import { getFormSuggestions, getRecipe } from "@/lib/recipes/queries";
import { DeleteRecipe } from "./delete-recipe";

export default function EditRecipePage({ params }: PageProps<"/recipes/[id]/edit">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<p className="text-muted">Loading recipe…</p>}>
        <EditRecipe params={params} />
      </Suspense>
    </div>
  );
}

async function EditRecipe({ params }: Pick<PageProps<"/recipes/[id]/edit">, "params">) {
  const { id } = await params;
  let recipe: RecipeRow | null;
  let suggestions: Awaited<ReturnType<typeof getFormSuggestions>>;
  try {
    [recipe, suggestions] = await Promise.all([getRecipe(id), getFormSuggestions()]);
  } catch (error) {
    return <ErrorBox>{describeDatabaseError(error)}</ErrorBox>;
  }
  if (!recipe) notFound();

  return (
    <>
      <Link href={`/recipes/${recipe.id}`} className="text-sm text-accent hover:underline">
        ← Back to the recipe
      </Link>
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-recipes">Edit recipe</h1>
      {recipe.origin === "file" && (
        <p className="rounded-xl bg-note-light px-4 py-3 text-sm">
          This recipe comes from the file <code>seed-recipes/{recipe.fileSlug}.md</code>.{" "}
          {recipe.editedInApp
            ? "It has been edited in the app, so loading recipes from files no longer changes it."
            : "Once you save changes here, loading recipes from files will no longer change it."}
        </p>
      )}
      <RecipeForm
        key={recipe.updatedAt.toISOString()}
        initial={recipeToFormValues(recipe)}
        action={updateRecipeAction.bind(null, recipe.id)}
        submitLabel="Save changes"
        cancelHref={`/recipes/${recipe.id}`}
        cuisines={suggestions.cuisines}
        prepNames={suggestions.prepNames}
      />
      <DeleteRecipe
        id={recipe.id}
        title={recipe.title}
        fromFile={recipe.origin === "file" ? recipe.fileSlug : null}
      />
    </>
  );
}
