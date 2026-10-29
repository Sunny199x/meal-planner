import { describe, expect, it } from "vitest";
import { parseAmount, parseIngredientLine } from "./parse-ingredient-line";

function parsed(line: string) {
  const { quantity, quantityMax, unit, name, note, optional, metric, problems } =
    parseIngredientLine(line);
  return { quantity, quantityMax, unit, name, note, optional, metric, problems };
}

const g = (value: number, approximate = false) => ({ value, unit: "g", approximate });
const ml = (value: number, approximate = false) => ({ value, unit: "ml", approximate });

describe("parseAmount", () => {
  it.each([
    ["2", 2],
    ["0.5", 0.5],
    ["0,5", 0.5],
    ["1/2", 0.5],
    ["1 1/2", 1.5],
    ["½", 0.5],
    ["1½", 1.5],
    ["1 ½", 1.5],
    ["¾", 0.75],
  ])("reads %s", (text, value) => {
    expect(parseAmount(text)).toBe(value);
  });

  it("refuses nonsense", () => {
    expect(parseAmount("1/0")).toBeNull();
    expect(parseAmount("abc")).toBeNull();
  });
});

describe("parseIngredientLine: lines from the template recipes", () => {
  it.each([
    ["250 g red lentils, rinsed", { quantity: 250, unit: "g", name: "red lentils", note: "rinsed", metric: g(250) }],
    ["1 l water", { quantity: 1, unit: "l", name: "water", note: null, metric: ml(1000) }],
    ["1 tsp ground turmeric", { quantity: 1, unit: "tsp", name: "ground turmeric", metric: ml(5) }],
    ["2 tbsp oil or ghee", { quantity: 2, unit: "tbsp", name: "oil or ghee", metric: ml(30) }],
    ["1 onion, finely chopped", { quantity: 1, unit: null, name: "onion", note: "finely chopped", metric: null }],
    ["3 garlic cloves, finely chopped", { quantity: 3, unit: null, name: "garlic cloves", note: "finely chopped" }],
    ["20 g fresh ginger, grated", { quantity: 20, unit: "g", name: "fresh ginger", note: "grated", metric: g(20) }],
    ["1 green chilli, sliced (optional)", { quantity: 1, name: "green chilli", note: "sliced", optional: true }],
    ["½ lemon, juiced", { quantity: 0.5, unit: null, name: "lemon", note: "juiced" }],
    ["15 g fresh coriander, chopped", { quantity: 15, unit: "g", name: "fresh coriander", note: "chopped" }],
    ["300 g basmati rice, to serve", { quantity: 300, unit: "g", name: "basmati rice", note: "to serve" }],
    ["½ tsp ground cinnamon", { quantity: 0.5, unit: "tsp", name: "ground cinnamon", metric: ml(2.5) }],
    [
      "3 garlic cloves, grated (2 for the chicken, 1 for the yoghurt)",
      { quantity: 3, name: "garlic cloves", note: "grated (2 for the chicken, 1 for the yoghurt)" },
    ],
    [
      "1 cauliflower (about 600 g), cut into florets",
      { quantity: 1, unit: null, name: "cauliflower", note: "cut into florets", metric: g(600, true) },
    ],
    [
      "2 red onions (1 cut into wedges, 1 thinly sliced for pickling)",
      { quantity: 2, name: "red onions", note: "1 cut into wedges, 1 thinly sliced for pickling", metric: null },
    ],
    [
      "60 ml white wine vinegar or apple cider vinegar",
      { quantity: 60, unit: "ml", name: "white wine vinegar or apple cider vinegar", metric: ml(60) },
    ],
    [
      "200 g thick yoghurt (Greek or Turkish style)",
      { quantity: 200, unit: "g", name: "thick yoghurt", note: "Greek or Turkish style", metric: g(200) },
    ],
    ["4 flatbreads, to serve", { quantity: 4, unit: null, name: "flatbreads", note: "to serve" }],
    [
      "2 sweet potatoes (about 700 g), cut into 2 cm cubes",
      { quantity: 2, name: "sweet potatoes", note: "cut into 2 cm cubes", metric: g(700, true) },
    ],
    ["½ tsp chilli flakes (optional)", { quantity: 0.5, unit: "tsp", name: "chilli flakes", optional: true }],
    [
      "2 cans black beans (400 g each), drained and rinsed",
      { quantity: 2, unit: "can", name: "black beans", note: "drained and rinsed", metric: g(800) },
    ],
    ["1 avocado, sliced (optional)", { quantity: 1, name: "avocado", note: "sliced", optional: true }],
    ["8 small tortillas", { quantity: 8, unit: null, name: "small tortillas", note: null }],
    ["salt, to taste", { quantity: null, unit: null, name: "salt", note: "to taste", metric: null }],
    ["1 lime, zested and juiced", { quantity: 1, name: "lime", note: "zested and juiced" }],
  ])("%s", (line, expected) => {
    const result = parsed(line);
    expect(result).toMatchObject(expected);
    expect(result.problems).toEqual([]);
  });
});

