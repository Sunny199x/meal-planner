# Decisions log

Decisions made with Saketh in the claude.ai "Meal Planning App" project chat, 28–29 October 2026.
The original brief is in `docs/BRIEF.md`. Where this file and the brief disagree, this file wins.

## Where the work happens

- **Building:** Claude Code (cloud sessions at claude.ai/code or the Code tab in the desktop app),
  working in this GitHub repository.
- **Product thinking:** the claude.ai "Meal Planning App" project chat. Decisions made there get
  added to this file so Claude Code sees them.
- Saketh is new to software development. Explain steps in plain language, give exact click paths for
  anything he must do himself (GitHub, Vercel, environment variables), and stop to walk him through
  them rather than assuming.

## Architecture

| Choice | Decision | Why |
|---|---|---|
| App framework | Next.js (App Router) + TypeScript | One codebase for pages and server code; first-class on Vercel. |
| Hosting | Vercel, Hobby (free) plan, connected to this repo | Signs in with GitHub; every push gets its own preview URL that can be opened on a phone. |
| Database | Postgres from Neon, added through Vercel's Storage / Marketplace | No separate account to manage; the database URL is injected automatically. |
| Sign-in | One shared household passcode (environment variable), cookie session | Two people, one household. Real user accounts are out of scope. |
| Recipe URL import | Server-side fetch, parse schema.org `Recipe` JSON-LD, then a review screen | Works for most food blogs. Falls back to "save link + manual entry" when there is no structured data. |
| Instagram | Link + pasted caption, read by Claude (milestone 4) | Instagram's official access is locked down; a better way is in `docs/IDEAS.md` for later. |
| YouTube | Link only: the official YouTube Data API reads the title, description and thumbnail (`YOUTUBE_API_KEY`, free; Saketh's OK 29 October 2026). Without the key, the description is pasted. | Most cooking videos write the recipe in the description. |
| TikTok | Not supported | Saketh and Victoria don't use it (decided 29 October 2026). |
| Photo import | Up to 4 photos (cookbook pages, a handwritten recipe, screenshots) read by Claude on the Import page; dish photos attached to recipes (milestone 4) | Added 30 October 2026 with Saketh's OK, once the cheap model made it about the same cost as text. |
| Seed data | Markdown files in `seed-recipes/`, loaded by a seed script and a "reset demo data" action | Saketh writes his own recipes there. See `seed-recipes/README.md`. |

**Caveat:** Vercel's Hobby plan is for personal, non-commercial use. That fits a household app.
If this becomes a commercial product, hosting needs to move to a paid plan; this is not a reason
to change anything now.

**Cloud session caveat:** the default Claude Code cloud environment blocks most websites, so live
recipe sites can't be fetched from inside a session. Test the importer against saved HTML fixtures in
the repo, then check it for real on the Vercel preview deployment.

## Technical decisions during milestone 1 (29 October 2026)

- **Next.js 16 with Cache Components** (the framework's new default). Pages show their layout
  at once and stream in data behind a short "Loading…" message. Anything that reads the database
  or the sign-in cookie must sit inside a `<Suspense>` boundary.
- **Database access: Drizzle ORM.** On Vercel it talks to Neon over HTTP (`DATABASE_URL`, set by
  the Vercel–Neon integration). For development and tests where Neon can't be reached (cloud
  sessions), a Postgres that runs inside the app (PGlite) stands in. It is never used on Vercel;
  if Neon is missing there, the app says so.
- **One row per recipe.** Ingredient lines, steps and make-ahead tasks are stored in the recipe
  row (JSON columns), not separate tables. Saving a recipe is then a single write, so a recipe
  can't be half-saved; the Neon HTTP driver has no multi-statement transactions.
- **Ingredients are stored as written** (`"250 g red lentils, rinsed"`). Amounts, units and notes
  are worked out when shown, so improving the parser fixes every recipe at once. Labels such as
  "contains seafood" are also calculated when shown, never stored.
- **Migrations run at the start of every Vercel build** (`npm run build` runs
  `scripts/migrate.mts` first). If no database is connected, that step is skipped with a message.
- **Each preview has its own copy of the database** (since 2 November 2026). The Neon connection in
  Vercel has "Create database branch for deployment: Preview" on: a preview build gets a branch
  `preview/<git-branch>`, copied from production when that branch's first preview is built, and
  the build's migrations run on the copy. Production uses the main branch. Saketh checked it with
  a test grocery item that showed on the preview only. To refresh a preview's copy: Neon →
  Branches → the branch → *Reset from parent*. (Before this, preview and production shared one
  database.)
- **Database changes still prefer adding** tables or columns: while a production deploy finishes,
  the previous version can still be serving. Renaming or removing something takes two releases.
- **Server region Frankfurt** (`fra1` in `vercel.json`), next to the Neon database in Frankfurt.
- **Passcode sign-in:** a signed, HttpOnly cookie lasting 90 days. The passcode ignores capitals
  and extra spaces. Changing `HOUSEHOLD_PASSCODE` or `SESSION_SECRET` in Vercel signs everyone
  out. A wrong guess waits one second.
- **"Load recipes from files"** (Settings) adds and updates recipes from `seed-recipes/` and keeps
  favourites. A file recipe edited in the app is skipped. When a file is deleted, its recipe is
  removed, unless it was edited in the app; then it is kept as an app recipe. A file that can't be
  read keeps the previous version. Recipes added in the app are never touched. "Reset everything"
  (type RESET) wipes all recipes and reloads the files.
- **Ingredient line conventions** (see `seed-recipes/README.md`):
  - A bracketed weight is a total (`1 cauliflower (about 600 g)`).
  - For cans, jars, packs, bags and bottles, a bracketed weight is per container
    (`2 cans black beans (400 g each)` = 800 g), unless it says "in total".
  - Ranges use the upper amount for totals.
  - Metric spoons are 5 ml (tsp) and 15 ml (tbsp).
  - Cups, ounces and pounds are flagged rather than converted.
- **Seafood check:** a word list (English plus common Swedish names) flags recipes that contain
  seafood. It also warns about ingredients that often contain fish (Worcestershire sauce, curry
  pastes, kimchi), and ignores look-alikes such as oyster mushrooms and vegan fish sauce.
- **GitHub check:** lint, type check and unit tests on every pull request, including a test that
  every file in `seed-recipes/` loads without errors.
- **Protein-rich / carb-focused labels** (draft household rule, shown in the app; easy to change in
  `src/lib/recipes/labels.ts`):
  - **Protein-rich:** per serving, 100 g meat, poultry, tofu, tempeh, paneer or halloumi; or 150 g
    canned or cooked beans, chickpeas or lentils; or 50 g dry lentils, split peas or dried beans; or
    2 eggs. A mix that adds up to the same also counts.
  - **Carb-focused:** per serving, 75 g uncooked rice, pasta, noodles or grains, or 250 g potatoes,
    sweet potatoes or gnocchi.
  - Amounts are as bought. Canned beans count at the can's weight including liquid, so this is
    generous to canned beans. Ingredients without a weight (e.g. "4 chicken thighs") aren't counted,
    and the recipe page says so instead of guessing. Bread, tortillas and flatbreads aren't counted.
- **Search and filters run in the browser** over all recipes, and the filters are kept in the page
  address. Favourites are shared by the household, not per person.
- **Adding and editing recipes in the app** uses the same text format as the recipe files:
  - Ingredients go one per line, with `### Group` headings; steps one per line; make-ahead
    tasks as `Name: what to do`.
  - A live preview shows how each ingredient line is read. Seafood is flagged while typing.
  - Make-ahead names already used in other recipes can be added with a tap, so shared prep
    matches.
  - Editing a recipe that came from a file marks it "edited in the app"; it stays marked as an
    illustrative template if it was one.
  - Deleting asks for confirmation. A deleted file recipe comes back on the next "Load recipes
    from files" unless its file is deleted too; the delete screen says so.
- **A full page load after saving or deleting.** Next.js 16 keeps recently visited pages alive and
  shows them instantly when you return, then swaps in fresh data. Straight after a save that showed
  the old version for a moment, which looks as if the save failed. So save and delete open the next
  page with a normal page load (a fraction of a second slower, always current). Other changes
  (favourites, loading files) mark every page for a refresh, and a briefly outdated view of a page
  you go back to is accepted there.
- **Source links are recognised by address** (YouTube, Instagram or a website name). The recipe
  page says "Watch on YouTube", "Open on Instagram" or "Open on bbcgoodfood.com". Nothing is
  fetched from those sites yet.
- **Phone home screen:** the app has an icon and a web app manifest, so "Add to Home Screen"
  gives it its own name and icon. Pages ask search engines not to index them.
- **Layout check:** `scripts/check-pages.mjs` visits every page at 375 px and 1280 px, reports
  sideways scrolling and errors, and saves screenshots. Run it before pushing changes to pages.

## Decisions for milestone 2 (29 October 2026)

- **In the app, Saketh is shown as "Sunny"** (portion sizes, lunches). Docs keep his full name.
- **Photo and screenshot import:** the free version comes first.
  - A "paste recipe text" box sorts pasted text into the form using rules. Text can come from a
    phone's copy-text-from-photo feature (iPhone Live Text, Google Lens), an Instagram caption or a
    YouTube description.
  - It will be built together with website / Instagram / YouTube import in the capture milestone.
  - Reading photos with the Claude API (about $0.04–0.05 per photo with Anthropic's most capable
    model, needs an Anthropic API key) waits until the free version shows a real need. (Built in
    milestone 4 after all: see "Photo import" below.)
- **Real recipes for testing:** the household's recipes are files in `seed-recipes/`, so suggestion
  rules are checked against them directly (no export step needed).
- **Week plans:** one row per week, named by its first day, in Stockholm time. (Weeks ran Monday to
  Sunday until 31 October 2026; they now run Sunday to Saturday, see below.)
  - Each row holds the setup (evenings and time per evening, dinner portions per person,
    lunches, ingredients to use up) and the chosen dishes (JSON).
  - A new week starts from the previous week's setup, without its "ingredients to use".
  - Time per evening: Quick ≤ 25 min, Normal ≤ 45 min, Relaxed no limit (total recipe time).
  - Two phones editing the same week at the same moment: the last save wins.
- **Suggestion rules** (`src/lib/plan/suggest.ts`). Each candidate recipe gets points for reasons;
  the highest total comes first. The reasons shown on a card are exactly the ones that scored, so
  there is nothing hidden. Points are a first guess, to be tuned after a few real weeks.

  | Reason | Points |
  |---|---|
  | Shares a make-ahead task with a chosen dish (same name, ignoring case, "the/a" and punctuation; at most 2) | +30 each |
  | Uses the rest of a part-used item ("the other half of the pomegranate") | +20 |
  | A fresh ingredient in a real amount that a chosen dish also uses (at most 3) | +8 each |
  | Uses something from "ingredients to use up" (at most 2) | +25 each |
  | Goes to a Quick evening (the next open evening it fits is Quick) | +10 |
  | Good as leftovers, while lunch boxes still need covering | +10 |
  | A favourite | +6 |
  | A cuisine the week doesn't have yet | +6 |
  | Same cuisine **and** same main protein as a chosen dish | −40 |
  | Same cuisine as a chosen dish (per dish) | −8 each |
  | Same main protein as a chosen dish | −10 |
  | Illustrative template recipe | −5 |

  - "Real amount": 30 g / 30 ml or more, or half a countable item or more; teaspoons and
    tablespoons never count. Fresh herbs always count (a bunch goes off fast).
  - Staples (salt, oil, onion, garlic, dried spices) and cupboard goods (rice, pasta, tins, jars,
    sauces) never count as shared ingredients. "Chicken stock" doesn't match "chicken".
  - Never suggested: recipes with seafood, recipes already in the week, recipes marked "Not this
    one", and recipes that don't fit any open evening's time.
  - "May contain fish" and "Needs a Relaxed evening" are shown as notes, not points.
  - The shortlist shows three, avoiding two of the same cuisine where possible. Ties are broken by
    a fixed shuffle per week, so the order doesn't jump around on reload.
  - A new dish goes to the earliest open evening it fits by time (the next empty day, or later
    if that evening is too short). Changed 29 October 2026 after Victoria's feedback: the first
    version sent quick dishes to the tightest (Quick) evening first, which looked like a bug
    ("Add to Friday" when Tuesday was empty). "Quick enough for <day>" (+10) now only shows
    when the dish actually goes to a Quick evening. Moving a dish onto a taken evening swaps
    the two.
- **"Not this one"** lasts until the page is left. It isn't saved, so a dismissed recipe can
  come back next visit. Saving it is cheap to add if it proves annoying.
- **Time to choose** is measured from the first saved dish to the last one added, and shown only
  if it was one sitting (under two hours). It's the check for the brief's "agree on the week in
  10–15 minutes".

## Decisions for milestone 3 (29 October 2026)

- **Scope:** the plan (portions per dish), the shopping list and the Sunday prep list. The prep
  list moved here from milestone 4, because shopping and prep happen on the same Sunday and both
  need the portions. Milestone 2 and 3 are merged into `main` together at the end.
- **Portions per dish** (`src/lib/plan/portions.ts`):
  - Every chosen dish is cooked for one dinner for everyone (the setup's dinner portions added
    up, e.g. Sunny 1.5 + Victoria 1 = 2.5).
  - **A lunch box is the same size as that person's dinner** (Saketh's choice), so a lunch box
    for Sunny is 1.5 portions.
  - Lunch boxes are shared out automatically over dishes marked good as leftovers, one at a time,
    earliest evening first, **at most two per dish** (one dish for dinner and four lunches is
    too much of one thing; this matches the suggestion rule that asks for one leftover-friendly
    dish per two lunch boxes). A dish whose lunch boxes are changed by hand keeps its numbers,
    with no limit; the automatic dishes make up the difference, so − on one dish moves a box to
    another. "Share lunch boxes out automatically" undoes all hand changes.
  - Lunch boxes are counted, not given days, and the app says nothing about how long leftovers
    keep.
  - **Freezer portions:** extra whole portions, offered for freezer-friendly recipes, 0 by default.
  - **Eat again as leftovers:** a leftover-friendly dish can also cover a later open evening. That
    evening counts as chosen, adds one dinner's portions to the dish, and is cleared if something
    is cooked that evening or the dish moves after it.
  - All of this is stored with each chosen dish in the week's existing `dishes` data, so no
    database change was needed. Undo covers it.
