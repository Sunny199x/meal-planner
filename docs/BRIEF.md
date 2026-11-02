Act as my product partner and developer. Build a working MVP web app using the context below.

Make reasonable design and implementation decisions. Briefly explain your approach, then build and verify the app. Avoid stopping at a specification or landing page.

PROJECT PURPOSE

Help my wife Victoria and me turn our collected recipes into a manageable weekly food plan.

We want to cook consistently, eat well and reduce takeout. The main difficulty is choosing meals from too many scattered options, then coordinating them around our time, ingredients and leftovers.

DISCOVERY: WHAT WE KNOW

- We enjoy discovering recipes from websites, cookbooks and social media.
- We have approximately 50–60 HelloFresh recipe cards alongside other saved inspiration.
- Choosing five meals from hundreds of possibilities becomes overwhelming.
- HelloFresh made selection manageable by offering roughly ten dishes from which we chose five.
- Every choice did not need to be exciting. We sometimes selected “good enough” meals.
- We cooked consistently with HelloFresh, partly because the ingredients were already purchased and we wanted to avoid waste.
- We stopped because of price. Our estimate of spending three times more has not been verified on a like-for-like basis.
- We then bought groceries for those recipes ourselves and successfully maintained a routine for a while.
- We usually cooked everything we bought.
- We matched recipes to our calendars: approximately 20-minute meals on busy evenings, and sometimes complicated one-hour recipes on relaxed evenings.
- The growing burden of reviewing and choosing recipes eventually disrupted the routine.

The strongest evidence points to weekly selection as the initial bottleneck. Shopping and cooking generally worked once a realistic plan was agreed.

WORKING PROBLEM STATEMENT

We struggle to sustain home cooking because choosing meals from a large, scattered recipe collection takes too much mental effort. We can successfully shop and cook when we agree on a plan that fits our calendars, but repeatedly creating that plan becomes overwhelming and contributes to frequent takeout.

PRODUCT HYPOTHESIS

A manageable shortlist that updates as we choose dishes could reduce selection effort while preserving choice. Explaining how dishes complement one another could help us assemble a practical week.

Ingredient coordination, portion allocation and preparation guidance should make that plan executable.

These are hypotheses to test, not proven product–market fit.

HOUSEHOLD CONTEXT

- Sunny and Victoria, based in Stockholm, Sweden.
- Dinner for two; lunch leftovers usually for Sunny only.
- Typically four or five dinners and four or five lunches per week: roughly 12–15 individual portions.
- No seafood.
- Balanced eating and adequate protein matter as we start exercising.
- Future pregnancy preparation is a motivation for improving our diet, but the app must not claim fertility benefits or provide medical personalization.
- Cooking time varies by evening.
- Sunday offers approximately two to three hours TOTAL for planning, travel, grocery shopping, preparation and cleanup.
- The supermarket is approximately ten minutes away.
- Useful leftovers and freezer options are welcome.
- We want variety without unnecessarily disconnected ingredients and preparation.
- Sustainable cost matters; live discounts and price optimization can come later.
- Do not enforce exactly three recipes or identical serving sizes.

REFERENCE PRODUCTS AND WHAT WAS VERIFIED

1. Bring!
https://www.getbring.com/en/home
https://www.getbring.com/en/features
https://www.getbring.com/blog-posts/essen-planen-fur-die-woche-mit-bring

Its official documentation describes:
- Saving recipes from its inspiration feed and compatible external websites.
- Importing via a website’s Bring button or a smartphone’s share function.
- Adjusting ingredient quantities for servings.
- Deselecting ingredients already owned before transferring ingredients to a shopping list.
- Shared shopping lists with real-time updates.

We have not established whether it recommends complementary meals across a weekly plan.

2. HelloFresh Cookbook

A screenshot supplied by Sunny shows:
- Saving recipes from social media, blogs, articles and HelloFresh.
- Instagram and TikTok link entry points.
- An externally saved Pav Bhaji recipe with its source.
- Text advertising collections and shopping lists through the app.

