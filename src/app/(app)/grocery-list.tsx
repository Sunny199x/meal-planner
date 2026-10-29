"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { changedNote, Group, ItemRow, weekStatus, withTick, type RowStatus, type ShoppingRow } from "@/components/shopping-rows";
import {
  addGroceryItemAction,
  clearBoughtGroceriesAction,
  loadGroceryListAction,
  removeGroceryItemAction,
  setGroceryBoughtAction,
} from "@/lib/groceries/actions";
import { grocerySection, listWeeks, stillNeeded, type GroceryItem, type GroceryListData } from "@/lib/groceries/list";
import { tickShoppingAction } from "@/lib/plan/actions";
import { formatWeek } from "@/lib/plan/dates";
import { planPortions } from "@/lib/plan/portions";
import { buildShoppingList, SECTIONS, type Section } from "@/lib/plan/shopping";
import type { PlanRecipe } from "@/lib/plan/suggest";
import type { ShoppingState } from "@/lib/plan/types";
import { useLiveData } from "./use-live-data";

/** One line on the list: something added by hand, or an ingredient of a planned week. */
type Line = { key: string; row: ShoppingRow; section: Section; status: RowStatus; note: string | null; tag?: string } & (
  | { kind: "own"; item: GroceryItem }
  | { kind: "week"; weekStart: string }
);

