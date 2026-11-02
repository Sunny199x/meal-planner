"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, useTransition, type ReactNode } from "react";
import { RecipeCard } from "@/components/recipe-card";
import { formatMinutes } from "@/components/ui";
import {
  activeFilterCount,
  filterRecipes,
  filtersFromParams,
  filtersToParams,
  NO_FILTERS,
  TIME_OPTIONS,
  type DietFilter,
  type Filters,
} from "@/lib/recipes/filters";
import { CARB_RULE_TEXT, LABEL_DISCLAIMER, PROTEIN_RULE_TEXT } from "@/lib/recipes/labels";
import { LAST_LIST_QUERY_KEY } from "@/lib/recipes/list-query";
import { setRecipeStatusAction } from "@/lib/recipes/actions";
import type { RecipeSummary } from "@/lib/recipes/summary";
import { RECIPE_STATUSES, STATUS_LABEL, type RecipeStatus } from "@/lib/recipes/types";

const DIET_OPTIONS: { value: DietFilter; label: string }[] = [
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "meat", label: "Meat" },
];

const TOGGLES: { key: "favourites" | "proteinRich" | "carbFocused" | "freezer" | "leftovers"; label: string }[] = [
  { key: "favourites", label: "Favourites" },
  { key: "proteinRich", label: "Protein-rich" },
  { key: "carbFocused", label: "Carb-focused" },
  { key: "freezer", label: "Freezer-friendly" },
  { key: "leftovers", label: "Good as leftovers" },
];

