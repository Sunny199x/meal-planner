"use client";

// Rows of a shopping list, shared by the grocery list (home page) and
// Week → Shopping, so ticking works and looks the same in both places.
import { useState } from "react";
import { Chip } from "@/components/ui";
import { covers, type ShoppingItem } from "@/lib/plan/shopping";
import { shortTitle } from "@/lib/plan/suggest";
import { DAY_SHORT, type ShoppingState } from "@/lib/plan/types";

export type ShoppingRow = Pick<ShoppingItem, "key" | "name" | "amount" | "measure" | "optional" | "sources">;
export type RowStatus = "todo" | "basket" | "home";

export function withTick(state: ShoppingState, list: "bought" | "have", key: string, amount: string | null): ShoppingState {
  const next = { ...state[list] };
  if (amount === null) delete next[key];
  else next[key] = amount;
  return { ...state, [list]: next };
}

/** Where a planned item stands: already at home, bought (enough), or still to buy. */
export function weekStatus(shopping: ShoppingState, row: ShoppingRow): RowStatus {
  if (shopping.have?.[row.key] !== undefined) return "home";
  const ticked = shopping.bought?.[row.key];
  return ticked !== undefined && covers(ticked, row.measure) ? "basket" : "todo";
}

/** Shown when an item was ticked but the plan has grown since. */
export function changedNote(shopping: ShoppingState, row: ShoppingRow): string | null {
  return weekStatus(shopping, row) === "todo" && shopping.bought?.[row.key] !== undefined
    ? "Ticked before, but the plan now needs more. Tick again once you have it."
    : null;
}

export function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {note && <p className="text-sm text-muted">{note}</p>}
      <ul className="mt-1 divide-y divide-line">{children}</ul>
    </section>
  );
}

export function ItemRow({
  item,
  status,
  note,
  tag,
  onBought,
  onHave,
  onRemove,
}: {
  item: ShoppingRow;
  status: RowStatus;
  note?: string | null;
  /** Which week the item is for, when the list holds two. */
  tag?: string;
  onBought: (bought: boolean) => void;
  onHave?: () => void;
  onRemove?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const days = [...new Set(item.sources.map((s) => (s.day === null ? "no evening" : DAY_SHORT[s.day])))];
  return (
    <li className="flex items-start gap-3 py-2.5">
      {status === "home" ? (
        <span aria-hidden className="mt-0.5 w-5 shrink-0 text-center text-sage">
          ✓
        </span>
      ) : (
        <input
          type="checkbox"
          checked={status === "basket"}
          onChange={(e) => onBought(e.target.checked)}
          aria-label={`Bought: ${item.name}`}
          className="mt-1 h-5 w-5 shrink-0 accent-terracotta"
        />
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-3">
          <span className={`min-w-0 ${status === "basket" ? "text-muted line-through" : "font-medium"}`}>
            {item.name}
            {item.optional && (
              <span className="ml-2 align-middle">
                <Chip>optional</Chip>
              </span>
            )}
          </span>
          {item.amount && <span className="max-w-[55%] text-right text-sm">{item.amount}</span>}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted">
          {tag && <span className="font-medium text-sage">{tag}</span>}
          {item.sources.length > 0 && (
            <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="hover:text-ink">
              For {days.join(", ")} {open ? "▴" : "▾"}
            </button>
          )}
          {onHave && (
            <button type="button" onClick={onHave} className="text-terracotta underline">
              {status === "home" ? "Need to buy" : "Have it"}
            </button>
          )}
          {onRemove && (
            <button type="button" onClick={onRemove} className="text-terracotta underline">
              Remove
            </button>
          )}
        </div>
        {note && <p className="mt-0.5 text-xs text-danger">{note}</p>}
        {open && (
          <ul className="mt-1 space-y-0.5 text-xs text-muted">
            {item.sources.map((s, i) => (
              <li key={i}>
                {s.day === null ? "No evening" : DAY_SHORT[s.day]} · {shortTitle(s.title)}: {s.line}
              </li>
            ))}
          </ul>
        )}
      </div>
    </li>
  );
}
