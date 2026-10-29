import { beforeEach, describe, expect, it } from "vitest";
import { openLocalDb } from "../db/local";
import type { Db } from "../db/types";
import { getPlan, saveSetup, setupForNewWeek } from "./store";
import { DEFAULT_SETUP } from "./types";

let db: Db;
beforeEach(async () => {
  db = await openLocalDb("memory://");
});

describe("week plan storage", () => {
  it("starts the very first week from the defaults", async () => {
    expect(await getPlan(db, "2026-11-02")).toBeNull();
    expect(await setupForNewWeek(db, "2026-11-02")).toEqual(DEFAULT_SETUP);
  });

  it("saves a setup and updates it in place", async () => {
    await saveSetup(db, "2026-11-02", DEFAULT_SETUP);
    const changed = { ...DEFAULT_SETUP, ingredientsToUse: ["spinach"] };
    const row = await saveSetup(db, "2026-11-02", changed);
    expect(row).toMatchObject({ weekStart: "2026-11-02", setup: changed, dishes: [] });
    expect((await getPlan(db, "2026-11-02"))?.setup.ingredientsToUse).toEqual(["spinach"]);
  });

  it("starts a new week from the previous week's setup, without its ingredients", async () => {
    const sunnyEatsLess = {
      ...DEFAULT_SETUP,
      people: [{ name: "Sunny", dinnerPortion: 1, lunches: 2 }],
      ingredientsToUse: ["feta"],
    };
    await saveSetup(db, "2026-11-02", sunnyEatsLess);
    await saveSetup(db, "2026-12-07", DEFAULT_SETUP); // a later week must not count
    expect(await setupForNewWeek(db, "2026-11-09")).toEqual({ ...sunnyEatsLess, ingredientsToUse: [] });
  });
});
