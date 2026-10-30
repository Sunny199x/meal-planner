import { describe, expect, it } from "vitest";
import { readVideoResponse, youtubeVideoId } from "./youtube";

describe("YouTube links", () => {
  it.each([
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://m.youtube.com/watch?v=dQw4w9WgXcQ&t=42s", "dQw4w9WgXcQ"],
    ["https://youtu.be/dQw4w9WgXcQ?si=abc", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/shorts/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/embed/dQw4w9WgXcQ", "dQw4w9WgXcQ"],
    ["https://youtube.com/live/dQw4w9WgXcQ?feature=share", "dQw4w9WgXcQ"],
    ["https://www.youtube.com/@somechannel", null],
    ["https://www.youtube.com/watch?v=short", null],
    ["https://example.com/watch?v=dQw4w9WgXcQ", null],
    ["not a link", null],
  ])("%s → %s", (link, id) => {
    expect(youtubeVideoId(link)).toBe(id);
  });
});

describe("YouTube's answer", () => {
  it("takes the title, channel, description and the largest thumbnail", () => {
    const answer = {
      items: [
        {
          snippet: {
            title: "15-minute dal",
            channelTitle: "Weeknight Kitchen",
            description: "Ingredients:\n200 g red lentils\n…",
            thumbnails: { default: { url: "https://i.ytimg.com/d.jpg" }, high: { url: "https://i.ytimg.com/h.jpg" } },
          },
        },
      ],
    };
    expect(readVideoResponse(answer)).toEqual({
      title: "15-minute dal",
      channel: "Weeknight Kitchen",
      description: "Ingredients:\n200 g red lentils\n…",
      thumbnail: "https://i.ytimg.com/h.jpg",
    });
  });

  it("returns nothing for a video that isn't there", () => {
    expect(readVideoResponse({ items: [] })).toBeNull();
    expect(readVideoResponse(null)).toBeNull();
  });
});
