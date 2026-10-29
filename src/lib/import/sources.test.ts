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

  it("asks for the caption or description where the site doesn't let apps read it", async () => {
    expect(await prepareImport("https://www.instagram.com/p/abc/", "", "")).toEqual({
      error: "Instagram doesn't let apps read posts. Copy the post's caption and paste it below.",
    });
    expect(await prepareImport("https://youtu.be/xyz", "", "")).toMatchObject({ error: expect.stringContaining("YouTube doesn't let apps") });
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
