"use client";

import Link from "next/link";
import { useMemo } from "react";
import { changedNote, Group, ItemRow, weekStatus, withTick } from "@/components/shopping-rows";
import { tickShoppingAction, type SavedWeek } from "@/lib/plan/actions";
import { planPortions } from "@/lib/plan/portions";
import { buildShoppingList, SECTIONS, type ShoppingItem } from "@/lib/plan/shopping";
import type { PlanRecipe } from "@/lib/plan/suggest";
import { useLiveWeek } from "../use-live-week";

export function ShoppingList({
  weekStart,
  initial,
  recipes,
  onGroceryList,
}: {
  weekStart: string;
  initial: SavedWeek;
  recipes: PlanRecipe[];
  /** This week's dinners also feed the grocery list on the home page. */
  onGroceryList: boolean;
}) {
  const { week, error, send } = useLiveWeek(weekStart, initial);
  const { setup, dishes, shopping } = week;

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const known = useMemo(() => dishes.filter((d) => byId.has(d.recipeId)), [dishes, byId]);
  const items = useMemo(() => buildShoppingList(known, byId, planPortions(setup, known, byId)), [known, byId, setup]);

  const tick = (list: "bought" | "have", key: string, amount: string | null) =>
    send(
      (w) => ({ ...w, shopping: withTick(w.shopping, list, key, amount) }),
      () =>
        tickShoppingAction(weekStart, list, key, amount).then((r) => ({
          error: r.error,
          apply: r.shopping ? (w: SavedWeek) => ({ ...w, shopping: r.shopping! }) : undefined,
        })),
    );

  const basket = items.filter((i) => weekStatus(shopping, i) === "basket");
  const home = items.filter((i) => weekStatus(shopping, i) === "home");
  const todoCount = items.length - basket.length - home.length;

  const row = (item: ShoppingItem) => {
    const status = weekStatus(shopping, item);
    return (
      <ItemRow
        key={item.key}
        item={item}
        status={status}
        note={changedNote(shopping, item)}
        onBought={(bought) => tick("bought", item.key, bought ? item.measure : null)}
        onHave={() => tick("have", item.key, status === "home" ? null : item.measure)}
      />
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {todoCount} to buy · {basket.length} in the basket · {home.length} already at home. From {known.length}{" "}
        {known.length === 1 ? "dish" : "dishes"}, with lunch boxes and freezer portions.
      </p>
      {onGroceryList && (
        <p className="rounded-xl bg-sage-light px-4 py-3 text-sm">
          These are also on the{" "}
          <Link href="/" className="font-medium text-sage underline">
            grocery list
          </Link>
          , together with anything you add there. A tick in either place shows in both.
        </p>
      )}
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          Not saved: {error}
        </p>
      )}

      {SECTIONS.map((section) => {
        const rows = items.filter((i) => i.section === section && weekStatus(shopping, i) === "todo");
        if (rows.length === 0) return null;
        return (
          <Group
            key={section}
            title={section}
            note={section === "Check the cupboard" ? "Usually at home already. Tap “Have it” for what you have." : undefined}
          >
            {rows.map(row)}
          </Group>
        );
      })}
      {todoCount === 0 && (
        <p className="rounded-2xl border border-sage/40 bg-sage-light p-5 font-medium text-sage">Everything is ticked off.</p>
      )}

      {basket.length > 0 && (
        <details className="rounded-2xl border border-line bg-paper p-4">
          <summary className="cursor-pointer font-medium">In the basket ({basket.length})</summary>
          <ul className="mt-2 divide-y divide-line">{basket.map(row)}</ul>
        </details>
      )}
      {home.length > 0 && (
        <details className="rounded-2xl border border-line bg-paper p-4">
          <summary className="cursor-pointer font-medium">Already at home ({home.length})</summary>
          <ul className="mt-2 divide-y divide-line">{home.map(row)}</ul>
        </details>
      )}

      <p className="text-xs text-muted">
        Amounts are added up across the week&apos;s dishes and rounded up to what you can buy. Things that
        can&apos;t honestly be added together, like a can and grams, are shown side by side. Ticks are shared
        with the other phone and show there when you switch back to the app. No prices: the app doesn&apos;t
        know them.
      </p>
    </div>
  );
}
