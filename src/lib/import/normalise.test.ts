import { describe, expect, it } from "vitest";
import { metricLine, metricStep, normalise, type Household, type ImportDraft } from "./normalise";

const household: Household = {
  cuisines: ["Indian", "Mexican-inspired", "Greek-inspired"],
  makeAhead: [
    { name: "Cook rice", description: "cook, cool quickly, keep in the fridge", recipes: 4 },
    { name: "Garlic yoghurt", description: "stir garlic into yoghurt", recipes: 3 },
    { name: "Quick-pickled red onions", description: "slice and pickle", recipes: 4 },
    { name: "Marinate the chicken", description: "only one recipe does this", recipes: 1 },
  ],
};

const draft = (overrides: Partial<ImportDraft> = {}): ImportDraft => ({
  title: "Chicken burrito bowls",
  source: "Example Kitchen",
  sourceUrl: "https://example.com/burrito-bowls",
  servings: 4,
  timeTotalMin: 40,
  timeActiveMin: null,
  cuisine: "Mexican",
  mainProtein: null,
  diet: null,
  freezerFriendly: null,
  goodAsLeftovers: true,
  tags: [],
  ingredients: [
    "1 cup long-grain rice",
    "1 lb boneless chicken thighs",
    "1 (14 oz) can black beans, drained",
    "2 tbsp olive oil",
    "1/2 cup chopped cilantro",
    "3 scallions, sliced",
    "salt, to taste",
  ].map((line) => ({ line, group: null })),
  instructions: ["Preheat the oven to 400°F.", "Cook the rice in 2 cups water.", "Roast the chicken in a 9x13-inch dish."],
  makeAhead: [],
  notes: null,
  flags: [],
  ...overrides,
});

describe("metric units", () => {
  it("turns US units in ingredient lines into grams and millilitres", () => {
    expect(metricLine("1 cup long-grain rice")).toEqual({
      line: "240 ml long-grain rice",
      note: "A cup was taken as 240 ml (US); cup sizes vary, and for dry food a weight is better.",
    });
    expect(metricLine("1 lb boneless chicken thighs")?.line).toBe("450 g boneless chicken thighs");
    expect(metricLine("1 (14 oz) can black beans, drained")?.line).toBe("1 (400 g) can black beans, drained");
    expect(metricLine("1/2 cup heavy cream")?.line).toBe("120 ml heavy cream");
    expect(metricLine("1 stick butter")?.line).toBe("110 g butter"); // 113 g, rounded to 10 g like the kitchen amounts
    expect(metricLine("2-3 cups of stock")?.line).toBe("480–720 ml stock");
    expect(metricLine("8 fl oz milk")?.line).toBe("240 ml milk");
  });

  it("leaves metric lines alone", () => {
    expect(metricLine("150 g basmati rice")).toBeNull();
    expect(metricLine("2 tbsp olive oil")).toBeNull();
    expect(metricLine("3 cucumbers")).toBeNull();
  });

  it("turns oven temperatures and sizes in the steps into °C and cm", () => {
    expect(metricStep("Preheat the oven to 350°F.")).toBe("Preheat the oven to 180°C.");
    expect(metricStep("Bake at 425 F for 20 minutes.")).toBe("Bake at 220°C for 20 minutes.");
    expect(metricStep("Use a 9x13-inch dish and a 2-inch piece of ginger.")).toBe("Use a 23 × 33 cm dish and a 5 cm piece of ginger.");
    expect(metricStep("Add 1 1/2 cups water.")).toBe("Add 360 ml water.");
    expect(metricStep("Simmer for 10 minutes at 180°C.")).toBe("Simmer for 10 minutes at 180°C.");
  });
});

describe("the normalising layer", () => {
  const result = normalise(draft(), household);

  it("makes the recipe metric with UK names, and lists every change", () => {
    expect(result.values.ingredients.split("\n")).toEqual([
      "240 ml long-grain rice",
      "450 g boneless chicken thighs",
      "1 (400 g) can black beans, drained",
      "2 tbsp olive oil",
      "120 ml chopped coriander",
      "3 spring onions, sliced",
      "salt, to taste",
    ]);
    expect(result.values.instructions.split("\n")).toEqual([
      "Preheat the oven to 200°C.",
      "Cook the rice in 480 ml water.",
      "Roast the chicken in a 23 × 33 cm dish.",
    ]);
    expect(result.changes).toContain("“1 cup long-grain rice” → “240 ml long-grain rice”");
    expect(result.changes).toContain("“3 scallions, sliced” → “3 spring onions, sliced”");
  });

  it("uses the household's spelling of the cuisine, and guesses protein and diet openly", () => {
    expect(result.values.cuisine).toBe("Mexican-inspired");
    expect(result.values.mainProtein).toBe("chicken");
    expect(result.values.diet).toBe("meat");
    expect(result.check).toContain("Main protein “chicken” was guessed from the ingredients.");
    expect(result.check).toContain("Diet “meat” was guessed from the ingredients.");
    expect(result.check.some((c) => c.startsWith("A cup was taken as 240 ml"))).toBe(true);
  });

  it("lists what the import didn't say", () => {
    expect(result.missing).toEqual(["Freezer-friendly?"]);
    const bare = normalise(draft({ title: " ", servings: null, timeTotalMin: null, cuisine: null, goodAsLeftovers: null }), household);
    expect(bare.missing).toEqual(["Cuisine", "Title", "Servings", "Total time", "Good as leftovers?", "Freezer-friendly?"]);
    expect(bare.values.servings).toBe("");
  });

  it("offers make-ahead tasks the household already shares, when the ingredients fit", () => {
    expect(result.suggestedMakeAhead.map((t) => t.name)).toEqual(["Cook rice"]);
    const withYoghurt = normalise(
      draft({ ingredients: ["200 g Greek yogurt", "1 garlic clove", "1 red onion"].map((line) => ({ line, group: null })) }),
      household,
    );
    expect(withYoghurt.suggestedMakeAhead.map((t) => t.name)).toEqual(["Quick-pickled red onions", "Garlic yoghurt"]);
  });

  it("guesses vegetarian and vegan, and flags seafood", () => {
    const veg = (lines: string[]) => normalise(draft({ ingredients: lines.map((line) => ({ line, group: null })) }), household);
    expect(veg(["200 g paneer", "1 onion"]).values.diet).toBe("vegetarian");
    expect(veg(["200 g plant-based mince", "1 onion"]).values.diet).toBe("vegan");
    expect(veg(["200 g prawns", "1 lime"]).seafood.map((f) => f.term)).toEqual(["prawns"]);
  });
});
