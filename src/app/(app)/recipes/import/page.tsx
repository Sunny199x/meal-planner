import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorBox } from "@/components/ui";
import { describeDatabaseError } from "@/lib/db";
import { readerReady, youtubeReady } from "@/lib/import/actions";
import { getFormSuggestions } from "@/lib/recipes/queries";
import { ImportFlow } from "./import-flow";

export default function ImportPage() {
  return (
    <div className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold tracking-tight text-recipes">Import a recipe</h1>
      <Suspense fallback={<p className="text-muted">Loading…</p>}>
        <Import />
      </Suspense>
    </div>
  );
}

async function Import() {
  await connection();
  let suggestions: Awaited<ReturnType<typeof getFormSuggestions>>;
  try {
    suggestions = await getFormSuggestions();
  } catch (error) {
    return <ErrorBox>{describeDatabaseError(error)}</ErrorBox>;
  }
  return (
    <ImportFlow
      cuisines={suggestions.cuisines}
      prepNames={suggestions.prepNames}
      ready={await readerReady()}
      youtube={await youtubeReady()}
    />
  );
}
