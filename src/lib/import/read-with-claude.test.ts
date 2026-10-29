import { describe, expect, it } from "vitest";
import { readWithClaude, toDraft } from "./read-with-claude";
import { fakeClaude, SAMPLE_READING } from "./test-reader";

const source = { name: "Pasted text", url: null };

describe("reading a recipe with Claude", () => {
  it("turns Claude's reading into a draft, saying it was translated and what to check", async () => {
    const result = await readWithClaude("Tocăniță de pui ...", source, fakeClaude());
    expect("draft" in result && result.language).toBe("Romanian");
    if (!("draft" in result)) return;
    expect(result.draft).toMatchObject({ title: "Chicken stew with peppers and rice", servings: 4, timeTotalMin: 50, cuisine: "Romanian" });
    expect(result.draft.ingredients[0]).toEqual({ line: "600 g chicken thighs", group: null });
    expect(result.draft.flags).toEqual([
      "Read and translated from Romanian automatically by Claude: compare it with the original before saving.",
      "A cană (cup) of rice was taken as 250 ml.",
    ]);
    // Never filled in by the reader: the household decides.
    expect(result.draft).toMatchObject({ goodAsLeftovers: null, freezerFriendly: null, diet: null });
  });

  it("passes on seafood found in the original language", () => {
    const draft = toDraft({ ...SAMPLE_READING, language: "Swedish", seafood: ["räkor"] }, source);
    expect(draft.flags).toContain("The original mentions seafood: räkor.");
  });

  it("explains when it can't read the text", async () => {
    expect(await readWithClaude("x".repeat(60_001), source, fakeClaude())).toEqual({
      error: "That text is too long for one recipe. Paste just the recipe.",
    });
    expect(await readWithClaude("hello", source, fakeClaude({ ...SAMPLE_READING, isRecipe: false }))).toEqual({
      error: "That doesn't look like a recipe. Paste the ingredients and steps.",
    });
    expect(await readWithClaude("…", source, fakeClaude(SAMPLE_READING, "refusal"))).toEqual({
      error: "Claude declined to read this text.",
    });
    expect(await readWithClaude("…", source, fakeClaude(null))).toEqual({
      error: "Claude's answer couldn't be read. Please try again.",
    });
  });

  it("ignores impossible numbers instead of passing them on", () => {
    const draft = toDraft({ ...SAMPLE_READING, servings: 0, totalMinutes: -5, activeMinutes: 12.4 }, source);
    expect(draft).toMatchObject({ servings: null, timeTotalMin: null, timeActiveMin: 12 });
  });
});
