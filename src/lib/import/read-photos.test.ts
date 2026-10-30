import { describe, expect, it } from "vitest";
import { MAX_READ_PHOTOS, readPhotos } from "./read-photos";

const jpeg = (size = 10) => new File([new Uint8Array([0xff, 0xd8, 0xff, ...new Array(size).fill(0)])], "photo.jpg", { type: "image/jpeg" });

describe("checking photos sent to be read", () => {
  it("passes photos on in order, typed by their first bytes", async () => {
    const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1])], "photo.png");
    const result = await readPhotos([jpeg(), png]);
    expect("photos" in result && result.photos.map((p) => p.type)).toEqual(["image/jpeg", "image/png"]);
    expect("photos" in result && result.photos[0].base64).toBe(Buffer.from([0xff, 0xd8, 0xff, ...new Array(10).fill(0)]).toString("base64"));
    expect(await readPhotos([])).toEqual({ photos: [] });
  });

  it("refuses too many, too large, or files that aren't photos", async () => {
    expect(await readPhotos(new Array(MAX_READ_PHOTOS + 1).fill(jpeg()))).toEqual({ error: "Up to 4 photos at a time." });
    expect(await readPhotos([jpeg(1_000_000)])).toEqual({ error: "A photo is too large, even after shrinking." });
    expect(await readPhotos([new File(["<html>"], "photo.jpg", { type: "image/jpeg" })])).toEqual({
      error: "One of the files isn't a photo the app can read (JPEG, PNG or WebP).",
    });
    expect(await readPhotos(["not a file"])).toEqual({ error: "Something wasn't valid. Please reload and try again." });
  });
});
