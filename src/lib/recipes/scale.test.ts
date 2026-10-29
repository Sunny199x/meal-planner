import { describe, expect, it } from "vitest";
import { parseIngredientLine } from "./parse-ingredient-line";
import { roundForKitchen, scaleLine, scaleStep, type StepPart } from "./scale";

const scale = (line: string, factor: number) => scaleLine(parseIngredientLine(line), factor);

describe("scaling ingredient lines", () => {
  it("leaves lines as written at the recipe's own size", () => {
    expect(scale("150 g basmati rice", 1)).toEqual({ text: "150 g basmati rice", note: null, scaled: false });
    expect(scale("½ red chilli (optional)", 1).text).toBe("½ red chilli");
  });

  it("scales grams and millilitres to a sensible step", () => {
    expect(scale("150 g basmati rice", 1.75).text).toBe("260 g basmati rice");
    expect(scale("600 g potatoes", 2).text).toBe("1.2 kg potatoes");
    expect(scale("1 l vegetable stock", 1.5).text).toBe("1½ l vegetable stock");
    expect(scale("15 g desiccated coconut", 1.25).text).toBe("20 g desiccated coconut");
  });

  it("scales spoons, decilitres and pieces to quarters or halves", () => {
    expect(scale("1 tsp mild curry powder, replaces the spice blend", 1.75)).toEqual({
      text: "1¾ tsp mild curry powder",
      note: "replaces the spice blend",
      scaled: true,
    });
    expect(scale("3 dl cooking cream", 1.5).text).toBe("4½ dl cooking cream");
    expect(scale("2–3 tbsp olive oil", 2).text).toBe("4–6 tbsp olive oil");
  });

  it("makes names plural when one becomes several", () => {
    expect(scale("½ pomegranate", 2.75).text).toBe("1½ pomegranates");
    expect(scale("1 red chilli", 2).text).toBe("2 red chillies");
    expect(scale("2 eggs", 1.5).text).toBe("3 eggs");
  });

  it("scales the weight of packs and cans too", () => {
    expect(scale("1 pack cooked green lentils (about 380 g), drained", 1.75)).toEqual({
      text: "1¾ packs cooked green lentils (about 670 g in total)",
      note: "drained",
      scaled: true,
    });
    expect(scale("2 cans black beans (400 g each)", 1.5).text).toBe("3 cans black beans (1.2 kg in total)");
  });

  it("leaves lines without an amount alone", () => {
    expect(scale("salt, to taste", 2)).toEqual({ text: "salt", note: "to taste", scaled: false });
  });

  it("never rounds an amount down to nothing", () => {
    expect(roundForKitchen(0.1, "g")).toBe(0.5);
    expect(roundForKitchen(0.05, "tsp")).toBe(0.25);
    expect(roundForKitchen(1234, "g")).toBe(1250);
  });
});

describe("scaling amounts inside recipe steps", () => {
  const show = (parts: StepPart[]) => parts.map((p) => (typeof p === "string" ? p : `[${p.text}]`)).join("");

  it("scales amounts with a metric unit and marks them", () => {
    const step = "Bring 300 ml water to the boil, add the rice and ½ tsp salt.";
    // 825 ml, rounded to 10 ml like the ingredient list.
    expect(show(scaleStep(step, 2.75))).toBe("Bring [830 ml] water to the boil, add the rice and [1½ tsp] salt.");
    expect(scaleStep(step, 2.75)[1]).toEqual({ text: "830 ml", original: "300 ml" });
  });

  it("leaves times, temperatures, sizes and counts alone", () => {
    const step = "Roast at 220°C for 20–25 minutes, cut into 2 cm cubes and fill 4 tortillas.";
    expect(scaleStep(step, 2)).toEqual([step]);
  });

  it("handles ranges, decilitres, kilos and written-out units", () => {
    expect(show(scaleStep("Add 1–2 tbsp oil and 2 dl cream.", 2))).toBe("Add [2–4 tbsp] oil and [4 dl] cream.");
    expect(show(scaleStep("Boil 1 kg potatoes in 1 litre of water.", 1.5))).toBe("Boil [1½ kg] potatoes in [1½ l] of water.");
    expect(show(scaleStep("Stir in 2 teaspoons of sugar.", 0.5))).toBe("Stir in [1 teaspoons] of sugar.");
  });

  it("doesn't touch words that only look like units, or the recipe's own size", () => {
    expect(scaleStep("Use 2 large onions and 1 lime.", 2)).toEqual(["Use 2 large onions and 1 lime."]);
    expect(scaleStep("Bring 300 ml water to the boil.", 1)).toEqual(["Bring 300 ml water to the boil."]);
  });
});
