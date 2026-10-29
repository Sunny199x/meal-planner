# Seed recipes

One recipe per file, written in Markdown. The app reads every `.md` file in this folder
(except this README) when the demo data is loaded or reset.

The three files starting with `_template-` are examples written by Claude to show the
format. They are illustrative and untested in a kitchen. Delete them once your own recipes
are in. The `template: true` line also marks them so the app can label them.

## Quick start

1. Copy one of the template files and rename it, e.g. `chicken-tikka.md`
   (lowercase, hyphens, no spaces).
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

- Use metric units: `g`, `kg`, `ml`, `l`, `tsp`, `tbsp`.
- Countable things need no unit: `1 onion`, `3 garlic cloves`, `2 cans`, `1 bunch`.
- Fractions are fine: `½ lemon` or `0.5 lemon`.
- Anything after a comma is a note and is ignored when adding up the shopping list.
- Add `(optional)` at the end for optional ingredients.

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
