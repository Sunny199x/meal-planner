"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Chip } from "@/components/ui";
import { addShoppingItemAction, loadWeekAction, removeShoppingItemAction, tickShoppingAction } from "@/lib/plan/actions";
import { planPortions } from "@/lib/plan/portions";
import { buildShoppingList, covers, SECTIONS, type ShoppingItem } from "@/lib/plan/shopping";
import { shortTitle, type PlanRecipe } from "@/lib/plan/suggest";
import { DAY_SHORT, type PlannedDish, type ShoppingState, type WeekSetup } from "@/lib/plan/types";

type Row = Pick<ShoppingItem, "key" | "name" | "amount" | "measure" | "optional" | "sources"> & { extraId?: string };
type Status = "todo" | "basket" | "home";
type Result = { shopping?: ShoppingState; error?: string };

function withTick(state: ShoppingState, list: "bought" | "have", key: string, amount: string | null): ShoppingState {
  const next = { ...state[list] };
  if (amount === null) delete next[key];
  else next[key] = amount;
  return { ...state, [list]: next };
}

export function ShoppingList({
  weekStart,
  initialSetup,
  initialDishes,
  initialShopping,
  recipes,
}: {
  weekStart: string;
  initialSetup: WeekSetup;
  initialDishes: PlannedDish[];
  initialShopping: ShoppingState;
  recipes: PlanRecipe[];
}) {
  const [setup, setSetup] = useState(initialSetup);
  const [dishes, setDishes] = useState(initialDishes);
  const [shopping, setShopping] = useState(initialShopping);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const pending = useRef(0);

  const byId = useMemo(() => new Map(recipes.map((r) => [r.id, r])), [recipes]);
  const known = useMemo(() => dishes.filter((d) => byId.has(d.recipeId)), [dishes, byId]);
  const items = useMemo(() => buildShoppingList(known, byId, planPortions(setup, known, byId)), [known, byId, setup]);

  // Pick up changes from the other phone when the page opens or the app comes back to the front.
  useEffect(() => {
    async function refresh() {
      if (document.visibilityState !== "visible" || pending.current > 0) return;
      const result = await loadWeekAction(weekStart);
      if (pending.current > 0 || !result.setup || !result.dishes || !result.shopping) return;
      setSetup(result.setup);
      setDishes(result.dishes);
      setShopping(result.shopping);
    }
    refresh();
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, [weekStart]);

  /** Shows a change straight away, saves it, then shows what the database holds (including the other phone's ticks). */
  function send(local: (state: ShoppingState) => ShoppingState, save: () => Promise<Result>) {
    setShopping(local);
    setError(null);
    pending.current++;
    save().then(
      (result) => {
        pending.current--;
        if (result.error) setError(result.error);
        else if (result.shopping && pending.current === 0) setShopping(result.shopping);
      },
      () => {
        pending.current--;
        setError("Couldn't reach the app. Check the connection; the last tick may not be saved.");
      },
    );
  }
  const tick = (list: "bought" | "have", key: string, amount: string | null) =>
    send((s) => withTick(s, list, key, amount), () => tickShoppingAction(weekStart, list, key, amount));

  function addOwn(event: React.FormEvent) {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;
    const id = crypto.randomUUID();
    setDraft("");
    send(
      (s) => ({ ...s, extra: { ...s.extra, [id]: { text, addedAt: new Date().toISOString() } } }),
      () => addShoppingItemAction(weekStart, id, text),
    );
  }
  function removeOwn(id: string) {
    send((s) => {
      const extra = { ...s.extra };
      delete extra[id];
      return withTick({ ...s, extra }, "bought", `extra:${id}`, null);
    }, () => removeShoppingItemAction(weekStart, id));
  }

  const own: Row[] = Object.entries(shopping.extra ?? {})
    .sort(([, a], [, b]) => a.addedAt.localeCompare(b.addedAt))
    .map(([id, e]) => ({ key: `extra:${id}`, extraId: id, name: e.text, amount: "", measure: "", optional: false, sources: [] }));
  const ticked = (row: Row) => shopping.bought?.[row.key];
  const statusOf = (row: Row): Status => {
    if (shopping.have?.[row.key] !== undefined) return "home";
    const was = ticked(row);
    return was !== undefined && covers(was, row.measure) ? "basket" : "todo";
  };
  const changedNote = (row: Row) =>
    ticked(row) !== undefined ? "Ticked before, but the plan now needs more. Tick again once you have it." : null;
  const all: Row[] = [...own, ...items];
  const basket = all.filter((r) => statusOf(r) === "basket");
  const home = all.filter((r) => statusOf(r) === "home");
  const todoCount = all.length - basket.length - home.length;

  const row = (r: Row) => {
    const status = statusOf(r);
    return (
      <ItemRow
        key={r.key}
        item={r}
        status={status}
        note={status === "todo" ? changedNote(r) : null}
        onBought={(bought) => tick("bought", r.key, bought ? r.measure : null)}
        onHave={r.extraId ? undefined : () => tick("have", r.key, status === "home" ? null : r.measure)}
        onRemove={r.extraId ? () => removeOwn(r.extraId!) : undefined}
      />
    );
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        {todoCount} to buy · {basket.length} in the basket · {home.length} already at home. From {known.length}{" "}
        {known.length === 1 ? "dish" : "dishes"}, with lunch boxes and freezer portions.
      </p>
      <form onSubmit={addOwn} className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={80}
          placeholder="Add milk, coffee…"
          aria-label="Add something else to the list"
          className="block min-w-0 flex-1 rounded-xl border border-line bg-paper px-3 py-2 text-base"
        />
        <button type="submit" className="rounded-xl bg-terracotta px-4 py-2 text-sm font-medium text-white hover:bg-terracotta-dark">
          Add
        </button>
      </form>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-light px-3 py-2 text-sm text-danger">
          Not saved: {error}
        </p>
      )}

      {own.some((r) => statusOf(r) === "todo") && (
        <Group title="Added by you">{own.filter((r) => statusOf(r) === "todo").map(row)}</Group>
      )}
      {SECTIONS.map((section) => {
        const rows = items.filter((i) => i.section === section && statusOf(i) === "todo");
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

function Group({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-line bg-paper p-4 shadow-sm">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {note && <p className="text-sm text-muted">{note}</p>}
      <ul className="mt-1 divide-y divide-line">{children}</ul>
    </section>
  );
}

function ItemRow({
  item,
  status,
  note,
  onBought,
  onHave,
  onRemove,
}: {
  item: Row;
  status: Status;
  note: string | null;
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
