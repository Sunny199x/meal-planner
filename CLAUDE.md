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
- `docs/STATUS.md` — what the app does today, what is missing, and known limitations.
- `docs/IDEAS.md` — feedback from using the app and ideas for later. Add new feedback there; move
  an item into a milestone plan only when Saketh agrees.

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
- Tests that expect exact results for particular recipes read the copies in
  `src/lib/recipes/__fixtures__/` (via `readTemplateFixtures`), never `seed-recipes/`, which holds
  the household's real recipes and changes often. Only generic checks (every file loads, form
  round-trip) should read `seed-recipes/`.
- Check layouts at phone width (about 375 px) as well as desktop.

## Commands

- Install: `npm install`
- Dev server: `npm run dev` (http://localhost:3000)
- Lint / type check / unit tests: `npm run lint`, `npm run typecheck`, `npm test`
- Production build: `npm run build` (runs database migrations first when `DATABASE_URL` is set)
- After changing `src/lib/db/schema.ts`: `npm run db:generate` to create a migration in `drizzle/`
- Layout check at phone and desktop width (needs a running app):
  `HOUSEHOLD_PASSCODE=... node scripts/check-pages.mjs http://localhost:3000`
  (screenshots go to `.screenshots/`)
- Importing reads recipes with Claude and needs `ANTHROPIC_API_KEY`. Cloud sessions have no key:
  start a local server with `IMPORT_TEST_READER=1` to use a stand-in that answers like Claude for a
  sample recipe (`src/lib/import/test-reader.ts`). Never set it on Vercel.
- Local database: without `DATABASE_URL` the app uses PGlite in `.data/pglite` (delete the folder
  to start fresh). Cloud sessions can't reach Neon, so test against this. For the dev server, set
  `HOUSEHOLD_PASSCODE` and `SESSION_SECRET` (32+ characters) in `.env.local`.

Next.js here is version 16 with Cache Components on; see `AGENTS.md` and read the guides in
`node_modules/next/dist/docs/` before relying on older Next.js knowledge.
