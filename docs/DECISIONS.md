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
| Instagram / TikTok | Save link + notes only, clearly labelled | These cannot be parsed reliably. |
| Photo import | Attach a photo to a recipe as a reference, then type the recipe manually | No OCR in the MVP. Label it honestly. |
| Seed data | Markdown files in `seed-recipes/`, loaded by a seed script and a "reset demo data" action | Saketh writes his own recipes there. See `seed-recipes/README.md`. |

**Caveat:** Vercel's Hobby plan is for personal, non-commercial use. That fits a household app.
If this becomes a commercial product, hosting needs to move to a paid plan; this is not a reason
to change anything now.

**Cloud session caveat:** the default Claude Code cloud environment blocks most websites, so live
recipe sites can't be fetched from inside a session. Test the importer against saved HTML fixtures in
the repo, then check it for real on the Vercel preview deployment.

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
   combinations, past weeks.

## Success measures

- From the brief: agree on 4–5 dinners in about 10–15 minutes; a credible shopping list and prep
  plan.
- Added: **still using it in week 4.** The original routine broke down over weeks, not in one
  session, so one fast session doesn't prove the problem is solved.