- **Scaling a recipe for cooking** (`src/lib/recipes/scale.ts`): the recipe page has a portions
  control (steps of ½); opening a dish from the week opens it at that dish's portions.
  - Grams and millilitres round to 0.5 below 10, to 5 below 100, to 10 below 1,000, then to 50
    (shown as kg or l from 1,000). Spoons, decilitres and pieces round to quarters, or halves from 3.
  - Packs and cans also show their scaled weight ("2¾ packs … (about 1.05 kg in total)").
  - Lines without an amount ("salt, to taste") and lines with reading problems stay as written.
  - **Amounts in the steps** are scaled too (added 29 October 2026, Saketh's request): only a
    number followed by a metric unit ("300 ml", "½ tsp", "1–2 tbsp", "2 dl", "1 litre"), with the
    same rounding, highlighted so it's clear what changed (the original shows on hover). Times,
    temperatures, sizes and counts ("10 minutes", "220°C", "2 cm", "4 tortillas") stay as
    written: scaling those would often be wrong (cooking times don't double with the amount).

- **Shopping list** (`src/lib/plan/shopping.ts`, Week → Shopping):
  - Every chosen dish's ingredients, scaled to its portions (dinner, repeat dinner, lunch boxes,
    freezer). Water is left off.
  - **Adding up:** lines are added together when their names reduce to the same key (case,
    plurals and words like "fresh", "baby", "chopped" ignored; "feta cheese" = "feta",
    "2 garlic cloves" = "1 clove garlic"). Nothing looser: "red onion" and "onion", or "cooked
    lentils" and "red lentils", stay apart because they are different things to buy.
  - **Units:** g/kg together, ml/cl/dl/l together (spoons join them when both appear); cans,
    packs and pieces are counted per unit. A can and grams of the same thing are shown side by
    side ("1 can (390 g) + 200 g"), because a can's label weight isn't what the recipe measures.
  - **Rounding up to buy:** grams and millilitres up to 5 below 100, 10 below 1,000, then 50.
    Pieces, packs and cans up to whole ones, with the exact need shown ("2 (1¼ needed)").
  - **Sections:** fruit and veg, bread, meat, vegetarian protein, dairy and eggs, rice/pasta/
    grains, cans/jars/sauces, nuts/snacks/dried fruit, frozen, other, then "Check the cupboard"
    (salt, pepper, oils, vinegar, sugar, dried spices, stock powder and cubes). Decided by
    keyword rules; unknown items go to "Other". The order is a typical walk through a Swedish
    supermarket; easy to change.
  - **Ticks:** "Bought" and "Have it", plus items added by hand, are stored per week in
    `week_plans.shopping` (an added column). Each tick is a single-key change made inside the
    database, so ticks from two phones never overwrite each other. The other phone sees them
    when the app comes back to the front (no live updates).
  - A tick remembers how much was bought. If the plan later needs **more**, the item comes back
    with a note; the same or less keeps it ticked.
  - No prices, as the brief says.
- **Sunday prep list** (`src/lib/plan/prep.ts`, Week → Sunday prep):
  - The make-ahead tasks of the chosen dishes. The same task name in several dishes (ignoring
    case, "the/a" and punctuation) is one batch, listed first with the dishes and portions it is
    for. Each dish's own instructions for it are shown; identical ones once.
  - For a shared task the app also shows the ingredient lines it works on, scaled per dish
    ("410 g basmati rice (Mon) + 300 g basmati rice (Tue)"). It finds them by the task's main
    word ("rice" in "Cook rice", "onion" in "Quick-pickled red onions"), ignoring cupboard
    staples. Single-dish tasks link to the recipe instead.
  - **Each evening:** the dish and its portions, which parts were done on Sunday (ticked ones
    marked), lunch boxes to pack and portions to freeze after dinner, or "Leftovers … no cooking
    tonight". The recipe's time is shown as written, since the app can't know how much the prep
    saves.
  - Ticks are stored per week in `week_plans.prep` (an added column), one key at a time, like
    the shopping ticks.
  - **No storage times:** the page says the app doesn't know how long prepared food keeps.

## The grocery list as the home page (29 October 2026)

Saketh asked for the grocery list to be the first thing the app opens, because it's used more
often than the planner and things get added through the week. The weekly list should feed it,
and a change in one should show in the other.

- **One list, two views** rather than two lists that copy into each other (copies drift and
  duplicate).
  - **Grocery list (home page, `/`):** things added by hand on any day, plus the ingredients of
    this week's and next week's planned dinners, in one list by supermarket section.
  - **Week → Shopping:** the same dinner ingredients for one week only.
  - The dinner ingredients' "Bought" and "Have it" ticks are stored once per week
    (`week_plans.shopping`), so a tick in either place shows in both.
- **Things added by hand** live in a new household table, `grocery_items`, not in a week. They
  are sorted into sections by the same keyword rules (typed "2 l milk" goes to Dairy), stay
  until removed, and "Remove the bought items you added" clears the ticked ones. Adding is only
  on the home page; the week's Shopping tab points there.
  - The migration copies items already added on a week's Shopping tab into the new table (the
    old data is left in place).
