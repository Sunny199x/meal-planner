import { beforeEach, describe, expect, it } from "vitest";
import { openLocalDb } from "../db/local";
import type { Db } from "../db/types";
import { parseRecipeFile } from "./parse-recipe-file";
import { photoUrl } from "./photo-url";
import { getRecipePhoto, photoType, removeRecipePhoto, saveRecipePhoto } from "./photos";
import { deleteRecipe, insertRecipe } from "./save";
import { readTemplateFixtures } from "./test-fixtures";

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]);
const WEBP = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);

describe("checking a photo", () => {
  it("recognises JPEG, PNG and WebP by their first bytes", () => {
    expect(photoType(JPEG)).toBe("image/jpeg");
    expect(photoType(PNG)).toBe("image/png");
    expect(photoType(WEBP)).toBe("image/webp");
  });

  it("refuses anything else, whatever it is called", () => {
    expect(photoType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(photoType(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBeNull(); // a PDF
    expect(photoType(new Uint8Array([]))).toBeNull();
  });

  it("builds the address with a version, or none without a photo", () => {
    expect(photoUrl("abc", "k2")).toBe("/photos/abc?v=k2");
    expect(photoUrl("abc", null)).toBeNull();
  });
});

describe("storing photos", () => {
  let db: Db;
  let id: string;
  beforeEach(async () => {
    db = await openLocalDb("memory://");
    const [template] = await readTemplateFixtures();
    id = await insertRecipe(db, parseRecipeFile(template.fileName, template.text).recipe!);
  });

  it("saves, replaces and removes a recipe's photo, keeping the version in step", async () => {
    expect(await saveRecipePhoto(db, id, JPEG, "upload")).toBe(true);
    const first = (await db.query.recipes.findFirst({ where: (r, { eq }) => eq(r.id, id) }))?.photoVersion;
    expect(first).toBeTruthy();
    expect(await getRecipePhoto(db, id)).toEqual({ contentType: "image/jpeg", bytes: Buffer.from(JPEG) });

    await new Promise((r) => setTimeout(r, 5));
    await saveRecipePhoto(db, id, PNG, "website", "https://example.com/dish.png");
    expect((await getRecipePhoto(db, id))?.contentType).toBe("image/png");

    await removeRecipePhoto(db, id);
    expect(await getRecipePhoto(db, id)).toBeNull();
  });

  it("refuses a file that isn't a photo, and a recipe that doesn't exist", async () => {
    await expect(saveRecipePhoto(db, id, new TextEncoder().encode("hello"), "upload")).rejects.toThrow();
    expect(await saveRecipePhoto(db, "00000000-0000-4000-8000-000000000000", JPEG, "upload")).toBe(false);
  });

  it("removes the photo together with its recipe", async () => {
    await saveRecipePhoto(db, id, JPEG, "upload");
    await deleteRecipe(db, id);
    expect(await getRecipePhoto(db, id)).toBeNull();
  });
});
