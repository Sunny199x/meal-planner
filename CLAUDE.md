# Meal Planner — instructions for Claude Code

A web app that helps Saketh and Victoria (a couple in Stockholm) turn their recipe collection into a
weekly dinner plan, a shopping list and a Sunday prep list. The core idea being tested: a small
shortlist of about three suggestions that updates after each pick, with specific reasons why the
dishes fit together.

## Read first

- `docs/BRIEF.md` — the full product brief (what to build and why).
- `docs/DECISIONS.md` — decisions made since the brief: stack, build order, changes. It overrides the
  brief where they differ.
- `seed-recipes/README.md` — the recipe file format.

## Working with Saketh

- He is new to software development. Use plain language, avoid jargon, and explain what a step does
  before asking him to do it.
- When he needs to act outside the code (GitHub, Vercel, environment variables, Neon), stop and give
  numbered steps with exact button names. Don't assume he knows the terminal.
- Be candid. Point out weak assumptions and trade-offs; don't flatter.
- Make routine technical decisions yourself and record notable ones in `docs/DECISIONS.md`.
- Work in small, reviewable steps. At the end of each piece of work, say what changed, how to try it
  (usually the Vercel preview link) and what is still simulated or missing.

## Product rules (from the brief)

- No seafood: never suggest it, and warn if an imported recipe contains it.
- Metric units and °C only. Use SEK only for real or clearly labelled illustrative data.
- Don't invent prices, nutrition figures or food storage durations.
- Don't claim AI, machine learning or clinical nutrition. Suggestions come from transparent rules,
  and the reasons shown must be the real ones.
- No medical, fertility or pregnancy advice or claims.
- Common staples (salt, oil, pepper, dried spices) don't count as meaningful shared ingredients.
  Quantities matter: using the rest of a 100 g spinach bag is useful; mentioning spinach isn't.
- Shared preparation means the same make-ahead component (matched by name in the recipe files),
  not just a shared ingredient.
- Label anything simulated or not yet supported (e.g. Instagram/TikTok links, photo import) clearly
  in the UI.
- Recipes in `seed-recipes/` with `template: true` are illustrative examples; show them as such.

## Out of scope

Live supermarket prices or stock, calendar integration, payments, social feeds, full social-media
import, multi-user accounts beyond the shared household passcode, a large recommendation engine.

## Testing

- Unit-test the parts that can be silently wrong: ingredient-line parsing, unit conversion and
  combining, portion scaling, and recommendation scoring/explanations.
- Test the URL importer against saved HTML fixtures (cloud sessions can't reach most websites).
- Check layouts at phone width (about 375 px) as well as desktop.

## Commands

(Fill in once the project is scaffolded: install, dev server, tests, database migrations, seed.)