- **Which dinners feed the list:** the week we're in and the next one (Sunday to Saturday,
  Stockholm time). This week's ingredients leave the list once all the dinners needing them have
  passed; amounts stay the whole week's, so ticks match the week's Shopping tab. When both weeks
  have items, each line says "This week" or "Next week".
- **Recipes moved** to `/recipes` (a Recipes link in the menu). On phones the menu shows the
  app icon instead of the words "Meal Planner" so four links fit.

## Decisions for milestone 4: adding recipes (29 October 2026)

- **Scope:** dish photos, importing (website links, pasted text, YouTube, Instagram), the
  normalising layer with a review screen, prep timing (prep days and how far ahead each task can
  be done), and a recipe health check. History (past weeks, repeat a week, liked combinations)
  moves to milestone 5.
- **Sources first:** English recipe websites, Instagram and YouTube (Saketh's answer), then
  others. Recipes may be in English, Swedish, Hindi, Romanian or Russian.
- **Reading and translating with Claude** (Saketh's choice): an import is sent once to Claude
  Haiku 5.5 (`claude-haiku-5-5`, $0.10 / $0.50 per million input / output tokens; roughly 1–3 öre
  per recipe), which returns the recipe in the app's format: English, metric units, flags where a
  conversion is uncertain (a "glass" can be 200 or 250 ml). Needs `ANTHROPIC_API_KEY` in Vercel.
  The review screen says the recipe was read and translated automatically and must be checked.
  The suggestion rules stay plain rules; Claude only reads recipes.
- **After Claude, the app's own rules** check and tidy the result the same way for every source:
  units, names matched to ones already used, the seafood check, suggested make-ahead tasks from
  existing names, and the fields the suggestion rules need.
- **Import screen** (Recipes → Import): paste text in any language plus where it's from; Claude
  reads it; the normalising rules run; the normal recipe form opens pre-filled under a "Check
  before saving" box (what to fill in, what to check, seafood, what the app changed). Suggested
  make-ahead tasks are one tap in the form. Nothing is saved until "Save recipe".
  - Remembering corrections made in the review was planned, but with Claude translating it only
    pays off if the same fix keeps coming up; it is in `docs/IDEAS.md` until then.
- **Links** (`src/lib/import/sources.ts`): a website link is fetched by the server and the
  recipe is read from the page's schema.org Recipe block (JSON-LD), sent to Claude as short clean
  text; without such a block, the page's visible text is sent instead. Pasted text always wins
  over fetching. YouTube and Instagram don't let apps read descriptions or captions, so those are
  pasted.
  - **YouTube** (corrected 29 October 2026; the first version wrongly said apps can't read
    descriptions): with `YOUTUBE_API_KEY` set, the official YouTube Data API v3 (`videos.list`,
    part snippet; free, 1 unit of the 10,000-unit daily allowance per import) gives the title,
    channel, description and thumbnail, and Claude reads the recipe from the description. If the
    description has no recipe (it's only said out loud), the app says so and asks for it to be
    pasted or typed. Pasted text always wins. Without the key, the description is pasted and the
    public oEmbed adds title, channel and thumbnail.
  - **Fetching safely** (`src/lib/import/fetch-page.ts`): only plain http(s) addresses on the
    public internet, checked again after every redirect (no localhost, home networks or cloud
    metadata addresses); 10 seconds and 3 MB per page, 8 MB per picture.
  - **Photos from imports:** the page's or video's photo is shown in the review with "Use this
    photo". After saving, the server fetches it and the phone shrinks it like any other photo
    (no image library on the server, so nothing new to break on Vercel).
- **The normalising rules** (`src/lib/import/normalise.ts`), applied to every import after it is
  read, listing each change, guess and gap for the review screen:
  - US units to metric: cups (taken as 240 ml, flagged: sizes vary and dry food is better
    weighed), ounces, pounds, fluid ounces, pints (US, flagged), quarts, sticks of butter (113 g,
    flagged), "(14 oz)" can sizes; °F to °C (to the nearest 10, as oven dials go) and inches to cm
    in the steps. Rounded like the kitchen amounts.
  - US names to the ones used here: cilantro → coriander, ground beef → beef mince, scallions →
    spring onions, heavy cream → double cream, all-purpose flour → plain flour, and a few more.
  - Cuisine takes the household's spelling when it's the same cuisine ("Mexican" →
    "Mexican-inspired"). Main protein (heaviest protein ingredient) and diet (meat if any meat,
    vegetarian if any dairy/egg/honey, otherwise vegan) are guessed and marked as guesses.
  - Missing title, servings, time, cuisine, "good as leftovers" and "freezer-friendly" are listed
    as questions; they are never filled in silently.
  - Make-ahead tasks are offered under names at least two household recipes already share, when
    the new recipe has all of the task's key ingredients ("Garlic yoghurt" needs garlic and
    yoghurt). One tap adds one.
  - The seafood check runs as for every recipe.
- **Photos are stored in the database,** shrunk on the phone first (about 1,200 px, roughly
  150 KB), so there is no extra service to set up. A few hundred photos fit easily in the free
  database.
- **Prep timing (built):** prep days are chosen in the week setup (Saturday means the Saturday before
  the week; default Sunday and Wednesday). Each task goes on the latest prep day on or
  before its dinner that is within its "at most N days ahead" limit, otherwise on the day of the
  dinner; the same task on the same prep day is one batch. Limits are set per task name in
  Settings → Prep limits (on the day, or 1–6 days ahead), checked on the server, and can never be
  longer than published guidance. Old ticks from before prep days don't carry over.
- **Food-safety guidance for prep limits** (29 October 2026, read from the sources themselves; the
  table is `src/lib/plan/food-safety.ts`):
  - **Livsmedelsverket gives no limit per food.** Its pages say cooked food in the fridge "often
    keeps several days, sometimes up to about a week", mainly depending on the fridge's
    temperature (4 °C), if it is cooled quickly and kept covered. That can't be planned with.
  - **So the day limits come from the UK Food Standards Agency** ("a similar official source", as
    agreed), which gives them: cooked rice no more than one day in the fridge (Home food fact
    checker), and other cooked leftovers within two days (How to chill, freeze and defrost food
    safely). Both are stricter than Livsmedelsverket's advice. Settings shows both agencies' own
    words with links.
  - **Which tasks they cover is decided from the task's name:** a cooking word (cook, roast, bake,
    simmer, fry, boil, steam, grill…) means cooked food; with "rice" as well, the rice rule. Raw
    prep (chopping, pickling, marinating, mixing mince, sauces like tzatziki) isn't covered by
    either rule and stays "on the day" until the household sets a limit. A cooked task whose name
    doesn't say so ("Harissa bulgur") is also left to the household; renaming it "Cook harissa
    bulgur" would bring it under the guidance.
  - **"1 day ahead" means the day before the dinner,** so rice cooked on Sunday afternoon for
    Monday's dinner can pass 24 hours; Settings suggests cooking it late on the prep day.
  - The household can choose stricter limits than the guidance, never longer ones.
- **Photo import** (30 October 2026, Saketh: "Add it now"). On Import, up to 4 photos (cookbook
  pages, a handwritten recipe, screenshots of a post), taken or chosen on the phone:
  - **Shrunk on the phone** to about 2,000 px on the long side (JPEG, under 900 KB each), larger
    than dish photos so small print stays legible, and still within what the model reads without
    downscaling (2,576 px / 4,784 image tokens).
  - **Cost:** an image costs ⌈width ÷ 28⌉ × ⌈height ÷ 28⌉ tokens, so a 1,500 × 2,000 photo is
    3,888 tokens, about $0.0004 at Claude Haiku 5.5's $0.10 per million input tokens (Anthropic's
    vision and pricing pages, read 29 October 2026). A photo import costs about the same as a text
    import.
  - **Sent with the link and text** in one request (Next.js's server-action limit raised to 4 MB;
    Vercel accepts 4.5 MB). With photos, a link is kept only as the source and isn't fetched.
  - **Never stored:** the photos are read and then dropped; they show on the review screen to
    compare against. A dish photo is still added on the recipe page.
  - **Nothing unreadable is guessed:** Claude writes "?" for what it can't make out, and the review
    screen asks for every line or step with a "?".
  - **One photo button with a menu** (*Take photo* / *Choose from gallery*, and *Remove photo* on a
    recipe page), the same for import and dish photos. Android's Chrome offers only the gallery
    unless a web page asks for the camera directly, and two separate buttons cluttered the page
    (Saketh, 30 October). Computers see only the choose option. An in-app camera like WhatsApp's is
    in `docs/IDEAS.md`.
