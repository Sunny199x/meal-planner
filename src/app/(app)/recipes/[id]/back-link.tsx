"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { lastListUrl } from "@/lib/recipes/list-query";

/** Goes back to the recipe list with the filters that were set there. */
export function BackToRecipes() {
  const href = useSyncExternalStore(
    () => () => {},
    lastListUrl,
    () => "/recipes",
  );
  return (
    <Link href={href} className="text-sm text-accent hover:underline">
      ← Back to recipes
    </Link>
  );
}