function uniqueSorted(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const value of values) seen.set(value.toLowerCase(), seen.get(value.toLowerCase()) ?? value);
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function RecipeBrowser({ recipes }: { recipes: RecipeSummary[] }) {
  const searchParams = useSearchParams();
  const filters = useMemo(() => filtersFromParams(new URLSearchParams(searchParams.toString())), [searchParams]);
  const results = useMemo(() => filterRecipes(recipes, filters), [recipes, filters]);
  const cuisines = useMemo(() => uniqueSorted(recipes.map((r) => r.cuisine)), [recipes]);
  const tags = useMemo(() => uniqueSorted(recipes.flatMap((r) => r.tags)), [recipes]);
  const activeCount = activeFilterCount(filters);

  // Text boxes keep their own state so typing stays smooth.
  const [query, setQuery] = useState(filters.q);
  const [withText, setWithText] = useState(filters.withIngredients.join(", "));
  const [withoutText, setWithoutText] = useState(filters.withoutIngredients.join(", "));
  const [panelOpen, setPanelOpen] = useState(false);
  // Choosing several recipes to move them into or out of the weekly suggestions.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [moveMessage, setMoveMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const [moving, startMoving] = useTransition();

  function toggleSelected(id: string) {
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }
  function move(status: RecipeStatus) {
    const ids = selected;
    startMoving(async () => {
      const result = await setRecipeStatusAction(ids, status);
      if (result.error) {
        setMoveMessage({ text: result.error, error: true });
        return;
      }
      setMoveMessage({ text: `Moved ${ids.length} ${ids.length === 1 ? "recipe" : "recipes"} to “${STATUS_LABEL[status]}”.` });
      setSelected([]);
      setSelecting(false);
    });
  }

  function update(change: Partial<Filters>) {
    const query = filtersToParams({ ...filters, ...change }).toString();
    window.history.replaceState(null, "", query ? `?${query}` : window.location.pathname);
    try {
      sessionStorage.setItem(LAST_LIST_QUERY_KEY, query);
    } catch {
      // Private browsing can block storage; the Back link then shows all recipes.
    }
  }

  function clearAll() {
    setQuery("");
    setWithText("");
    setWithoutText("");
    update(NO_FILTERS);
  }

  const splitList = (text: string) => text.split(",").map((s) => s.trim()).filter(Boolean);
  const activeChips = describeActive(filters);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <label className="block">
          <span className="sr-only">Search recipes</span>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              update({ q: e.target.value });
            }}
            placeholder="Search by name, ingredient, cuisine or source…"
            className="block w-full rounded-xl border border-line bg-paper px-4 py-3 text-base outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls="filter-panel"
            onClick={() => setPanelOpen(!panelOpen)}
            className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium hover:border-accent/50"
          >
            Filters{activeCount > 0 && ` (${activeCount})`} {panelOpen ? "▴" : "▾"}
          </button>
          <div className="flex items-center gap-3">
            <p className="text-sm text-muted" aria-live="polite">
              {results.length === recipes.length
                ? `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"}`
                : `${results.length} of ${recipes.length} recipes`}
            </p>
            <button
              type="button"
              onClick={() => {
                setSelecting(!selecting);
                setSelected([]);
                setMoveMessage(null);
              }}
              aria-pressed={selecting}
              className="rounded-full border border-line bg-paper px-3 py-1.5 text-sm hover:border-accent/50"
            >
              {selecting ? "Done" : "Select"}
            </button>
          </div>
        </div>
        {selecting && (
          <div className="sticky top-2 z-20 space-y-2 rounded-2xl border border-line bg-paper p-3 shadow-sm">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="font-medium">{selected.length} selected</span>
              <button
                type="button"
                onClick={() => setSelected(results.map((r) => r.id))}
                className="text-accent underline"
              >
                Select all {results.length}
              </button>
              {selected.length > 0 && (
                <button type="button" onClick={() => setSelected([])} className="text-muted underline">
                  Clear
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted">Move to:</span>
              {RECIPE_STATUSES.map((status) => (
                <button
                  key={status}
                  type="button"
                  disabled={selected.length === 0 || moving}
                  onClick={() => move(status)}
                  className="rounded-full border border-line px-3 py-1.5 text-sm hover:border-accent/50 disabled:opacity-40"
                >
                  {STATUS_LABEL[status]}
                </button>
              ))}
            </div>
          </div>
        )}
        {moveMessage && (
          <p role={moveMessage.error ? "alert" : "status"} className={`text-sm ${moveMessage.error ? "text-danger" : "text-good"}`}>
            {moveMessage.text}
          </p>
        )}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeChips.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={() => {
                  if (chip.clear.withIngredients) setWithText("");
                  if (chip.clear.withoutIngredients) setWithoutText("");
                  update(chip.clear);
                }}
                className="rounded-full bg-good-light px-3 py-1 text-sm text-good"
                aria-label={`Remove filter: ${chip.label}`}
              >
                {chip.label} ×
              </button>
            ))}
            <button type="button" onClick={clearAll} className="px-2 py-1 text-sm text-accent underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      {panelOpen && (
        <div id="filter-panel" className="space-y-5 rounded-2xl border border-line bg-paper p-4">
          <FilterGroup title="Weekly suggestions">
            <Segmented
              options={[{ value: null, label: "Any" }, ...RECIPE_STATUSES.map((s) => ({ value: s, label: STATUS_LABEL[s] }))]}
              selected={filters.status}
              onSelect={(value) => update({ status: value })}
            />
          </FilterGroup>
          <FilterGroup title="Cooking time (start to plate)">
            <Segmented
              options={[
                { value: null, label: "Any" },
                ...TIME_OPTIONS.map((t) => ({ value: t, label: `≤ ${formatMinutes(t)}` })),
              ]}
              selected={filters.maxTime}
              onSelect={(value) => update({ maxTime: value })}
            />
          </FilterGroup>
          <FilterGroup title="Diet">
            <Segmented
              options={[{ value: null, label: "Any" }, ...DIET_OPTIONS]}
              selected={filters.diet}
              onSelect={(value) => update({ diet: value })}
            />
          </FilterGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <FilterGroup title="Cuisine">
              <Select
                value={filters.cuisine}
                options={cuisines}
                onChange={(value) => update({ cuisine: value })}
              />
            </FilterGroup>
            {tags.length > 0 && (
              <FilterGroup title="Tag">
                <Select value={filters.tag} options={tags} onChange={(value) => update({ tag: value })} />
              </FilterGroup>
            )}
          </div>
          <FilterGroup title="Only show">
            <div className="flex flex-wrap gap-2">
              {TOGGLES.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={filters[key]}
                  onClick={() => update({ [key]: !filters[key] })}
                  className={
                    filters[key]
                      ? "rounded-full bg-good px-3 py-2 text-sm text-white"
                      : "rounded-full border border-line px-3 py-2 text-sm hover:border-good"
                  }
                >
                  {label}
                </button>
              ))}
            </div>
          </FilterGroup>
          <div className="grid gap-4 sm:grid-cols-2">
            <FilterGroup title="Includes ingredient">
              <TextFilter
                value={withText}
                placeholder="e.g. spinach, chickpeas"
                onChange={(text) => {
                  setWithText(text);
                  update({ withIngredients: splitList(text) });
                }}
              />
            </FilterGroup>
            <FilterGroup title="Leave out ingredient">
              <TextFilter
                value={withoutText}
                placeholder="e.g. coriander"
                onChange={(text) => {
                  setWithoutText(text);
                  update({ withoutIngredients: splitList(text) });
                }}
              />
            </FilterGroup>
          </div>
          <details className="text-sm text-muted">
            <summary className="cursor-pointer text-ink">How are “protein-rich” and “carb-focused” decided?</summary>
            <div className="mt-2 space-y-2">
              <p>{PROTEIN_RULE_TEXT}</p>
              <p>{CARB_RULE_TEXT}</p>
              <p>{LABEL_DISCLAIMER}</p>
            </div>
          </details>
        </div>
      )}

      {results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line p-8 text-center">
          <p className="font-medium">No recipes match.</p>
          <button type="button" onClick={clearAll} className="mt-2 text-accent underline">
            Clear search and filters
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {results.map((recipe) => (
            <li key={recipe.id}>
              {selecting ? (
                // While selecting, a tap anywhere on the card ticks it instead of opening the recipe.
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.includes(recipe.id)}
                    onChange={() => toggleSelected(recipe.id)}
                    aria-label={`Select ${recipe.title}`}
                    className="h-5 w-5 shrink-0 accent-ink"
                  />
                  <div className="pointer-events-none min-w-0 flex-1">
                    <RecipeCard recipe={recipe} />
                  </div>
                </label>
              ) : (
                <RecipeCard recipe={recipe} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function describeActive(filters: Filters): { label: string; clear: Partial<Filters> }[] {
  const chips: { label: string; clear: Partial<Filters> }[] = [];
  if (filters.maxTime) chips.push({ label: `≤ ${formatMinutes(filters.maxTime)}`, clear: { maxTime: null } });
  if (filters.diet) {
    chips.push({ label: DIET_OPTIONS.find((d) => d.value === filters.diet)!.label, clear: { diet: null } });
  }
  if (filters.cuisine) chips.push({ label: filters.cuisine, clear: { cuisine: null } });
  if (filters.tag) chips.push({ label: `#${filters.tag}`, clear: { tag: null } });
  if (filters.status) chips.push({ label: STATUS_LABEL[filters.status], clear: { status: null } });
  for (const { key, label } of TOGGLES) {
    if (filters[key]) chips.push({ label, clear: { [key]: false } });
  }
  if (filters.withIngredients.length) {
    chips.push({ label: `With ${filters.withIngredients.join(", ")}`, clear: { withIngredients: [] } });
  }
  if (filters.withoutIngredients.length) {
    chips.push({ label: `Without ${filters.withoutIngredients.join(", ")}`, clear: { withoutIngredients: [] } });
  }
  return chips;
}

function FilterGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium">{title}</legend>
      {children}
    </fieldset>
  );
}

function Segmented<T extends string | number | null>({
  options,
  selected,
  onSelect,
}: {
  options: { value: T; label: string }[];
  selected: T;
  onSelect: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          aria-pressed={option.value === selected}
          onClick={() => onSelect(option.value)}
          className={
            option.value === selected
              ? "rounded-full bg-accent px-3 py-2 text-sm text-white"
              : "rounded-full border border-line px-3 py-2 text-sm hover:border-accent/50"
          }
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function Select({
  value,
  options,
  onChange,
}: {
  value: string | null;
  options: string[];
  onChange: (value: string | null) => void;
}) {
  return (
    <select
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="block w-full rounded-xl border border-line bg-soft px-3 py-2 text-base"
    >
      <option value="">Any</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function TextFilter({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="block w-full rounded-xl border border-line bg-soft px-3 py-2 text-base"
    />
  );
}
