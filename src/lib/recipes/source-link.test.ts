import { describe, expect, it } from "vitest";
import { describeSourceLink } from "./source-link";

describe("describeSourceLink", () => {
  it.each([
    ["https://www.youtube.com/watch?v=abc123", "youtube", "Watch on YouTube"],
    ["https://youtu.be/abc123", "youtube", "Watch on YouTube"],
    ["https://m.youtube.com/shorts/abc123", "youtube", "Watch on YouTube"],
    ["https://www.instagram.com/p/Cxyz/", "instagram", "Open on Instagram"],
    ["https://instagram.com/reel/Cxyz", "instagram", "Open on Instagram"],
    ["https://www.bbcgoodfood.com/recipes/chana-masala", "website", "Open on bbcgoodfood.com"],
    ["http://ica.se/recept/daal", "website", "Open on ica.se"],
  ])("%s", (url, kind, label) => {
    expect(describeSourceLink(url)).toEqual({ kind, label });
  });

  it("ignores things that aren't web links", () => {
    expect(describeSourceLink("not a link")).toBeNull();
    expect(describeSourceLink("javascript:alert(1)")).toBeNull();
    expect(describeSourceLink("ftp://example.com/file")).toBeNull();
  });

  it("doesn't mistake look-alike domains", () => {
    expect(describeSourceLink("https://notyoutube.com/watch")?.kind).toBe("website");
    expect(describeSourceLink("https://instagram.com.example.org/p/1")?.kind).toBe("website");
  });
});
