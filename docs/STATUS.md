# Status

Last updated: 29 October 2026, end of milestone 1 (Foundation).

## Where the app is

- **Preview** (the latest work in progress):
  https://meal-planner-git-claude-youthful-newton-o8dps0-sunny199x.vercel.app (needs a Vercel login
  in the browser).
- **Production** (what Victoria uses): the address under *Domains* in the Vercel project, after
  the milestone 1 pull request is merged into `main`.
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
- **Phones:** every page works at 375 px wide. "Add to Home Screen" gives the app its own icon.

## Not built yet (and labelled in the app where it shows)

- Weekly setup, the three-suggestion shortlist, the weekly plan, shopping list and Sunday prep
  list: milestones 2–4.
- Portion scaling: comes with per-person portions and the shopping list (milestone 3).
- Reading a recipe automatically from a website link, and attaching photos: milestone 4. The Add
  page says so.
- Instagram: link only, by design; the recipe has to be typed.
- YouTube: link only for now. Fetching the video title and thumbnail is planned for milestone 4.
- TikTok: not supported (not used).
- Named collections beyond favourites and tags.
- Recipe photos on cards: cards use a coloured tile with the first letter instead.

## Known limitations

- **Labels are a rule of thumb.** "Protein-rich" and "carb-focused" use ingredient weights per
  serving (see `docs/DECISIONS.md`). Ingredients without a weight ("4 chicken thighs") can't be
  counted; the recipe page says so. Canned beans count at the can's weight, including liquid.
- **One database for preview and production.** Database changes must only add things until this
  is revisited (before weekly use).
- **Briefly outdated pages.** Next.js shows pages you return to instantly and then refreshes them,
  so a change made on the other phone, or a new favourite, can take a moment to appear. After
  saving or deleting, the next page always loads fresh.
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

## Next

Milestone 2 (choosing a week) tests the main idea: weekly setup, then an anchor dish and three
explained suggestions that update after each pick. It needs real recipes with real overlap
(shared ingredients in meaningful amounts and shared make-ahead names). About 10–15 real
recipes is a sensible minimum before testing it.
