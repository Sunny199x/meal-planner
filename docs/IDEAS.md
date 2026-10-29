# Feedback and future ideas

A running list of feedback from using the app and ideas for later. Nothing here is promised or
scheduled until it moves into a milestone plan. Newest first within each section.

Status: **Open** (not decided), **Planned** (has a milestone), **Done**, **Dropped**.

## From using the app

### Normalise imported recipes so they fit the suggestion rules (Planned: milestone 4)

*Saketh, 29 October 2026, after milestone 3.*

A layer between an imported recipe (website, Instagram caption, YouTube description, pasted
text) and how it is stored, so every recipe has the same structure as the hand-written ones and
the suggestion rules, shopping list and prep list work on it.

Why: the rules rely on things imports usually lack or write differently.

- **Make-ahead tasks** (the strongest link, +30) aren't on recipe websites at all.
- **Language:** hellofresh.se pages are in Swedish ("basmatiris", "gurka"); the household's
  recipes are in English, so names wouldn't match and the shopping list couldn't sort them.
- **Fields:** "good as leftovers", "freezer-friendly" and main protein are rarely given; cuisine
  is written in many ways ("Mexican", "Tex-Mex", "Mexican-inspired").

What the layer does, before anything is saved:

1. **Reads** the source into the app's recipe format (the same as the files in
   `seed-recipes/`), keeping the original text alongside.
2. **Normalises ingredient lines:**
   - metric amounts and units
   - English names: Swedish food words are translated from a word list, and names are matched
     to ones the household's recipes already use ("baby spinach", not "spinach leaves")
   - lines it can't read are flagged, never guessed
3. **Fills the fields the rules need,** with a suggestion where it can and a question where it
   can't: cuisine (picked from the existing list), main protein, diet, total time, servings,
   good as leftovers, freezer-friendly.
4. **Suggests make-ahead tasks** from the names already in use (it has rice → "Cook rice?"), so
   shared prep links up. One tap to accept.
5. **Checks** for seafood, as for every recipe.
6. **Review screen:** shows what was changed and what is missing; the recipe is saved only
   after you confirm. Corrections you make (a Swedish word, a name) are remembered for the
   next import.

Related:

- The same checks can run on recipes added by hand or from files: a "recipe health check" in
  Settings listing recipes with missing fields, no make-ahead tasks, or unrecognised names.
- This also covers the near-duplicate make-ahead names item below.
- Translation is rule-based (a word list that grows with corrections). Using the Claude API
  instead would handle more but costs money per recipe and needs an API key; only if the word
  list proves too limited.

### Show a photo of each dish when choosing (Done for your own photos; website photos with import)

*Saketh, 29 October 2026, after milestone 2.*

Show the dish's photo on the "Pick a first dish" options, the suggestion cards, *Show others* and
*Browse all recipes* (and on the recipe cards in the collection).

- No recipe has a photo yet; cards show a coloured tile with the first letter instead.
- Photos would come from:
  - **Website links:** the page's own recipe photo, read when the recipe is imported. All 15
    HelloFresh recipes have a website link, so a Settings button could fetch their photos in one
    go. This uses the same page reading as link import, so it belongs with milestone 4.
  - **YouTube links:** the video thumbnail, which can be worked out from the link.
  - **Your own photo:** uploading from the phone needs file storage (for example Vercel Blob,
    which has a free allowance). Milestone 4, with "attaching photos".
  - **Instagram:** can't be read reliably; upload a screenshot instead.
- Hotlinking a recipe site's photo is fine for a private household app, but the photo can
  disappear if the site changes it. Keeping our own copy avoids that and needs the same storage
  as uploads.

### Shared prep only matches identical make-ahead names (Open)

*Saketh, 29 October 2026, after milestone 2.*

Suggestions only connect two recipes through Sunday prep when both use exactly the same
make-ahead name: "Cook rice" in both counts, "Cook rice" and "Make rice" don't. A near-miss
silently loses the strongest reason.

What exists: the recipe form offers make-ahead names already used elsewhere, so new recipes can
reuse them with a tap.

Options:

1. **A "Make-ahead names" page** (cheapest, no false matches): list every name with the recipes
   that use it, and flag near-duplicates ("Cook rice" / "Make rice", "Pickle onions" / "Quick
   pickled onions") with a one-tap rename.
2. **Warn while typing** in the recipe form: "Did you mean *Cook rice* (used by 4 recipes)?"
3. **Looser matching** in the suggestion rules (same key words). Catches more, but can connect
   things that aren't really the same batch, and the reason shown must stay true. Not
   recommended on its own.

Options 1 and 2 together keep the rule strict and the names tidy.

### The grocery list as the home page, fed by the weekly plan (Done)

*Saketh, 29 October 2026.* The app opens on the grocery list: things added through the week
plus this week's and next week's dinner ingredients, with ticks shared with Week → Shopping.
See `docs/DECISIONS.md`.

### Scale the amounts in the recipe steps (Done)

*Saketh, 29 October 2026.* Amounts with a metric unit in the steps ("300 ml water", "½ tsp
salt") now follow the portions control and are highlighted. Times, temperatures and counts stay
as written.

## Noticed while building milestone 3 (Open)

Small things that may or may not matter once the app is used for real weeks:

- **Supermarket section order:** the shopping list follows a typical Swedish supermarket. It
  could follow your own shop's layout instead.
- **Live ticks while shopping together:** ticks reach the other phone when the app is opened or
  comes back to the front. If you split up in the shop, live updates would help.
- **One person away for a dinner:** every dinner is cooked for everyone. A "Victoria is out on
  Tuesday" switch would cook less that evening.
- **Pack sizes:** the list shows "20 g curry paste" because the app doesn't know what a pack
  holds. Remembering usual pack sizes ("spinach: 65 g bag") would let it say "1 bag" and what's
  left over.

## Parked earlier (decided "later")

- **Reading photos with the Claude API** (about $0.04–0.05 per photo, needs an Anthropic API key).
  Only if the free "paste recipe text" import (milestone 4) shows a real need.
- **Remember "Not this one"** for the week, instead of forgetting it when you leave the Week tab.
- **Named collections** beyond favourites and tags.
- **TikTok links:** not used in the household.
- **Separate databases for preview and production:** revisit before relying on the app weekly.
