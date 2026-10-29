import { describe, expect, it } from "vitest";
import { guidanceFor, limitFor } from "./food-safety";

const none = new Map<string, number>();

describe("food-safety guidance", () => {
  it("covers cooked rice with the one-day rule", () => {
    for (const name of ["Cook rice", "Cook the rice.", "Steamed jasmine rice"]) {
      expect(guidanceFor(name)).toMatchObject({ days: 1, by: "guidance", source: "UK Food Standards Agency" });
    }
  });

  it("covers other cooked food with the two-day leftovers rule", () => {
    for (const name of ["Cook the chili", "Cook the daal base", "Roast sweet potato", "Roast Mediterranean vegetables"]) {
      expect(guidanceFor(name)).toMatchObject({ days: 2, note: "eat cooked leftovers within two days" });
    }
  });

  it("doesn't cover raw prep, or names that don't say the food is cooked", () => {
    for (const name of [
      "Cut potato fries",
      "Quick-pickled red onions",
      "Marinate the chicken",
      "Mix the pork meatball mince",
      "Chop aromatics",
      "Garlic yoghurt",
      "Deseed pomegranate",
      "Harissa bulgur",
      "Rinse rice",
    ]) {
      expect(guidanceFor(name)).toBeNull();
    }
  });

  it("every rule names its source and links to it", () => {
    expect(guidanceFor("Cook rice")?.sourceUrl).toMatch(/^https:\/\/www\.gov\.uk\//);
    expect(guidanceFor("Cook the chili")?.sourceUrl).toMatch(/^https:\/\/www\.gov\.uk\//);
  });
});

describe("the limit for a task", () => {
  it("uses the household's limit when it's the same as or stricter than the guidance", () => {
    expect(limitFor("Cook rice", new Map([["cook rice", 0]]))).toEqual({ days: 0, by: "household" });
    expect(limitFor("Cook the rice.", new Map([["cook rice", 1]]))).toEqual({ days: 1, by: "household" });
  });

  it("never lets the household go beyond the guidance", () => {
    expect(limitFor("Cook rice", new Map([["cook rice", 3]]))).toMatchObject({ days: 1, by: "guidance" });
  });

  it("uses the household's limit for tasks the guidance doesn't cover, and none otherwise", () => {
    expect(limitFor("Deseed pomegranate", new Map([["deseed pomegranate", 4]]))).toEqual({ days: 4, by: "household" });
    expect(limitFor("Deseed pomegranate", none)).toBeNull();
    expect(limitFor("Roast sweet potato", none)).toMatchObject({ days: 2, by: "guidance" });
  });
});
