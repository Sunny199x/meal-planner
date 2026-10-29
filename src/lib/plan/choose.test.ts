import { describe, expect, it } from "vitest";
import { addDish, minutesToChoose, moveDish, pickEvening, removeDish, setRepeat, timeClash } from "./choose";
import { openEvenings } from "./suggest";
import { DEFAULT_SETUP, readDishes, type WeekSetup } from "./types";

// Mon normal, Tue quick, Wed quick, Thu normal, Fri off, Sat relaxed, Sun off
const setup: WeekSetup = {
  ...DEFAULT_SETUP,
  evenings: [
    { cooking: true, time: "normal" },
    { cooking: true, time: "quick" },
    { cooking: true, time: "quick" },
    { cooking: true, time: "normal" },
    { cooking: false, time: "normal" },
    { cooking: true, time: "relaxed" },
    { cooking: false, time: "relaxed" },
  ],
};
const ID = (n: number) => `00000000-0000-4000-8000-00000000000${n}`;
const now = new Date("2026-11-01T10:00:00Z");

describe("placing dishes on evenings", () => {
  it("puts a dish on the next open evening it fits", () => {
    expect(pickEvening({ timeTotalMin: 20 }, setup, [])).toBe(0);
    expect(pickEvening({ timeTotalMin: 90 }, setup, [])).toBe(5); // only the Relaxed evening is long enough
  });

  it("goes to the next empty day, skipping evenings that are too short", () => {
    // Victoria's report: Monday taken, Tuesday is the next empty day, so a 25-minute dish goes there, not to a later Quick evening.
    const monday = [{ recipeId: ID(1), day: 0, addedAt: "", via: "start" as const }];
    expect(pickEvening({ timeTotalMin: 25 }, setup, monday)).toBe(1);
    // Tuesday and Wednesday are Quick (up to 25 min), so a 40-minute dish skips to Thursday.
    expect(pickEvening({ timeTotalMin: 40 }, setup, monday)).toBe(3);
  });

  it("skips taken evenings and returns null when nothing fits", () => {
    let dishes = addDish([], { id: ID(1), timeTotalMin: 20 }, setup, "start", now);
    dishes = addDish(dishes, { id: ID(2), timeTotalMin: 20 }, setup, "suggestion", now);
    expect(dishes.map((d) => d.day)).toEqual([0, 1]);
    expect(pickEvening({ timeTotalMin: 90 }, setup, [...dishes, { recipeId: ID(3), day: 5, addedAt: "", via: "browse" }])).toBeNull();
  });

  it("doesn't add the same recipe twice", () => {
    const once = addDish([], { id: ID(1), timeTotalMin: 20 }, setup, "start", now);
    expect(addDish(once, { id: ID(1), timeTotalMin: 20 }, setup, "browse", now)).toBe(once);
  });

  it("moves, swaps and removes dishes", () => {
    const dishes = [
      { recipeId: ID(1), day: 0, addedAt: "", via: "start" as const },
      { recipeId: ID(2), day: 1, addedAt: "", via: "suggestion" as const },
    ];
    expect(moveDish(dishes, ID(1), 1).map((d) => d.day)).toEqual([1, 0]);
    expect(moveDish(dishes, ID(1), 3).map((d) => d.day)).toEqual([3, 1]);
    expect(removeDish(dishes, ID(1)).map((d) => d.recipeId)).toEqual([ID(2)]);
  });

  it("keeps an evening of leftovers only after its dish, on an evening nothing is cooked", () => {
    const dishes = [
      { recipeId: ID(1), day: 0, addedAt: "", via: "start" as const },
      { recipeId: ID(2), day: 1, addedAt: "", via: "suggestion" as const },
    ];
    const repeated = setRepeat(dishes, ID(1), 2);
    expect(repeated[0].alsoOn).toBe(2);
    expect(openEvenings({ setup, dishes: repeated, dismissed: [] })).toEqual([3, 5]);
    expect(pickEvening({ timeTotalMin: 20 }, setup, repeated)).toBe(3);
    // Cooking something on the leftovers evening, or moving the dish after it, clears it.
    expect(moveDish(repeated, ID(2), 2)[0].alsoOn).toBeNull();
    expect(moveDish(repeated, ID(1), 3)[0].alsoOn).toBeNull();
    expect(setRepeat(repeated, ID(1), null)[0].alsoOn).toBeNull();
    expect(setRepeat(dishes, ID(2), 0)[1].alsoOn).toBeNull();
  });

  it("reports a dish on an evening that's too short", () => {
    expect(timeClash({ timeTotalMin: 45 }, setup, 1)).toBe("Takes 45 min on a Quick evening (up to 25 min).");
    expect(timeClash({ timeTotalMin: 20 }, setup, 1)).toBeNull();
    expect(timeClash({ timeTotalMin: 90 }, setup, 5)).toBeNull();
  });
});

describe("minutesToChoose", () => {
  const at = (iso: string) => ({ recipeId: ID(1), day: 0, addedAt: iso, via: "start" as const });
  it("measures from the first save to the last dish added", () => {
    expect(minutesToChoose("2026-11-01T10:00:00Z", [at("2026-11-01T10:00:00Z"), at("2026-11-01T10:11:20Z")])).toBe(11);
    expect(minutesToChoose("2026-11-01T10:00:00Z", [at("2026-11-01T10:00:10Z")])).toBe(1);
  });
  it("says nothing for several sittings or missing data", () => {
    expect(minutesToChoose("2026-11-01T10:00:00Z", [at("2026-11-02T09:00:00Z")])).toBeNull();
    expect(minutesToChoose(null, [at("2026-11-01T10:00:00Z")])).toBeNull();
    expect(minutesToChoose("2026-11-01T10:00:00Z", [])).toBeNull();
  });
});

describe("readDishes", () => {
  it("accepts valid dishes and refuses tampered ones", () => {
    const valid = [{ recipeId: ID(1), day: 2, addedAt: now.toISOString(), via: "start" }];
    expect(readDishes(valid)).toEqual(valid);
    expect(readDishes([{ ...valid[0], day: 9 }])).toBeNull();
    expect(readDishes([{ ...valid[0], recipeId: "x" }])).toBeNull();
    expect(readDishes([valid[0], valid[0]])).toBeNull();
    expect(readDishes([{ ...valid[0], via: "hack" }])).toBeNull();
    expect(readDishes("nope")).toBeNull();
  });

  it("accepts lunch boxes, freezer portions and a repeat evening within limits", () => {
    const full = [{ recipeId: ID(1), day: 2, addedAt: now.toISOString(), via: "start", lunches: [2, 0], freezer: 2, alsoOn: 4 }];
    expect(readDishes(full)).toEqual(full);
    expect(readDishes([{ ...full[0], alsoOn: null }])?.[0].alsoOn).toBeNull();
    expect(readDishes([{ ...full[0], lunches: [-1] }])).toBeNull();
    expect(readDishes([{ ...full[0], lunches: [1.5] }])).toBeNull();
    expect(readDishes([{ ...full[0], freezer: 99 }])).toBeNull();
    expect(readDishes([{ ...full[0], alsoOn: 7 }])).toBeNull();
  });
});
