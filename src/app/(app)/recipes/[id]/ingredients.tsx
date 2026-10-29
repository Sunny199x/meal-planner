"use client";

import { useState } from "react";
import { Chip } from "@/components/ui";
import { formatQuantity } from "@/lib/recipes/format";
import type { ParsedIngredient } from "@/lib/recipes/parse-ingredient-line";
import { scaleLine } from "@/lib/recipes/scale";

type Item = ParsedIngredient & { group: string | null };

const MIN_PORTIONS = 0.5;
const MAX_PORTIONS = 40;

/** The ingredient list with a portions control; amounts follow the number of portions. */
export function Ingredients({
  items,
  servings,
  initialPortions,
}: {
  items: Item[];
  servings: number;
  initialPortions: number;
}) {
  const [portions, setPortions] = useState(initialPortions);
  const factor = portions / servings;
  const change = (by: number) => setPortions((p) => Math.min(MAX_PORTIONS, Math.max(MIN_PORTIONS, p + by)));
  const stepButton = "flex h-8 w-8 items-center justify-center rounded-full border border-line text-lg hover:border-terracotta/50 disabled:opacity-40";

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => change(-0.5)} disabled={portions <= MIN_PORTIONS} aria-label="Fewer portions" className={stepButton}>
            −
          </button>
          <span className="min-w-24 text-center font-medium" aria-live="polite">
            {formatQuantity(portions)} {portions === 1 ? "portion" : "portions"}
          </span>
          <button type="button" onClick={() => change(0.5)} disabled={portions >= MAX_PORTIONS} aria-label="More portions" className={stepButton}>
            +
          </button>
        </div>
        {portions === servings ? (
          <span className="text-muted">as the recipe is written</span>
        ) : (
          <button type="button" onClick={() => setPortions(servings)} className="text-terracotta underline">
            Back to {servings} (the recipe)
          </button>
        )}
      </div>
      <IngredientList items={items} factor={factor} />
      {portions !== servings && (
        <p className="mt-3 text-xs text-muted">
          Amounts are scaled and rounded. Lines without an amount stay as written, and amounts in the
          steps are still for {servings} portions.
        </p>
      )}
    </>
  );
}

function IngredientList({ items, factor }: { items: Item[]; factor: number }) {
  const groups: { name: string | null; items: Item[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.name === item.group) last.items.push(item);
    else groups.push({ name: item.group, items: [item] });
  }
  return (
    <div className="space-y-4">
      {groups.map((group, g) => (
        <div key={g}>
          {group.name && <h3 className="mb-1 font-medium">{group.name}</h3>}
          <ul className="divide-y divide-line">
            {group.items.map((item, i) => {
              const { text, note } = scaleLine(item, factor);
              return (
                <li key={i} className="py-2">
                  <span>{text}</span>
                  {note && <span className="text-muted">, {note}</span>}
                  {item.optional && (
                    <span className="ml-2">
                      <Chip>optional</Chip>
                    </span>
                  )}
                  {item.problems.map((problem) => (
                    <span key={problem} className="mt-1 block text-xs text-danger">
                      {problem}
                    </span>
                  ))}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}
