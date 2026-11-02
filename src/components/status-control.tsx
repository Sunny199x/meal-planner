"use client";

import { useState, useTransition } from "react";
import { setRecipeStatusAction } from "@/lib/recipes/actions";
import { RECIPE_STATUSES, STATUS_HINT, STATUS_LABEL, type RecipeStatus } from "@/lib/recipes/types";

/** Whether a recipe is in the rotation, new to try, or not suggested; one tap to change. */
export function StatusControl({ id, status }: { id: string; status: RecipeStatus }) {
  const [current, setCurrent] = useState(status);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();

  function choose(next: RecipeStatus) {
    const before = current;
    setCurrent(next);
    startSaving(async () => {
      const result = await setRecipeStatusAction([id], next);
      if (result.error) {
        setCurrent(before);
        setError(result.error);
      } else {
        setError(null);
      }
    });
  }

  return (
    <div className="space-y-1">
      <div role="group" aria-label="Weekly suggestions" className="flex flex-wrap gap-1 rounded-full bg-line p-1">
        {RECIPE_STATUSES.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={current === value}
            disabled={saving}
            onClick={() => current !== value && choose(value)}
            className={`flex-1 rounded-full px-3 py-1.5 text-sm whitespace-nowrap ${
              current === value ? "bg-paper font-medium" : "text-muted hover:text-ink"
            }`}
          >
            {STATUS_LABEL[value]}
          </button>
        ))}
      </div>
      <p className="text-sm text-muted">{STATUS_HINT[current]}</p>
      {error && (
        <p role="alert" className="text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