describe("parseIngredientLine: other formats", () => {
  it("strips the list dash and keeps the line as written", () => {
    const result = parseIngredientLine("- 1 onion, chopped");
    expect(result.line).toBe("1 onion, chopped");
    expect(result.name).toBe("onion");
  });

  it("reads Swedish decimal commas and dl", () => {
    expect(parsed("1,5 dl cream")).toMatchObject({ quantity: 1.5, unit: "dl", name: "cream", metric: ml(150) });
  });

  it("reads ranges and uses the upper amount for the total", () => {
    expect(parsed("2–3 tbsp olive oil")).toMatchObject({
      quantity: 2,
      quantityMax: 3,
      unit: "tbsp",
      name: "olive oil",
      metric: ml(45, true),
    });
    expect(parsed("2-3 tomatoes")).toMatchObject({ quantity: 2, quantityMax: 3, name: "tomatoes" });
  });

  it("does not mistake 'to' at the start of a word for a range", () => {
    expect(parsed("2 tomatoes")).toMatchObject({ quantity: 2, quantityMax: null, name: "tomatoes" });
  });

  it.each(["1 1/2 tsp cumin", "1½ tsp cumin", "1 ½ tsp cumin", "1.5 tsp cumin"])(
    "reads mixed amounts: %s",
    (line) => {
      expect(parsed(line)).toMatchObject({ quantity: 1.5, unit: "tsp", name: "cumin", metric: ml(7.5) });
    },
  );

  it("reads amounts written without a space", () => {
    expect(parsed("250g pasta")).toMatchObject({ quantity: 250, unit: "g", name: "pasta", metric: g(250) });
    expect(parsed("1.5kg potatoes")).toMatchObject({ unit: "kg", name: "potatoes", metric: g(1500) });
  });

  it("reads '2 x 400 g cans'", () => {
    expect(parsed("2 x 400 g cans chopped tomatoes")).toMatchObject({
      quantity: 2,
      unit: "can",
      name: "chopped tomatoes",
      metric: g(800),
    });
  });

  it("treats a bracketed weight after a container as per container", () => {
    expect(parsed("2 cans (400 ml) coconut milk")).toMatchObject({ unit: "can", name: "coconut milk", metric: ml(800) });
    expect(parsed("1 can (400 g) chopped tomatoes")).toMatchObject({ metric: g(400) });
  });

  it("respects 'in total'", () => {
    expect(parsed("2 cans (800 g in total) chickpeas")).toMatchObject({ metric: g(800) });
  });

  it("reads a weight without an amount", () => {
    expect(parsed("fresh coriander (15 g)")).toMatchObject({ quantity: null, name: "fresh coriander", metric: g(15) });
  });

  it("reads 'a pinch of'", () => {
    expect(parsed("a pinch of salt")).toMatchObject({ quantity: 1, unit: "pinch", name: "salt" });
    expect(parsed("a little oil")).toMatchObject({ quantity: null, unit: null, name: "a little oil" });
  });

  it("accepts Swedish spoon units", () => {
    expect(parsed("2 msk olivolja")).toMatchObject({ unit: "tbsp", metric: ml(30) });
    expect(parsed("1 tsk salt")).toMatchObject({ unit: "tsp", metric: ml(5) });
  });

  it("reads a trailing 'optional' after the comma", () => {
    expect(parsed("1 tbsp honey, optional")).toMatchObject({ name: "honey", note: null, optional: true });
  });

  it("does not take unit words out of ingredient names", () => {
    expect(parsed("1 green pepper")).toMatchObject({ unit: null, name: "green pepper" });
    expect(parsed("2 lemons")).toMatchObject({ unit: null, name: "lemons" });
  });
});

describe("parseIngredientLine: problems are reported, not guessed", () => {
  it("flags non-metric units", () => {
    const result = parsed("2 cups flour");
    expect(result.problems).toEqual([
      '"cups" isn\'t a metric unit. Please use g, kg, ml, dl, l, tsp or tbsp.',
    ]);
    expect(result.metric).toBeNull();
  });

  it("flags an amount it can't read", () => {
    const result = parsed("1/0 lemon");
    expect(result.quantity).toBeNull();
    expect(result.problems[0]).toMatch(/Couldn't read the amount/);
  });

  it("flags a line with no name", () => {
    expect(parsed("250 g").problems).toEqual(["No ingredient name found."]);
    expect(parsed("").problems).toEqual(["No ingredient name found."]);
  });
});
