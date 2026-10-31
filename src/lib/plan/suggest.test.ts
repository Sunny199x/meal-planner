import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "../recipes/parse-ingredient-line";
import { cuisineKey, ingredientKey, ingredientKind, isRealAmount, prepKey, proteinKey, sameIngredient } from "./ingredients";
import { openEvenings, POINTS, rankCandidates, shortlist, type PlanRecipe, type PlanState } from "./suggest";
import { DEFAULT_SETUP, type WeekSetup } from "./types";

function recipe(id: string, overrides: Partial<Omit<PlanRecipe, "ingredients">> & { lines?: string[] } = {}): PlanRecipe {
  const { lines = [], ...rest } = overrides;
  return {
    id,
    title: id,
    source: "Own recipe",
    site: null,
    cuisine: "Swedish",
    mainProtein: null,
    timeTotalMin: 30,
    servings: 2,
    goodAsLeftovers: false,
    freezerFriendly: false,
    isFavourite: false,
    isTemplate: false,
    seafood: null,
    makeAhead: [],
    photo: null,
    ...rest,
    ingredients: lines.map(parseIngredientLine),
  };
}

const setup: WeekSetup = {
  ...DEFAULT_SETUP,
  people: [{ name: "Sunny", dinnerPortion: 1, lunches: 0 }],
  evenings: DEFAULT_SETUP.evenings.map((_, day) => ({ cooking: day < 3, time: day === 1 ? "quick" : "normal" })),
};
const plan = (dishes: string[], extra: Partial<PlanState> = {}): PlanState => ({
  setup,
  dishes: dishes.map((recipeId, day) => ({ recipeId, day, addedAt: "", via: "suggestion" })),
  dismissed: [],
  ...extra,
});
const rank = (recipes: PlanRecipe[], state: PlanState) => rankCandidates(recipes, state, "test");
const kinds = (recipes: PlanRecipe[], state: PlanState, id: string) =>
  rank(recipes, state)
    .find((s) => s.recipe.id === id)
    ?.reasons.map((r) => r.kind);

describe("ingredient matching", () => {
  it("reduces names to a simple key", () => {
    expect(ingredientKey("Baby spinach leaves")).toBe("spinach leaf");
    expect(ingredientKey("Greek yogurt")).toBe("greek yoghurt");
    expect(ingredientKey("fresh cilantro (chopped)")).toBe("coriander");
    expect(ingredientKey("Tomatoes")).toBe("tomato");
  });

  it("matches the same ingredient with or without extra words", () => {
    expect(sameIngredient("spinach", "spinach")).toBe(true);
    expect(sameIngredient(ingredientKey("baby spinach"), ingredientKey("spinach"))).toBe(true);
    expect(sameIngredient(ingredientKey("greek yoghurt"), ingredientKey("yoghurt"))).toBe(true);
    expect(sameIngredient(ingredientKey("chicken thighs"), ingredientKey("chicken breast"))).toBe(false);
    expect(sameIngredient(ingredientKey("red pepper"), ingredientKey("pepper"))).toBe(true);
    expect(sameIngredient(ingredientKey("feta cheese"), ingredientKey("feta"))).toBe(true);
    expect(sameIngredient(ingredientKey("chicken stock"), ingredientKey("chicken"))).toBe(false);
    expect(ingredientKey("3 garlic cloves")).toBe("garlic clove");
    expect(ingredientKey("chives")).toBe("chive");
  });

  it("sorts staples, cupboard items and fresh food", () => {
    const kind = (line: string) => ingredientKind(parseIngredientLine(line));
    for (const line of ["salt, to taste", "2 tbsp olive oil", "1 onion", "3 garlic cloves", "1 tsp ground cumin", "black pepper", "1 tsp vegetable stock powder"]) {
      expect(kind(line), line).toBe("staple");
    }
    for (const line of ["150 g basmati rice", "1 can chickpeas (400 g)", "75 g Korean BBQ sauce", "20 g yellow curry paste"]) {
      expect(kind(line), line).toBe("cupboard");
    }
    for (const line of ["60 g baby spinach", "1 spring onion", "½ pomegranate", "1 red pepper", "150 ml cooking cream", "250 g chicken thighs"]) {
      expect(kind(line), line).toBe("fresh");
    }
  });

  it("counts only real amounts", () => {
    const real = (line: string) => isRealAmount(parseIngredientLine(line));
    expect(real("60 g baby spinach")).toBe(true);
    expect(real("10 g baby spinach")).toBe(false);
    expect(real("½ lime")).toBe(true);
    expect(real("1 tbsp cream")).toBe(false);
    expect(real("5 g fresh coriander")).toBe(true); // herbs: a bunch goes off fast
  });

  it("matches prep names, cuisines and proteins loosely but not too loosely", () => {
    expect(prepKey("Roast the sweet potato")).toBe(prepKey("roast sweet potato."));
    expect(prepKey("Cook rice")).not.toBe(prepKey("Cook the daal base"));
    expect(cuisineKey("Mexican-inspired")).toBe(cuisineKey("Mexican"));
    expect(proteinKey("beef and black beans")).toBe("beef");
    expect(proteinKey("vegan kebab strips")).toBe("plant-based");
    expect(proteinKey(null)).toBeNull();
  });
});

