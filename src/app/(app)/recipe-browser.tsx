"use client";

import { useSearchParams } from "next/navigation";
import { useMemo, useState, type ReactNode } from "react";
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
import type { RecipeSummary } from "@/lib/recipes/summary";

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
            placeholder="Search recipes, ingredients, cuisines…"
            className="block w-full rounded-xl border border-line bg-paper px-4 py-3 text-base shadow-sm outline-none focus:border-terracotta focus:ring-2 focus:ring-terracotta/30"
          />
        </label>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            aria-expanded={panelOpen}
            aria-controls="filter-panel"
            onClick={() => setPanelOpen(!panelOpen)}
            className="rounded-full border border-line bg-paper px-4 py-2 text-sm font-medium hover:border-terracotta/50"
          >
            Filters{activeCount > 0 && ` (${activeCount})`} {panelOpen ? "▴" : "▾"}
          </button>
          <p className="text-sm text-muted" aria-live="polite">
            {results.length === recipes.length
              ? `${recipes.length} ${recipes.length === 1 ? "recipe" : "recipes"}`
              : `${results.length} of ${recipes.length} recipes`}
          </p>
        </div>
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
                className="rounded-full bg-sage-light px-3 py-1 text-sm text-sage"
                aria-label={`Remove filter: ${chip.label}`}
              >
                {chip.label} ×
              </button>
            ))}
            <button type="button" onClick={clearAll} className="px-2 py-1 text-sm text-terracotta underline">
              Clear all
            </button>
          </div>
        )}
      </div>

      {panelOpen && (
        <div id="filter-panel" className="space-y-5 rounded-2xl border border-line bg-paper p-4 shadow-sm">
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
                      ? "rounded-full bg-sage px-3 py-2 text-sm text-white"
                      : "rounded-full border border-line px-3 py-2 text-sm hover:border-sage"
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
          <button type="button" onClick={clearAll} className="mt-2 text-terracotta underline">
            Clear search and filters
          </button>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {results.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
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
              ? "rounded-full bg-terracotta px-3 py-2 text-sm text-white"
              : "rounded-full border border-line px-3 py-2 text-sm hover:border-terracotta/50"
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
      className="block w-full rounded-xl border border-line bg-cream px-3 py-2 text-base"
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
      className="block w-full rounded-xl border border-line bg-cream px-3 py-2 text-base"
    />
  );
}
