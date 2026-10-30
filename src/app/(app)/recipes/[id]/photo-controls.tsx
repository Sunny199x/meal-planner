"use client";

import { useState } from "react";
import { PhotoMenu } from "@/components/photo-menu";
import { removeRecipePhotoAction, setRecipePhotoAction } from "@/lib/recipes/actions";
import { shrinkPhoto } from "@/lib/recipes/shrink-photo";

/** Add, change or remove the recipe's photo, from one button with a small menu (see PhotoMenu). */
export function PhotoControls({ recipeId, hasPhoto }: { recipeId: string; hasPhoto: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose([file]: File[]) {
    if (!file) return;
    setBusy("Saving photo…");
    setError(null);
    try {
      const form = new FormData();
      form.set("id", recipeId);
      form.set("photo", await shrinkPhoto(file), "photo.jpg");
      const result = await setRecipePhotoAction(form);
      if (result.error) setError(result.error);
      // A full reload shows the new photo everywhere, not a remembered older page.
      else window.location.reload();
    } catch (problem) {
      setError(problem instanceof Error ? problem.message : "Couldn't use that photo.");
    } finally {
      setBusy(null);
    }
  }

  async function remove() {
    setBusy("Removing photo…");
    setError(null);
    const result = await removeRecipePhotoAction(recipeId);
    if (result.error) {
      setError(result.error);
      setBusy(null);
    } else window.location.reload();
  }

  const pill = "rounded-full border border-line px-3 py-1 text-sm hover:border-accent/50";
  return (
    <>
      {busy ? (
        <span className={`${pill} opacity-60`}>{busy}</span>
      ) : (
        <PhotoMenu onFiles={choose} extra={hasPhoto ? [{ label: "Remove photo", onSelect: remove }] : []} className={pill}>
          {hasPhoto ? "Photo" : "Add photo"}
        </PhotoMenu>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
