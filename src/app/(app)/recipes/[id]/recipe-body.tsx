"use client";

import { useState } from "react";
import { Chip } from "@/components/ui";
import { formatQuantity } from "@/lib/recipes/format";
import type { ParsedIngredient } from "@/lib/recipes/parse-ingredient-line";
import { scaleLine, scaleStep } from "@/lib/recipes/scale";

type Item = ParsedIngredient & { group: string | null };

const MIN_PORTIONS = 0.5;
const MAX_PORTIONS = 40;

/** Ingredients and steps with a portions control; amounts in both follow the number of portions. */
export function RecipeBody({
  items,
  instructions,
  servings,
  initialPortions,
}: {
  items: Item[];
  instructions: string[];
  servings: number;
  initialPortions: number;
}) {
  const [portions, setPortions] = useState(initialPortions);
  const factor = portions / servings;
  const change = (by: number) => setPortions((p) => Math.min(MAX_PORTIONS, Math.max(MIN_PORTIONS, p + by)));
  const stepButton = "flex h-8 w-8 items-center justify-center rounded-full border border-line text-lg hover:border-accent/50 disabled:opacity-40";

  return (
    <div className="grid gap-5 lg:grid-cols-[2fr_3fr]">
      <Section title="Ingredients">
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
            <button type="button" onClick={() => setPortions(servings)} className="text-accent underline">
              Back to {servings} (the recipe)
            </button>
          )}
        </div>
        <IngredientList items={items} factor={factor} />
        {portions !== servings && (
          <p className="mt-3 text-xs text-muted">
            Amounts are scaled and rounded, here and in the steps (highlighted there). Times,
            temperatures, sizes and counts in the steps, and lines without an amount, stay as written.
          </p>
        )}
      </Section>

      <Section title="Instructions">
        {instructions.length ? (
          <ol className="space-y-3">
            {instructions.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-soft text-sm font-semibold text-accent-dark">
                  {i + 1}
                </span>
                <span className="pt-0.5">
                  {scaleStep(step, factor).map((part, j) =>
                    typeof part === "string" ? (
                      part
                    ) : (
                      <mark key={j} title={`${part.original} in the recipe`} className="rounded bg-note-light px-0.5 text-ink">
                        {part.text}
                      </mark>
                    ),
                  )}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-muted">No instructions written down.</p>
        )}
      </Section>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-5">
      <h2 className="mb-3 font-display text-xl font-extrabold tracking-tight">{title}</h2>
      {children}
    </section>
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