export function GroceryList({ initial, recipes }: { initial: GroceryListData; recipes: PlanRecipe[] }) {
  const { data, error, send } = useLiveData(
    "groceries",
    () => loadGroceryListAction().then((r) => r.list ?? null),
    initial,
  );
  const [draft, setDraft] = useState("");
  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const { thisWeek } = listWeeks(data.today);

  const weekItems = useMemo(
    () =>
      data.weeks.map((week) => {
        const known = week.dishes.filter((d) => byId.has(d.recipeId));
        const items = buildShoppingList(known, byId, planPortions(week.setup, known, byId));
        return { week, items: stillNeeded(items, week.weekStart, data.today) };
      }),
    [data.weeks, data.today, byId],
  );
  const twoWeeks = weekItems.filter((w) => w.items.length > 0).length > 1;

  const lines: Line[] = [
    ...data.items.map((item): Line => ({
      kind: "own",
      key: `own:${item.id}`,
      item,
      row: { key: item.id, name: item.text, amount: "", measure: "", optional: false, sources: [] },
      section: grocerySection(item.text),
      status: item.bought ? "basket" : "todo",
      note: null,
    })),
    ...weekItems.flatMap(({ week, items }) =>
      items.map((row): Line => ({
        kind: "week",
        key: `${week.weekStart}:${row.key}`,
        weekStart: week.weekStart,
        row,
        section: row.section,
        status: weekStatus(week.shopping, row),
        note: changedNote(week.shopping, row),
        tag: twoWeeks ? (week.weekStart === thisWeek ? "This week" : "Next week") : undefined,
      })),
    ),
  ].sort((a, b) => a.row.name.localeCompare(b.row.name));

  const withItems = (items?: GroceryItem[]) =>
    items ? (d: GroceryListData) => ({ ...d, items }) : undefined;
  const withWeek = (weekStart: string, change: (s: ShoppingState) => ShoppingState) => (d: GroceryListData) => ({
    ...d,
    weeks: d.weeks.map((w) => (w.weekStart === weekStart ? { ...w, shopping: change(w.shopping) } : w)),
  });

  function tickWeek(weekStart: string, list: "bought" | "have", key: string, amount: string | null) {
    send(withWeek(weekStart, (s) => withTick(s, list, key, amount)), () =>
      tickShoppingAction(weekStart, list, key, amount).then((r) => ({
        error: r.error,
        apply: r.shopping ? withWeek(weekStart, () => r.shopping!) : undefined,
      })),
    );
  }
  function setOwn(item: GroceryItem, bought: boolean) {
    send(
      (d) => ({ ...d, items: d.items.map((i) => (i.id === item.id ? { ...i, bought } : i)) }),
      () => setGroceryBoughtAction(item.id, bought).then((r) => ({ error: r.error, apply: withItems(r.items) })),
    );
  }
  function removeOwn(item: GroceryItem) {
    send(
      (d) => ({ ...d, items: d.items.filter((i) => i.id !== item.id) }),
      () => removeGroceryItemAction(item.id).then((r) => ({ error: r.error, apply: withItems(r.items) })),
    );
  }
  function clearBought() {
    send(
      (d) => ({ ...d, items: d.items.filter((i) => !i.bought) }),
      () => clearBoughtGroceriesAction().then((r) => ({ error: r.error, apply: withItems(r.items) })),
    );
  }
  function addOwn(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const id = crypto.randomUUID();
    setDraft("");
    send(
      (d) => ({ ...d, items: [...d.items, { id, text, addedAt: new Date().toISOString(), bought: false }] }),
      () => addGroceryItemAction(id, text).then((r) => ({ error: r.error, apply: withItems(r.items) })),
    );
  }

  const row = (line: Line) =>
    line.kind === "own" ? (
      <ItemRow
        key={line.key}
        item={line.row}
        status={line.status}
        onBought={(bought) => setOwn(line.item, bought)}
        onRemove={() => removeOwn(line.item)}
      />
    ) : (
      <ItemRow
        key={line.key}
        item={line.row}
        status={line.status}
        note={line.note}
        tag={line.tag}
        onBought={(bought) => tickWeek(line.weekStart, "bought", line.row.key, bought ? line.row.measure : null)}
        onHave={() =>
          tickWeek(line.weekStart, "have", line.row.key, line.status === "home" ? null : line.row.measure)
        }
      />
    );

  const todo = lines.filter((l) => l.status === "todo");
  const basket = lines.filter((l) => l.status === "basket");
  const home = lines.filter((l) => l.status === "home");
  const boughtOwn = data.items.filter((i) => i.bought).length;

  return (
    <div className="space-y-4">
      <form onSubmit={addOwn} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={80}
          placeholder="Add milk, coffee…"
          aria-label="Add to the grocery list"
          className="block min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-base"
        />
        <button type="submit" className="rounded-xl bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-dark">
          Add
        </button>
      </form>
      <p className="text-sm text-muted">
        {todo.length} to buy · {basket.length} in the basket{home.length > 0 && <> · {home.length} already at home</>}.{" "}
        {data.weeks.length > 0 ? (
          <>
            With the dinners for{" "}
            {data.weeks.map((w, i) => (
              <span key={w.weekStart}>
                {i > 0 && " and "}
                <Link href={`/week/shopping?week=${w.weekStart}`} className="text-terracotta underline">
                  {formatWeek(w.weekStart)}
                </Link>
              </span>
            ))}
            .
          </>
        ) : (
          <>
            No dinners chosen for this week or next yet;{" "}
            <Link href="/week" className="text-terracotta underline">
              choose them
            </Link>{" "}
            and their ingredients appear here.
          </>
        )}
      </p>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          Not saved: {error}
        </p>
      )}

      {SECTIONS.map((section) => {
        const rows = todo.filter((l) => l.section === section);
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
      {lines.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line p-5 text-muted">
          The list is empty. Add something above; the week&apos;s dinners add their ingredients once chosen.
        </p>
      ) : (
        todo.length === 0 && (
          <p className="rounded-2xl border border-sage/40 bg-sage-light p-5 font-medium text-sage">Everything is ticked off.</p>
        )
      )}

      {basket.length > 0 && (
        <details className="rounded-2xl border border-line bg-paper p-4">
          <summary className="cursor-pointer font-medium">In the basket ({basket.length})</summary>
          <ul className="mt-2 divide-y divide-line">{basket.map(row)}</ul>
          {boughtOwn > 0 && (
            <button type="button" onClick={clearBought} className="mt-2 text-sm text-terracotta underline">
              Remove the {boughtOwn} bought {boughtOwn === 1 ? "item" : "items"} you added
            </button>
          )}
        </details>
      )}
      {home.length > 0 && (
        <details className="rounded-2xl border border-line bg-paper p-4">
          <summary className="cursor-pointer font-medium">Already at home ({home.length})</summary>
          <ul className="mt-2 divide-y divide-line">{home.map(row)}</ul>
        </details>
      )}

      <p className="text-xs text-muted">
        Things you add stay until you remove them. The dinners&apos; ingredients are the same as on Week →
        Shopping: a tick in either place shows in both. This week&apos;s ingredients leave the list once
        their dinner has passed. Ticks show on the other phone when you switch back to the app.
      </p>
    </div>
  );
}
