"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { LAST_LIST_QUERY_KEY } from "@/lib/recipes/list-query";

function readLastQuery(): string {
  try {
    return sessionStorage.getItem(LAST_LIST_QUERY_KEY) ?? "";
  } catch {
    return "";
  }
}

/** Goes back to the recipe list with the filters that were set there. */
export function BackToRecipes() {
  const query = useSyncExternalStore(
    () => () => {},
    readLastQuery,
    () => "",
  );
  return (
    <Link href={query ? `/?${query}` : "/"} className="text-sm text-terracotta hover:underline">
      ← Back to recipes
    </Link>
  );
}
