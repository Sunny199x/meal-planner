import { connection } from "next/server";
import { Suspense } from "react";
import { RecipeForm } from "@/components/recipe-form";
import { ErrorBox } from "@/components/ui";
import { describeDatabaseError } from "@/lib/db";
import { EMPTY_FORM } from "@/lib/recipes/form";
import { createRecipeAction } from "@/lib/recipes/form-actions";
import { getFormSuggestions } from "@/lib/recipes/queries";

export default function NewRecipePage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-semibold">Add a recipe</h1>
      <div className="space-y-2 rounded-xl border border-line bg-paper px-4 py-3 text-sm text-muted">
        <p>
          Type or paste the recipe below. For a recipe from a website, an Instagram post or a YouTube video,
          paste its link under <strong className="text-ink">Link to the original</strong>; the recipe page
          then links back to it.
        </p>
        <p>
          <strong className="text-ink">Not available yet:</strong> reading the recipe automatically from a
          website link, and attaching photos. Both are planned for a later milestone. Instagram posts can&apos;t
          be read automatically, so for those the link plus typing is how it will stay.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted">Loading the form…</p>}>
        <NewRecipeForm />
      </Suspense>
    </div>
  );
}

async function NewRecipeForm() {
  await connection();
  let suggestions: Awaited<ReturnType<typeof getFormSuggestions>>;
  try {
    suggestions = await getFormSuggestions();
  } catch (error) {
    return <ErrorBox>{describeDatabaseError(error)}</ErrorBox>;
  }
  return (
    <RecipeForm
      initial={EMPTY_FORM}
      action={createRecipeAction}
      submitLabel="Save recipe"
      cancelHref="/"
      cuisines={suggestions.cuisines}
      prepNames={suggestions.prepNames}
    />
  );
}