- **Recipe check** (Settings → Recipe check, `src/lib/recipes/health.ts`): lists recipes with no
  make-ahead tasks, lines the app can't fully read, no cuisine or main protein, seafood, or that
  are illustrative templates; and make-ahead tasks that work on the same things under different
  names ("Cook rice" / "Make rice"). It points to the recipes rather than renaming them for you:
  the household's recipes have no such near-duplicates today, and a rename of a recipe from a
  file would mark it as edited in the app. A one-tap rename stays in `docs/IDEAS.md` for when
  duplicates appear.
- **Prep timing (plan):** Sunday and Wednesday are prep days by default (a setting). Each make-ahead task
  has a "done at most N days ahead" limit, taken from published food-safety guidance
  (Livsmedelsverket, the Swedish Food Agency, or a similar official source) with the source shown;
  tasks the guidance doesn't cover default to "on the day" until the household sets them. The app
  never makes up storage times. (Built as above; the limits ended up from the UK agency.)

## Look and feel (30 October 2026)

The first look (cream background, terracotta orange, serif headings) felt "very Claude-y" to
Saketh. He compared four directions rendered side by side and chose the fourth, "D", which
replaces the brief's "warm" look:

- **Modern and minimal:** black and white with grey for quiet details. Headings are extra bold in
  Inter Tight; text is Inter. The main buttons are black pills.
