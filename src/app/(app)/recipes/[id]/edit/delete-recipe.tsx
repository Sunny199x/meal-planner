"use client";

import { useState, useTransition } from "react";
import { deleteRecipeAction } from "@/lib/recipes/form-actions";
import { lastListUrl } from "@/lib/recipes/list-query";

export function DeleteRecipe({ id, title, fromFile }: { id: string; title: string; fromFile: string | null }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, startTransition] = useTransition();

  return (
    <section className="space-y-3 rounded-2xl border border-danger/40 bg-paper p-5">
      <h2 className="font-display text-xl font-semibold">Delete recipe</h2>
      {fromFile && (
        <p className="text-sm text-muted">
          This recipe comes from <code>seed-recipes/{fromFile}.md</code>. It will come back the next time you
          press &quot;Load recipes from files&quot;, unless you also delete that file on GitHub.
        </p>
      )}
      {!confirming ? (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="rounded-xl border border-danger px-4 py-3 font-medium text-danger hover:bg-danger-light"
        >
          Delete this recipe
        </button>
      ) : (
        <div className="space-y-3">
          <p className="font-medium">Delete “{title}” for both of you? This can&apos;t be undone.</p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={deleting}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteRecipeAction(id);
                  if (result.error) setError(result.error);
                  // A full page load, so the list doesn't briefly show the deleted recipe.
                  else window.location.assign(lastListUrl());
                })
              }
              className="rounded-xl bg-danger px-4 py-3 font-medium text-white disabled:opacity-60"
            >
              {deleting ? "Deleting…" : "Yes, delete"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-xl border border-line px-4 py-3"
            >
              Keep it
            </button>
          </div>
        </div>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
