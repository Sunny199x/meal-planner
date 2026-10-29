import { describe, expect, it } from "vitest";
import { prepareImport } from "./sources";

describe("what gets read for each kind of paste", () => {
  it("uses pasted text on its own, named after where it's from", async () => {
    expect(await prepareImport("", " 200 g lentils … ", "")).toEqual({
      text: "200 g lentils …",
      source: { name: "Pasted text", url: null },
      photo: null,
    });
    expect(await prepareImport("", "200 g lentils", "Grandma's notebook")).toMatchObject({ source: { name: "Grandma's notebook" } });
  });

  it("asks for the caption, or the description when there's no YouTube key", async () => {
    expect(await prepareImport("https://www.instagram.com/p/abc/", "", "")).toEqual({
      error: "The app can't read Instagram posts yet. Copy the post's caption and paste it below.",
    });
    // Without YOUTUBE_API_KEY the description has to be pasted.
    expect(await prepareImport("https://youtu.be/dQw4w9WgXcQ", "", "")).toMatchObject({
      error: expect.stringContaining("needs a YouTube key"),
    });
  });

  it("keeps the link with a pasted caption", async () => {
    expect(await prepareImport("https://www.instagram.com/p/abc/", "Caption with the recipe", "")).toEqual({
      text: "Caption with the recipe",
      source: { name: "Instagram", url: "https://www.instagram.com/p/abc/" },
      photo: null,
    });
  });

  it("prefers pasted text over reading a website, keeping the site as the source", async () => {
    expect(await prepareImport("https://www.bbcgoodfood.com/recipes/dal", "the recipe", "")).toEqual({
      text: "the recipe",
      source: { name: "bbcgoodfood.com", url: "https://www.bbcgoodfood.com/recipes/dal" },
      photo: null,
    });
  });

  it("explains what's wrong instead of failing", async () => {
    expect(await prepareImport("", "  ", "")).toEqual({ error: "Paste a link or the recipe text first." });
    expect(await prepareImport("not a link", "", "")).toMatchObject({ error: expect.stringContaining("isn't a web address") });
    expect(await prepareImport("http://192.168.1.1/recipe", "", "")).toEqual({ error: "That address isn't on the public internet." });
  });
});