- **Cards:** a light grey page with white rounded cards, thin lines and no shadows.
- **A colour per part of the app,** earthy, for the page title and the menu underline:
  - Groceries: forest green `#166534`
  - Recipes: aubergine `#6b3a5b`
  - Week: deep teal `#2f5d62`
  - Settings: ochre `#8a6a1f`
- **Status colours:** green for good things, soft yellow for hints, red for warnings.
- **Logo, "Grin":** a bowl of soup as a smiling mouth, with two wisps of steam as the eyes, in black
  on sunny yellow `#ffc83d`, the classic smiley colour. (The first version was white on black,
  which Saketh found sad; he picked yellow from 13 options on 30 October.) Yellow is used only for
  the logo, so the page colours stay the app's only other colour.
- **Name: Forkcast** (Saketh, 30 October 2026), replacing "Meal Planner" everywhere the household
  sees it: the browser tab, the home-screen name, the menu and the sign-in page. The code, the
  GitHub repository and the Vercel project keep the name `meal-planner`; renaming those changes
  addresses and connections for no visible gain.
- **Colours are named for what they do** in `src/app/globals.css`: `soft`, `paper`, `ink`, `muted`,
  `line`, `accent`, `good`, `note`, `danger`, plus the four page colours. Pages use them as
  classes such as `bg-soft` or `text-recipes`.

