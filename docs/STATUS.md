# Status

Last updated: 29 October 2026, end of milestone 3 (Using the week).

## Where the app is

- **Preview** (the latest work in progress):
  https://meal-planner-git-claude-youthful-newton-o8dps0-sunny199x.vercel.app (needs a Vercel login
  in the browser).
- **Production** (what Victoria uses): the address under *Domains* in the Vercel project. It has
  what is merged into `main`: milestone 1 now; milestones 2 and 3 once their pull request is merged.
- Both ask for the household passcode (`HOUSEHOLD_PASSCODE` in Vercel). Preview and production
  share one Neon database, so recipes added in one show up in the other.

## What works

- **Grocery list (the home page):** what to buy now, in one list by supermarket section.
  - Add anything on any day ("milk", "2 l milk"); it lands in the right section and stays until
    you remove it. Bought items you added can be cleared in one tap.
  - The ingredients of this week's and next week's chosen dinners are on it too, with the same
    ticks as Week → Shopping: tick in either place and both show it. This week's ingredients
    leave once their dinners have passed.
  - Shared by both phones; the other phone sees changes when the app comes back to the front.

- **Passcode sign-in.** Each phone stays signed in for 90 days. Changing the passcode or
  `SESSION_SECRET` in Vercel signs everyone out.
- **Recipe collection** (the Recipes tab):
  - Cards show time, cuisine, diet and labels.
  - Instant search over titles, cuisines, tags and ingredients.
  - Filters:
    - cooking time
    - vegetarian / vegan / meat
    - cuisine and tag
    - favourites
    - protein-rich and carb-focused
    - freezer-friendly and good as leftovers
    - includes / leaves out an ingredient
  - Filters are kept in the address.
- **Recipe page:**
  - a portions control (− / +) that scales the ingredient amounts and the amounts in the steps
    (highlighted); opening a dish from the week shows it at that dish's portions
  - times, servings, freezer and leftover notes
  - source, with a "Watch on YouTube" / "Open on Instagram" / website link
  - labels, with the reason shown ("62.5 g red lentils per serving")
  - grouped ingredients, steps, make-ahead tasks and notes
- **Favourites**, shared by both phones.
- **Dish photos:** on a recipe page, *Add photo* takes a picture or picks one from the phone. It
  is shrunk on the phone (about 1,200 px) before it is saved, and shows on the recipe cards, the
  recipe page, the week's suggestion cards and *Browse all recipes*. Photos are behind the
  passcode like everything else.
- **Importing a recipe** (Recipes → Import): paste a link to a recipe website (read from the page
  directly), a YouTube link plus its description, an Instagram link plus its caption, or any
  recipe text, in any language. The website's or video's photo can come along. Claude reads it and writes it
  in English with metric units (about 1–3 öre per recipe); the app's own rules then match units,
  names, cuisine and make-ahead tasks to the household's recipes. You check everything in the
  normal recipe form before saving. Needs `ANTHROPIC_API_KEY` in Vercel.
- **Adding, editing and deleting recipes** in the app:
  - Same format as the recipe files.
  - Live preview of how each ingredient line is read.
  - Live seafood warning.
  - Tap-to-add make-ahead names already used elsewhere.
- **Recipe check** (Settings): recipes that won't work well with the suggestions yet (no make-ahead
  tasks, unreadable lines, no cuisine or protein, seafood, templates) and probably-duplicate
  make-ahead names.
- **Recipe files** in `seed-recipes/`: Settings → *Load recipes from files* adds and updates them
  and reports problems line by line. Settings → *Reset everything* starts over (type RESET).
- **Seafood rule:** recipes with seafood get a red warning. Ingredients that often contain fish
  (Worcestershire sauce, curry pastes) get "may contain fish".
- **Week tab:** arrows move between weeks; it opens on the coming week (Monday to Sunday). Three
  parts: **Dinners**, **Shopping** and **Sunday prep**.
