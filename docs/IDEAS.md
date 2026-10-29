# Feedback and future ideas

A running list of feedback from using the app and ideas for later. Nothing here is promised or
scheduled until it moves into a milestone plan. Newest first within each section.

Status: **Open** (not decided), **Planned** (has a milestone), **Done**, **Dropped**.

## From using the app

### Show a photo of each dish when choosing (Planned: milestone 4)

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

## Parked earlier (decided "later")

- **Reading photos with the Claude API** (about $0.04–0.05 per photo, needs an Anthropic API key).
  Only if the free "paste recipe text" import (milestone 4) shows a real need.
- **Remember "Not this one"** for the week, instead of forgetting it when you leave the Week tab.
- **Named collections** beyond favourites and tags.
- **TikTok links:** not used in the household.
- **Separate databases for preview and production:** revisit before relying on the app weekly.