## Weeks run Sunday to Saturday (31 October 2026)

Saketh: "the week needs to start from Sunday because that's when prep happens."

- **The week:** Sunday to Saturday, named by its Sunday. Day 0 is Sunday, so Sunday's prep and
  Sunday's dinner belong to the week they start.
- **The default setup:**
  - cooking Monday to Friday, as before; Sunday and Saturday relaxed
  - prep days Sunday and Wednesday
  - Saturday as a prep day means the Saturday before the week, since one at its end would come
    after every dinner
- **Weeks saved before the change** ran Monday to Sunday and are named by their Monday. The first
  time a Sunday week is opened, it is built from the old weeks it overlaps and saved as a new row
  (`src/lib/plan/old-weeks.ts`):
  - Monday to Saturday come from the week starting the next day.
  - The Sunday dinner comes from the end of the week before.
  - Setups, shopping ticks and prep ticks are turned around to match.
  - The old rows are only read, never changed.
- **Shared database:** this keeps the change safe while preview and production share one database.
  The production app (Monday weeks) never sees the new Sunday rows. Its only overlap: a brand-new
  week there could copy its setup from a Sunday row a preview saved, with its evenings off by a
  day, until this is merged.

## Milestone 5: history (2 November 2026)

Saketh chose three parts: past weeks with "repeat a week", liked combinations, and "not again so
soon". The trend of how long choosing takes was left out.