Import quality, filters, scaling and detailed shopping-list behaviour were not independently tested.

Lesson: collecting recipes and turning ingredients into shopping lists are established foundations. They do not alone establish our product’s distinctive value.

3. MixTree
https://www.mixtree.studio/

Its public website describes organizing user-saved transitions between music tracks into connected paths.

It explicitly says it does not generate recommendations. Its signed-in application was not inspected.

We want to adapt the idea of meaningful connections while also suggesting possible meal combinations.

4. Nutrinity
https://nutrinity.app/

Its website advertised personalized meal plans, cooking-time preferences, nutritional information and consolidated shopping lists. It described the product as beta/waitlist when reviewed.

Treat these as advertised capabilities, not evidence of retention or confirmed gaps.

FEATURE 1: PERSONAL RECIPE COLLECTION

Provide a familiar home for recipes from different sources.

Users should be able to:
- Save recipes.
- View ingredients, instructions, servings and source.
- Organize recipes into collections and favourites.
- Search and filter.
- Adjust portions.
- Select recipes for a plan.
- Generate a consolidated grocery list.

Useful filters:
- Cooking time.
- Cuisine.
- Protein-rich or carbohydrate-focused characteristics.
- Vegetarian/meat-based.
- Ingredients included or excluded.
- Leftover and freezer suitability.

Use understandable labels and explain nutritional criteria. Do not imply that carbohydrate-rich food is inherently unhealthy.

Recipe capture is a central intended behaviour:
- Provide “Add recipe” with URL import and manual-entry options.
- Include an image/photo entry point if feasible.
- Implement real URL extraction where the environment supports it.
- Let users review and correct extracted ingredients, units, servings and instructions before saving.
- Handle unsupported or incomplete sources gracefully with manual entry.
- Distinguish saving a source link from extracting a complete recipe.
- Do not pretend Instagram, TikTok, arbitrary websites or cookbook photos can be parsed if they cannot.
- A clearly labelled simulated import is acceptable for an unsupported demo source.

FEATURE 2: CONNECTED MEAL SELECTION

Each selected dish should help narrow the next choice.

Flow:
1. Start with a dish we want to cook.
2. Show approximately three complementary suggestions.
3. Explain each suggestion.
4. Add a dish and update the shortlist against the whole plan.
5. Allow alternatives, removal, undo and swapping.

Recommendation reasons could include:
- Uses remaining perishable ingredients.
- Shares a specific preparation task.
- Introduces different flavours, texture or cuisine.
- Fits an evening’s available cooking time.
- Adds nutritional variety.
- Belongs to a meal combination we previously liked.

Important distinctions:
- Another daal variant might share ingredients but feel repetitive.
- Common staples such as salt and oil provide little meaningful overlap.
- Quantities matter: using the rest of a spinach bag is more useful than merely mentioning spinach.
- Sharing an ingredient does not guarantee sharing a cooked component.
- Explain the actual reusable preparation.
- Evaluate the entire plan, not only the last meal chosen.
- Show a small shortlist instead of an overwhelming graph.

Remember successful meal combinations. Distinguish user-saved connections from system-suggested ones.

OPTIONAL INGREDIENTS-FIRST ENTRY

Sunny’s mother chooses good vegetables at the supermarket and plans dishes around them.

Allow an optional starting point:
“What ingredients would you like to use?”

Use this to narrow suggestions. Do not require every user to plan ingredients-first.

MVP EXPERIENCE

Build a coherent flow across these areas:

A. Recipe collection
- Search, filters, recipe details, favourites and collections.
- Add/import, review, edit and save recipes.
- Source links.

B. Weekly setup
- Choose dinners at home.
- Set cooking time per evening.
- Set dinner portions and lunch needs.
- Optionally specify ingredients to use.
- Respect the no-seafood preference.