- **Dinners (choosing a week):**
  - **Setup:** which evenings you cook and how much time each has (Quick ≤ 25 min, Normal
    ≤ 45 min, Relaxed), dinner portions and lunch boxes for Sunny and Victoria, and ingredients
    to use up. A new week copies last week's setup, minus the ingredients.
  - **Choosing:** pick a first dish from a few options or by browsing, then get three suggestions
    with the reasons they fit (shared Sunday prep, the other half of an ingredient, shared fresh
    ingredients, things to use up, quick enough, good for lunches, variety). Each card can be
    added or dismissed with *Not this one*; *Show others* gives the next three; *Browse all
    recipes* finds any recipe.
  - **Your week:** dishes per evening, with a menu to move one (moving onto a taken evening swaps
    them), × to remove, *Undo*, a warning if a dish is too long for its evening, and what is still
    open (evenings, lunch boxes).
  - When every evening has a dish: "All N dinners chosen", and how many minutes choosing took.
  - **Portions per dish:** "Cook 5½ portions: dinner 2½ · Sunny's lunch ×2 (3)". A lunch box is
    the size of that person's dinner. Lunch boxes are shared out automatically over dishes that
    are good as leftovers (at most two per dish). *Change* on a dish moves lunch boxes, adds
    freezer portions (freezer-friendly dishes) or plans the dish again as leftovers on a later
    open evening.
  - Choices save as you go; both phones see the same week.
- **Shopping** (one week's dinners; also on the grocery list for this week and next):
  - Ingredients of all chosen dishes, scaled to their portions and added up per ingredient,
    grouped by supermarket section, with a "Check the cupboard" group for salt, oils and spices.
  - Rounded up to what you can buy ("2 (1¼ needed)"); a can and grams of the same thing are
    shown side by side.
  - *For Mon, Wed* on an item shows which dishes need how much.
  - Tick **Bought**, or **Have it** for things already at home. Ticks are shared by both phones
    and with the grocery list. If the plan later needs more of something ticked, it comes back
    with a note. Other things to buy are added on the grocery list.
- **Prep (Week → Prep):**
  - Prep days are set in the week setup (default Sunday before the week and Wednesday). Each
    make-ahead task goes on the latest prep day within how far ahead it may be done, or on the day
    of the dinner; the same task on the same day is one batch, with the amounts each dish needs.
  - "How far ahead" limits are set per task in Settings → Prep limits. Until a task has one, it is
    done on the day. Published guidance isn't in the app yet (see Known limitations).
  - Tick tasks off; ticks are shared by both phones.
  - Each evening: what was done on Sunday, the rest to do, lunch boxes to pack and portions to
    freeze, or an evening of leftovers with no cooking.
- **Phones:** every page works at 375 px wide. "Add to Home Screen" gives the app its own icon.

## Not built yet (and labelled in the app where it shows)

- Saved meal combinations and past weeks ("repeat a past week"): milestone 4.
- Reading a recipe automatically from a website link, and attaching photos: milestone 4. The Add
  page says so.
- Pasting recipe text (for example from a photo via iPhone Live Text or Google Lens) and having
  it sorted into the form: milestone 4, together with link import.
- Instagram: link only, by design; the recipe has to be typed.
- YouTube: link only for now. Fetching the video title and thumbnail is planned for milestone 4.
- TikTok: not supported (not used).
- Named collections beyond favourites and tags.
- Photos from a recipe's website or a YouTube thumbnail: with link import (milestone 4).
  Recipes without a photo show a coloured tile with the first letter.
- Prices: none, by design.

## Known limitations

- **Labels are a rule of thumb.** "Protein-rich" and "carb-focused" use ingredient weights per
  serving (see `docs/DECISIONS.md`). Ingredients without a weight ("4 chicken thighs") can't be
  counted; the recipe page says so. Canned beans count at the can's weight, including liquid.
- **Suggestion points are a first guess.** The rules and points are listed in
  `docs/DECISIONS.md`. They only find overlap the recipe files contain: shared prep needs the
  same make-ahead name in both recipes ("Cook rice" in both, not "Cook rice" and "Make rice").
- **One database for preview and production.** Database changes must only add things until this
  is revisited (before weekly use). Choosing a week on the preview changes the real week too.
- **Briefly outdated pages.** Next.js shows pages you return to instantly and then refreshes them,
  so a change made on the other phone, or a new favourite, can take a moment to appear. After
  saving or deleting, the next page always loads fresh.
- **Choosing on both phones at once.** The other phone sees changes after reopening the Week tab,
  not live. If both change the same week at the same moment, the last save wins.
- **"Not this one" is forgotten** when you leave the Week tab; the recipe can be suggested again.
- **Shopping list adding-up is cautious.** Only names that reduce to the same thing are added
  together, so "red onion" and "onion" stay apart, and a few lines you'd merge by hand may stay
  separate. Sections come from keyword rules; anything unknown goes to "Other". Pack sizes are
  not known, so small amounts (20 g curry paste) are shown as written.
- **Grocery list:** the same ingredient from a dinner and from something you typed ("rice")
  shows as two lines. Only this week and next week feed the list.
- **Shopping and prep ticks** reach the other phone when the app is opened or comes back to the
  front, not live while both are looking at it.
- **Scaled recipe steps:** amounts with a unit ("300 ml", "½ tsp") are scaled and highlighted;
  times, temperatures and counts ("10 minutes", "4 tortillas") stay as written, and pan sizes
  aren't adjusted.
- **No food-safety guidance in the app yet:** the prep limits are the household's own until
  Livsmedelsverket's guidance can be read and added with its source (this session can't reach the
  site). Until then, a task without a limit is planned for the day of the dinner.