- **Past weeks live inside the choosing screen** (*Repeat a past week*, next to *Browse all
  recipes*), not on a page of their own: repeating is a way to choose, and inside the chooser it
  joins the same *Undo* and saving as every other pick.
- **Repeating a week** (`src/lib/plan/history.ts`):
  - Each dinner goes on the same evening if that evening is cooked on and free. Then its leftovers
    evening, if that is free too. Then dinners whose evening was taken go on the earliest free
    evening they fit by time. Placing the dinners that keep their evening first stops a moved
    dinner from taking another dinner's evening.
  - Dinners already chosen stay. A dinner with no free evening left is not added, and the
    message names it. Recipes deleted since, recipes now containing seafood, and recipes
    already in the week are left out.
  - Lunch boxes and freezer portions are not copied: this week's setup may differ, so they are
    shared out afresh.
  - Repeated dinners are saved as added by "repeat", next to "start", "suggestion" and "browse".
- **The list** covers the half year before the week shown (26 weeks), weeks with at least one
  dinner, newest first. Weeks saved the old way (Monday to Sunday) are read as Sunday weeks the
  same way opening them would, but listing them saves nothing.
- **Liked combinations** (`src/lib/plan/liked.ts`, table `liked_combinations`): Saketh chose to
  pick them from a week.
  - Under the week's dinners, *Save dishes that went well together* asks which 2 or 3 of the
    week's dishes went well together. Two or three keep it a real pairing; a whole week is what
    *Repeat a past week* is for. The same recipes saved again are kept once.
  - They are used two ways, always marked with ♥ and "your combination", apart from the rules'
    ✓ reasons:
    - **A starting point:** when a week has no dinners yet, they are offered first (*Add these*).
      Later, *Combinations you liked* adds the dishes not chosen yet.
    - **A suggestion reason:** "You liked this with Korean BBQ pork" (25 points, like using an
      ingredient you want to use up). It counts only when a dish from the combination is
      already in the week.
  - Deleted recipes and recipes now containing seafood drop out. A combination left with fewer
    than two dishes is hidden. *Forget* removes one.
