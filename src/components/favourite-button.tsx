"use client";

import { useOptimistic, useTransition } from "react";
import { setFavourite } from "@/lib/recipes/actions";

export function FavouriteButton({
  id,
  isFavourite,
  className = "",
}: {
  id: string;
  isFavourite: boolean;
  className?: string;
}) {
  const [shown, setShown] = useOptimistic(isFavourite);
  const [, startTransition] = useTransition();

  return (
    <button
      type="button"
      aria-pressed={shown}
      aria-label={shown ? "Remove from favourites" : "Add to favourites"}
      title={shown ? "Remove from favourites" : "Add to favourites"}
      onClick={() =>
        startTransition(async () => {
          setShown(!shown);
          await setFavourite(id, !shown);
        })
      }
      className={`flex h-11 w-11 items-center justify-center rounded-full hover:bg-soft ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-6 w-6" aria-hidden>
        <path
          d="M12 20.5s-7.5-4.6-9.2-9.3C1.6 7.9 3.7 4.5 7.1 4.5c2 0 3.6 1.1 4.9 2.9 1.3-1.8 2.9-2.9 4.9-2.9 3.4 0 5.5 3.4 4.3 6.7-1.7 4.7-9.2 9.3-9.2 9.3Z"
          fill={shown ? "var(--color-ink)" : "none"}
          stroke={shown ? "var(--color-ink)" : "var(--color-muted)"}
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