C. Guided selection
- Manageable starting options.
- Choose an anchor dish.
- Receive three complementary next choices with specific explanations.
- Updated suggestions after every selection.
- Browse the full collection when desired.
- Clearly show selected meals and remaining needs.

D. Weekly plan
- Assign and move dishes between evenings.
- Show cooking time and portion destinations.
- Highlight time conflicts.
- Swap without restarting.
- Save useful meal combinations.
- Make repeated dinners explicit and optional.

E. Shopping and preparation
- Scale recipe quantities.
- Combine compatible ingredients and units.
- Keep incompatible or ambiguous units separate.
- Group ingredients by shopping category.
- Allow already-owned and purchased checkboxes.
- Show which meals contribute to each ingredient total where useful.
- Produce specific Sunday preparation tasks.
- Separate advance preparation from weekday finishing.
- Account for lunch leftovers without counting them as additional cooking.
- Include freezer allocations where supported by recipe data.
- Avoid unsupported storage-duration claims.

DEMO CONTENT

Seed approximately 15–20 plausible recipes, including:
- Indian dishes such as daal.
- Mediterranean meals.
- Mexican-inspired meals.
- Other non-seafood choices.
- Vegetarian and meat-based options.
- Quick and longer recipes.
- Some freezer-friendly choices.

Ensure enough genuine ingredient and preparation overlap to demonstrate the connections.

Label seeded recipes as illustrative. Do not present them as imported HelloFresh recipes or validated nutritional plans.

Use transparent recommendation rules or manually curated connections:
- Respect dietary restrictions.
- Respect the target evening’s time.
- Reward useful perishable-ingredient and preparation overlap.
- Preserve variety across the plan.
- Explain actual reasons behind each suggestion.

Do not claim trained AI or clinically validated nutrition optimization.

DESIGN

Warm, modern, calm and food-focused.
Appealing recipe cards and readable typography.
Comfortable on mobile and desktop.
Keep simultaneous decisions limited.
Make selection and comparison feel easy for a couple.
Use a simple visual indication of connections without requiring a large network diagram.

Use metric quantities and Celsius.
Use SEK only for real or clearly labelled illustrative cost data.
Do not invent supermarket prices or nutritional precision.

TECHNICAL EXPECTATIONS

- Use the environment’s supported stack.
- Build a working selection-to-shopping experience.
- Persist recipes, plans and checklist state across refreshes.
- Use local storage or an available backend.
- Make visible controls functional.
- Include resettable demo data.
- Show useful empty, loading and error states.
- Validate recipe imports and quantity calculations.
- Clearly disclose simulated features.
- Verify key flows and responsive behaviour.

PRIORITIES

Essential:
- Recipe collection and practical capture workflow.
- Filters.
- Connected recommendations with explanations.
- Weekly time and portion planning.
- Consolidated shopping list.

Secondary:
- Sunday preparation checklist.
- Saved meal combinations.
- Optional ingredients-first suggestions.

OUT OF SCOPE

- Live supermarket stock and discounts.
- Calendar integrations.
- Payments.
- Social feeds.
- Comprehensive social-media importing.
- Medical or fertility advice.
- Complex multi-user infrastructure.
- A large recommendation engine.

SUCCESS TEST

Victoria and Sunny should be able to:
- Understand the app quickly.
- Set a realistic week.
- Select a first dish.
- Understand and act on complementary suggestions.
- Agree on four or five dinners in roughly 10–15 minutes.
- See lunch and freezer allocations.
- Obtain a credible shopping list and preparation plan.

The time target is a proposed test criterion. Cooking consistency and takeout reduction require subsequent real-world testing.

WORKING STYLE AND HANDOFF

Be candid and challenge weak assumptions.
Avoid flattery and unnecessary jargon.
Make routine decisions autonomously.
Do not build unrelated features.

At handoff:
- Explain how to open or run the app.
- Describe implemented versus simulated behaviour.
- Provide a short demonstration sequence for Victoria.
- Identify the main hypotheses the prototype will help test.

Begin with a short implementation approach, then build the MVP.