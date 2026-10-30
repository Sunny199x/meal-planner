import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { decodeEntities, isoMinutes, readRecipePage, recipeAsText } from "./recipe-page";

const page = (name: string) => readFileSync(path.join(process.cwd(), "src/lib/import/__fixtures__", name), "utf8");

describe("reading a recipe web page", () => {
  it("finds the recipe in a WordPress-style @graph, with sections, times and the best photo", () => {
    const reading = readRecipePage(page("wordpress-graph.html"), "https://spiceandsimmer.example/tikka/");
    expect(reading.recipe).toEqual({
      title: "Easy Chicken Tikka Masala",
      servings: "4",
      totalMinutes: 45,
      prepMinutes: 15,
      cookMinutes: 30,
      cuisine: "Indian",
      ingredients: [
        "1 1/2 lbs boneless chicken thighs",
        "1 cup plain yogurt",
        "2 tbsp garam masala",
        "1 (14 oz) can tomato sauce",
        "1 cup heavy cream",
        "1/4 cup chopped cilantro",
      ],
      steps: [
        "Marinate: Mix the chicken with the yogurt and half the garam masala.",
        "Cook: Brown the chicken & set aside.",
        "Simmer the sauce with the cream for 15 minutes, then add the chicken.",
      ],
    });
    expect(reading.image).toBe("https://cdn.example.com/tikka-1x1.jpg");
    expect(reading.siteName).toBe("Spice & Simmer");
  });

  it("skips broken blocks, reads a list of types, one-string steps and a relative photo address", () => {
    const reading = readRecipePage(page("plain-array.html"), "https://weeknight.example/tacos");
    expect(reading.recipe).toMatchObject({
      title: "Black Bean Tacos",
      servings: "6",
      totalMinutes: 25,
      steps: ["Warm the beans.", "Fill the tortillas.", "Squeeze over the lime."],
    });
    expect(reading.image).toBe("https://weeknight.example/images/tacos.jpg");
    expect(reading.siteName).toBe("Weeknight Kitchen");
  });

  it("falls back to the page's visible text when there is no recipe block", () => {
    const reading = readRecipePage(page("no-recipe-data.html"), "https://blog.example.com/soup");
    expect(reading.recipe).toBeNull();
    expect(reading.text).toContain("250 g red lentils");
    expect(reading.text).toContain("Add the lentils and stock and simmer for 25 minutes.");
    expect(reading.text).not.toContain("tracking");
    expect(reading.text).not.toContain("Home · About");
    expect(reading.image).toBe("https://blog.example.com/soup.jpg");
    expect(reading.title).toBe("Grandma's lentil soup");
  });

  it("writes the recipe block out as short text for Claude", () => {
    const reading = readRecipePage(page("plain-array.html"), "https://weeknight.example/tacos");
    expect(recipeAsText(reading.recipe!)).toBe(
      [
        "Title: Black Bean Tacos",
        "Servings: 6",
        "Time: total 25 minutes",
        "",
        "Ingredients:",
        "- 2 cans black beans",
        "- 8 small tortillas",
        "- 1 lime",
        "",
        "Steps:",
        "1. Warm the beans.",
        "2. Fill the tortillas.",
        "3. Squeeze over the lime.",
      ].join("\n"),
    );
  });

  it("reads durations and HTML entities", () => {
    expect(isoMinutes("PT1H30M")).toBe(90);
    expect(isoMinutes("PT0S")).toBeNull();
    expect(isoMinutes("30 minutes")).toBeNull();
    expect(decodeEntities("Mac &amp; cheese at 180&deg;C &#8211; &#x2764;")).toBe("Mac & cheese at 180°C – ❤");
  });
});