- **Prep amounts** for a shared task are found by its main word ("rice" in "Cook rice"); a task
  like "Chop aromatics" shows no amounts. The app never says how long prepared food keeps.
- **First load after a quiet spell** can take a second or two (the free Neon database sleeps).
- **The passcode** keeps strangers out; it is not bank-level security.
- **The three template recipes** are illustrative and untested. Delete their files once real
  recipes are in, then press *Load recipes from files*.

## Demo for Victoria (about 3 minutes)

1. Open the production address, enter the passcode, and choose "Add to Home Screen".
2. Search "daal", then clear it. Tap **Filters** → **Vegetarian** → **≤ 45 min**.
3. Open a recipe: point out the labels and why they apply, and the make-ahead tasks.
4. Tap the heart. It shows on both phones.
5. Tap **Add** and paste a real recipe. Watch the "How the app reads them" box, then save.

### Choosing a week together (about 10 minutes, the real test)

1. Sit together with one phone. Tap **Week**. Tick the evenings you'll cook and set Quick /
   Normal / Relaxed for each. Check portions and lunch boxes. Type anything that needs using up.
   Tap **Save setup**.
2. Pick a first dish you both want.
3. Read the three suggestions out loud. Do the reasons make sense? Add one, or tap **Not this
   one**. Repeat until the week is full.
4. Note the "Chosen in N minutes" line, and anything that felt wrong (a bad suggestion, a missing
   reason, a reason that wasn't true). That feedback tunes the points.
5. Check the portions under each dish. Tap **Change** on one to move a lunch box or plan it again
   as leftovers.

### Sunday (shopping and prep)

1. **Groceries** (the home page): tap **Have it** for what's already at home (start with "Check
   the cupboard"), and add anything else you need. In the shop, tick items as they go in the
   basket. The other phone sees the ticks when it is opened.
2. **Sunday prep** tab: work down the list; shared tasks come first. Tick each one off.
3. During the week, open **Sunday prep** → *Each evening* to see what's left to do tonight and
   which lunch boxes to pack.

## Next

1. Merge milestones 2 and 3 into `main` so Victoria has them on the production address.
2. Use the app for one or two real weeks and note what feels wrong in `docs/IDEAS.md`.
3. Milestone 4 (capture and history): reading recipes from website links (with their photos),
   Instagram and YouTube links, the free "paste recipe text" import, saved meal combinations and
   past weeks. Before weekly use, revisit the shared preview/production database.