- **Not again so soon** (`recentDinners` in `history.ts`, a rule in `suggest.ts`): a dinner from the
  week before loses 15 points, one from two weeks before 8, and the card says so ("You had this
  the week before."). Browse all recipes shows the same. It is a nudge, not a ban: a dish that
  shares prep with one already chosen can still come first, and repeating a week on purpose is
  unaffected. Weeks are counted from the week being planned. Dishes never put on an evening
  don't count, since they weren't eaten.
- **Older app versions** reject a week with a "repeat" or "liked" dinner when saving it again.
  That only mattered while preview and production shared a database; production gets this code
  when it is merged.

## Product decisions

1. **Backend is fine.** Use it for URL import and so both phones see the same recipes, plan and
   shopping list.
2. **Keep history.** Store past weekly plans and meal combinations the couple marked as liked.
   These should make week 4 faster than week 1 (e.g. "repeat a past week", "start from a liked
   combination").
3. **Portion sizes vary per person.** Saketh eats more than Victoria and takes most lunch leftovers.
   Portions are set per person (dinner) and per lunch, not as identical servings. Shopping
   quantities follow from that.
4. **English throughout**, including ingredient names on the shopping list.
5. **Recipes come from Saketh.** The three `_template-` files in `seed-recipes/` are format examples
   to be deleted later. Recipes must be labelled with their real source; templates are labelled
   illustrative.
6. **Protein-rich / carb-focused labels** are computed from ingredients with a rule that is shown to
   the user (e.g. a main protein source in a meaningful amount per portion). No invented gram-level
   nutrition figures.

## Recommended build order (Saketh can override)

The riskiest assumption is that connected suggestions make choosing easier. Recipe import is a
solved problem in other apps. So test the risky part early:

1. **Foundation:** project setup, database, passcode, seed loader, recipe collection (browse,
   search, filters, detail, favourites, manual add/edit). Deployed to Vercel.
2. **Choosing a week:** weekly setup (evenings, time per evening, portions, optional "ingredients to
   use") and guided selection (anchor dish → three explained suggestions, undo/swap).
3. **Executing the week:** weekly plan (move/swap, time conflicts, lunch and freezer allocations),
   consolidated shopping list with checkboxes.
4. **Capture and prep:** URL import with review, photo/link entries, Sunday prep checklist, saved
   combinations, past weeks. (As built: the Sunday prep list came in milestone 3; importing,
   photos and prep timing are milestone 4; saved combinations and past weeks are milestone 5.)

## Success measures

- From the brief: agree on 4–5 dinners in about 10–15 minutes; a credible shopping list and prep
  plan.
- Added: **still using it in week 4.** The original routine broke down over weeks, not in one
  session, so one fast session doesn't prove the problem is solved.
