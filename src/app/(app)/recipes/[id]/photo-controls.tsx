"use client";

import { useState } from "react";
import { removeRecipePhotoAction, setRecipePhotoAction } from "@/lib/recipes/actions";
import { shrinkPhoto } from "@/lib/recipes/shrink-photo";

/** Add, change or remove the recipe's photo. On a phone, "Add photo" offers the camera or the photo library. */
export function PhotoControls({ recipeId, hasPhoto }: { recipeId: string; hasPhoto: boolean }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
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

  const pill = "rounded-full border border-line px-3 py-1 text-sm hover:border-terracotta/50";
  return (
    <>
      <label className={`${pill} cursor-pointer ${busy ? "pointer-events-none opacity-60" : ""}`}>
        {busy ?? (hasPhoto ? "Change photo" : "Add photo")}
        <input type="file" accept="image/*" onChange={choose} disabled={busy !== null} className="sr-only" />
      </label>
      {hasPhoto && !busy && (
        <button type="button" onClick={remove} className={pill}>
          Remove photo
        </button>
      )}
      {error && (
        <p role="alert" className="w-full text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}