describe("what can be suggested", () => {
  it("leaves out seafood, chosen and dismissed recipes", () => {
    const recipes = [
      recipe("korma"),
      recipe("prawn curry", { seafood: "contains" }),
      recipe("pasta"),
      recipe("tacos"),
    ];
    const ids = rank(recipes, plan(["korma"], { dismissed: ["pasta"] })).map((s) => s.recipe.id);
    expect(ids).toEqual(["tacos"]);
  });

  it("leaves out recipes too long for every open evening", () => {
    const quickOnly: WeekSetup = { ...setup, evenings: setup.evenings.map((e, day) => ({ ...e, cooking: day === 1 })) };
    const ids = rankCandidates([recipe("stew", { timeTotalMin: 90 }), recipe("salad", { timeTotalMin: 15 })], { setup: quickOnly, dishes: [], dismissed: [] }).map((s) => s.recipe.id);
    expect(ids).toEqual(["salad"]);
  });

  it("suggests nothing once every evening has a dish", () => {
    const state = plan(["a", "b", "c"]);
    expect(openEvenings(state)).toEqual([]);
    expect(rank([recipe("a"), recipe("b"), recipe("c"), recipe("d")], state)).toEqual([]);
  });
});

describe("reasons", () => {
  it("rewards shared Sunday prep by name", () => {
    const korma = recipe("korma", { makeAhead: [{ name: "Cook rice", description: "" }] });
    const chicken = recipe("chicken", { makeAhead: [{ name: "cook the rice", description: "" }] });
    const result = rank([korma, chicken], plan(["korma"]))[0];
    expect(result.reasons[0]).toMatchObject({ kind: "shared-prep", points: POINTS.sharedPrep });
    expect(result.reasons[0].text).toMatch(/Shares Sunday prep with korma: cook the rice/);
  });

  it("uses the other half of a part-used item", () => {
    const korma = recipe("korma", { lines: ["½ pomegranate"] });
    const salad = recipe("salad", { lines: ["½ pomegranate"] });
    const whole = recipe("whole", { lines: ["1 pomegranate"] });
    const ranked = rank([korma, salad, whole], plan(["korma"]));
    expect(ranked[0].recipe.id).toBe("salad");
    expect(ranked[0].reasons[0].text).toBe("Uses the other half of the pomegranate from korma.");
    expect(kinds([korma, salad, whole], plan(["korma"]), "whole")).toContain("shared-ingredient");
  });

  it("counts shared fresh food in real amounts, but not staples, cupboard items or tiny amounts", () => {
    const first = recipe("first", { lines: ["100 g baby spinach", "150 g basmati rice", "1 onion", "1 tsp feta"] });
    const second = recipe("second", { lines: ["50 g spinach", "150 g basmati rice", "1 onion", "1 tsp feta"] });
    const result = rank([first, second], plan(["first"]))[0];
    const shared = result.reasons.find((r) => r.kind === "shared-ingredient")!;
    expect(shared.text).toBe("Also uses spinach like first: buy once for both.");
    expect(shared.points).toBe(POINTS.sharedIngredient);
  });

  it("uses the ingredients you want to use up", () => {
    const state = plan([], { setup: { ...setup, ingredientsToUse: ["Feta"] } });
    const ranked = rank([recipe("pasta"), recipe("burek", { lines: ["100 g feta cheese"] })], state);
    expect(ranked[0].recipe.id).toBe("burek");
    expect(ranked[0].reasons[0].text).toBe("Uses your Feta.");
  });

  it("favours quick dishes for the next Quick evening, and leftovers while lunches are needed", () => {
    const withLunches = plan([], { setup: { ...setup, people: [{ name: "Sunny", dinnerPortion: 1, lunches: 4 }] } });
    // Monday (Normal) is the next open evening, so a quick dish goes there: no Quick-evening reason.
    expect(kinds([recipe("fast", { timeTotalMin: 20 })], withLunches, "fast")).not.toContain("quick-evening");
    // With Monday taken, a quick dish goes to Tuesday (Quick); a 40-minute one skips to Wednesday.
    const mondayTaken = plan(["mon"], { setup: withLunches.setup });
    expect(kinds([recipe("mon"), recipe("fast", { timeTotalMin: 20 })], mondayTaken, "fast")).toContain("quick-evening");
    expect(kinds([recipe("mon"), recipe("slow", { timeTotalMin: 40 })], mondayTaken, "slow")).not.toContain("quick-evening");
    expect(kinds([recipe("stew", { goodAsLeftovers: true })], withLunches, "stew")).toContain("lunches");
    expect(kinds([recipe("stew", { goodAsLeftovers: true })], plan([]), "stew")).not.toContain("lunches");
  });

  it("marks near-duplicates as similar and puts them last", () => {
    const daal = recipe("daal", { cuisine: "Indian", mainProtein: "red lentils", lines: ["100 g spinach"] });
    const daal2 = recipe("daal2", { cuisine: "Indian", mainProtein: "lentils", lines: ["100 g spinach"] });
    const tacos = recipe("tacos", { cuisine: "Mexican-inspired", mainProtein: "black beans" });
    const ranked = rank([daal, daal2, tacos], plan(["daal"]));
    expect(ranked.map((s) => s.recipe.id)).toEqual(["tacos", "daal2"]);
    expect(ranked[1].notes[0]).toMatch(/Similar to daal \(also Indian, also lentils\)/);
    expect(ranked[0].reasons.map((r) => r.kind)).toEqual(["new-cuisine"]);
  });

  it("scores every recipe as exactly the sum of its reasons", () => {
    const recipes = [
      recipe("a", { cuisine: "Indian", mainProtein: "chicken", lines: ["½ lime", "100 g spinach"], isFavourite: true, makeAhead: [{ name: "Cook rice", description: "" }] }),
      recipe("b", { cuisine: "Indian", mainProtein: "chicken", lines: ["½ lime", "60 g spinach"], timeTotalMin: 20, isTemplate: true, makeAhead: [{ name: "Cook rice", description: "" }] }),
      recipe("c", { cuisine: "Korean", mainProtein: "pork", lines: ["1 lime"], goodAsLeftovers: true }),
    ];
    for (const s of rank(recipes, plan(["a"], { setup: { ...setup, ingredientsToUse: ["lime"] } }))) {
      const all = [...s.reasons.map((r) => r.points)];
      const negatives = s.score - all.reduce((sum, p) => sum + p, 0);
      expect(negatives).toBeLessThanOrEqual(0);
      expect(s.reasons.every((r) => r.points > 0)).toBe(true);
    }
  });
});

describe("shortlist", () => {
  it("avoids three dishes of the same cuisine side by side, and pages through the rest", () => {
    const ranked = rank(
      [
        recipe("in1", { cuisine: "Indian", isFavourite: true }),
        recipe("in2", { cuisine: "Indian", isFavourite: true }),
        recipe("in3", { cuisine: "Indian", isFavourite: true }),
        recipe("mx", { cuisine: "Mexican" }),
        recipe("kr", { cuisine: "Korean" }),
      ],
      plan([]),
    );
    const first = shortlist(ranked, 3, 0).map((s) => s.recipe.cuisine);
    expect(new Set(first).size).toBe(3);
    expect(shortlist(ranked, 3, 1)).toHaveLength(2);
    expect(shortlist(ranked, 3, 2)).toEqual([]);
  });
});
