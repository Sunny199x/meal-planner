# Seed recipes

One recipe per file, written in Markdown. The app reads every `.md` file in this folder
(except this README) when the demo data is loaded or reset.

**Fresh start (2 November 2026):** the earlier recipes (15 written from HelloFresh pages and three
illustrative templates) were removed so the household can build its collection from scratch.
They are still in the git history. New recipes are drafted in `recipe-drafts/` by the "Forkcast
recipes" session and moved here once Sunny approves them.

Example files in this format are in `src/lib/recipes/__fixtures__/` (the three templates, kept
for tests). A file with `template: true` is shown in the app as an illustrative example.

Writing recipes from a website:

- Ingredients, times, servings and the source link come from the page.
- The method is rewritten in our own words, not copied.
- `freezer_friendly` is `false` until you've actually frozen the dish and it was fine.
- Reuse make-ahead names on purpose (e.g. `Cook rice`, `Quick-pickled red onions`) so the app
  can spot shared preparation.

## Quick start

1. Copy one of the example files from `src/lib/recipes/__fixtures__/` here and rename it, e.g.
   `chicken-tikka.md` (lowercase, hyphens, no spaces).
2. Change `template: true` to `template: false`, or delete that line.
3. Fill in the top section (between the `---` lines) and the headings below it.

## The top section (frontmatter)

| Field | Required | What to write |
|---|---|---|
| `title` | yes | The dish name. |
| `source` | yes | Where it came from: `HelloFresh card`, a cookbook name, `Own recipe`, a website name. |
| `source_url` | no | Link to the original page, if there is one. |
| `servings` | yes | How many portions the ingredient quantities make. |
| `time_total_min` | yes | Minutes from start to plate, including oven and simmering time. |
| `time_active_min` | no | Minutes you are actually busy. Helps on busy evenings. |
| `cuisine` | yes | Free text, e.g. `Indian`, `Mexican-inspired`, `Middle Eastern`. |
| `diet` | yes | `vegetarian`, `vegan` or `meat`. |
| `main_protein` | no | The main protein source, e.g. `chicken`, `lentils`, `paneer`, `eggs`. |
| `freezer_friendly` | yes | `true` only if you have actually frozen it and it was fine. |
| `good_as_leftovers` | yes | `true` if it reheats well as a next-day lunch. |
| `tags` | no | Anything useful, in square brackets: `[one-pot, comfort]`. |

## Ingredients

One ingredient per line, starting with `- `:

```
- 250 g red lentils, rinsed
- 2 cans black beans (400 g each), drained
- 1 onion, finely chopped
- 1 tsp ground cumin
- salt, to taste
```

- Use metric units: `g`, `kg`, `ml`, `dl`, `cl`, `l`, `tsp`, `tbsp`. (The Swedish `msk`, `tsk`
  and `krm` are understood too.) Cups, ounces and pounds are flagged: please convert them.
- Countable things need no unit: `1 onion`, `3 garlic cloves`, `2 cans`, `1 bunch`.
- Fractions are fine: `½ lemon`, `1 ½ tsp`, `0.5 lemon` or `0,5 lemon`. Ranges too: `2–3 tomatoes`.
- Anything after a comma is a note and is ignored when adding up the shopping list.
- Add `(optional)` at the end for optional ingredients.
- A weight in brackets helps the shopping list:
  - `1 cauliflower (about 600 g)`: the bracket is the total.
  - `2 cans black beans (400 g each)`: for cans, jars, packs, bags and bottles, the bracket is per
    container, so this is 800 g. Write `(800 g in total)` if you mean the total.
  - `2 x 400 g cans chopped tomatoes` works as well.
- To group ingredients, add a small heading such as `### For the sauce` above them.

## Instructions

Numbered steps (`1.`, `2.`, …). Oven temperatures in °C, with the fan temperature in
brackets if you know it: `220 °C (200 °C fan)`.

## Make ahead (optional, but this is what makes the connections work)

Things you could do on Sunday. Write each as `Name: what to do`:

```
- Quick-pickled red onions: thinly slice 1 red onion, cover with 60 ml vinegar...
- Chop aromatics: finely chop the onion, garlic and ginger.
```

If two recipes use **exactly the same name** (e.g. `Quick-pickled red onions`), the app
treats it as a shared preparation task and can suggest making one batch for both dishes.
So reuse names consistently across recipes.

Don't write how many days something keeps unless you know it from a reliable source.

## Notes (optional)

Anything else: what you'd change next time, what to serve it with, who liked it.

## After adding or changing a file

1. Save (commit) the file on GitHub. Vercel builds a new version of the app automatically.
2. When that's done, open the app → **Settings** → **Load recipes from files**.
3. The report lists every file. **Errors** mean the recipe wasn't loaded (for example a missing
   title). **Warnings** mean it loaded but something looks off (for example a non-metric unit,
   or seafood). Each message says which line to look at.

GitHub also checks every file in this folder. If a file can't be read, the pull request shows a
red ✗; click **Details** to see which file and line.
