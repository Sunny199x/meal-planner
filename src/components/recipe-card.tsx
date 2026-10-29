import Link from "next/link";
import type { RecipeSummary } from "@/lib/recipes/summary";
import { FavouriteButton } from "./favourite-button";
import { Chip, DIET_LABEL, formatMinutes, RecipeTile } from "./ui";

export function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  return (
    <article className="relative flex gap-3 rounded-2xl border border-line bg-paper p-3 shadow-sm transition hover:border-terracotta/40">
      <RecipeTile title={recipe.title} cuisine={recipe.cuisine} />
      <div className="min-w-0 flex-1 pr-9">
        <h2 className="font-medium leading-snug">
          {/* The link covers the whole card; the heart button sits above it. */}
          <Link href={`/recipes/${recipe.id}`} className="after:absolute after:inset-0 after:rounded-2xl">
            {recipe.title}
          </Link>
        </h2>
        <p className="mt-0.5 text-sm text-muted">
          {formatMinutes(recipe.timeTotalMin)} · {recipe.cuisine} · {DIET_LABEL[recipe.diet]}
        </p>
        <div className="mt-2 flex flex-wrap gap-1">
          {recipe.seafood === "contains" && <Chip tone="danger">Contains seafood</Chip>}
          {recipe.seafood === "may contain" && <Chip tone="danger">May contain fish</Chip>}
          {recipe.isTemplate && <Chip tone="warn">Illustrative example</Chip>}
          {recipe.proteinRich && <Chip tone="good">Protein-rich</Chip>}
          {recipe.carbFocused && <Chip>Carb-focused</Chip>}
          {recipe.freezerFriendly && <Chip>Freezer-friendly</Chip>}
          {recipe.goodAsLeftovers && <Chip>Good as leftovers</Chip>}
        </div>
      </div>
      <FavouriteButton
        id={recipe.id}
        isFavourite={recipe.isFavourite}
        className="absolute top-1 right-1 z-10"
      />
    </article>
  );
}
