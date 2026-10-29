# Status

Last updated: 29 October 2026, end of milestone 2 (Choosing a week).

## Where the app is

- **Preview** (the latest work in progress):
  https://meal-planner-git-claude-youthful-newton-o8dps0-sunny199x.vercel.app (needs a Vercel login
  in the browser).
- **Production** (what Victoria uses): the address under *Domains* in the Vercel project. It has
  what is merged into `main`: milestone 1 now, milestone 2 once its pull request is merged.
- Both ask for the household passcode (`HOUSEHOLD_PASSCODE` in Vercel). Preview and production
  share one Neon database, so recipes added in one show up in the other.

## What works

- **Passcode sign-in.** Each phone stays signed in for 90 days. Changing the passcode or
  `SESSION_SECRET` in Vercel signs everyone out.
- **Recipe collection:**
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
  - times, servings, freezer and leftover notes
  - source, with a "Watch on YouTube" / "Open on Instagram" / website link
  - labels, with the reason shown ("62.5 g red lentils per serving")
  - grouped ingredients, steps, make-ahead tasks and notes
- **Favourites**, shared by both phones.
- **Adding, editing and deleting recipes** in the app:
  - Same format as the recipe files.
  - Live preview of how each ingredient line is read.
  - Live seafood warning.
  - Tap-to-add make-ahead names already used elsewhere.
- **Recipe files** in `seed-recipes/`: Settings → *Load recipes from files* adds and updates them
  and reports problems line by line. Settings → *Reset everything* starts over (type RESET).
- **Seafood rule:** recipes with seafood get a red warning. Ingredients that often contain fish
  (Worcestershire sauce, curry pastes) get "may contain fish".
- **Week tab (choosing a week):**
  - Arrows move between weeks; it opens on the coming week (Monday to Sunday).
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
  - Choices save as you go; both phones see the same week.
- **Phones:** every page works at 375 px wide. "Add to Home Screen" gives the app its own icon.

## Not built yet (and labelled in the app where it shows)

- The week as a plan to cook from, the shopping list and the Sunday prep list, with portions
  scaled per person: milestone 3. The Week tab says so once the week is full.
- Reading a recipe automatically from a website link, and attaching photos: milestone 4. The Add
  page says so.
- Pasting recipe text (for example from a photo via iPhone Live Text or Google Lens) and having
  it sorted into the form: milestone 4, together with link import.
- Instagram: link only, by design; the recipe has to be typed.
- YouTube: link only for now. Fetching the video title and thumbnail is planned for milestone 4.
- TikTok: not supported (not used).
- Named collections beyond favourites and tags.
- Recipe photos on cards: cards use a coloured tile with the first letter instead.

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

## Next

Milestone 3 (using the week): the chosen week as a plan to cook from, a shopping list that adds
up quantities across dishes and portions, and a Sunday prep list that batches shared make-ahead
tasks. Before that, try choosing one or two real weeks: the points are easier to tune with real
feedback.
