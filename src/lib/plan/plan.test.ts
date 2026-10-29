import { describe, expect, it } from "vitest";
import { addDays, defaultWeekStart, formatWeek, readWeekStart, stockholmToday, weekday } from "./dates";
import { DEFAULT_SETUP, portionsNeeded, readSetup } from "./types";

describe("week dates", () => {
  it("uses Stockholm time, not the server's", () => {
    // 23:30 UTC on Sunday 1 November is already Monday 2 November in Stockholm.
    expect(stockholmToday(new Date("2026-11-01T23:30:00Z"))).toBe("2026-11-02");
    expect(stockholmToday(new Date("2026-11-01T22:30:00Z"))).toBe("2026-11-01");
  });

  it("plans the coming week, or this week on a Monday", () => {
    expect(weekday("2026-11-02")).toBe(0);
    expect(defaultWeekStart("2026-10-29")).toBe("2026-11-02"); // Thursday
    expect(defaultWeekStart("2026-11-01")).toBe("2026-11-02"); // Sunday
    expect(defaultWeekStart("2026-11-02")).toBe("2026-11-02"); // Monday
  });

  it("accepts only real Mondays from the address", () => {
    expect(readWeekStart("2026-11-02")).toBe("2026-11-02");
    expect(readWeekStart("2026-11-03")).toBeNull();
    expect(readWeekStart("2026-02-30")).toBeNull();
    expect(readWeekStart("next week")).toBeNull();
    expect(readWeekStart(undefined)).toBeNull();
  });

  it("names weeks readably", () => {
    expect(formatWeek("2026-11-02")).toBe("2–8 November");
    expect(formatWeek("2026-11-30")).toBe("30 November – 6 December");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });
});

describe("week setup", () => {
  it("defaults to five weekday dinners for Sunny and Victoria, with Sunny's lunches", () => {
    expect(DEFAULT_SETUP.people.map((p) => p.name)).toEqual(["Sunny", "Victoria"]);
    expect(portionsNeeded(DEFAULT_SETUP)).toEqual({ perDinner: 2.5, dinners: 12.5, lunches: 4, total: 16.5 });
  });

  it("accepts a valid setup and tidies text", () => {
    const setup = readSetup({ ...DEFAULT_SETUP, ingredientsToUse: [" spinach ", "", "feta"] });
    expect(setup?.ingredientsToUse).toEqual(["spinach", "feta"]);
  });

  it("refuses broken or tampered setups", () => {
    expect(readSetup(null)).toBeNull();
    expect(readSetup({ ...DEFAULT_SETUP, evenings: DEFAULT_SETUP.evenings.slice(0, 6) })).toBeNull();
    expect(
      readSetup({ ...DEFAULT_SETUP, evenings: DEFAULT_SETUP.evenings.map(() => ({ cooking: true, time: "forever" })) }),
    ).toBeNull();
    expect(readSetup({ ...DEFAULT_SETUP, people: [{ name: "Sunny", dinnerPortion: 7, lunches: 0 }] })).toBeNull();
    expect(readSetup({ ...DEFAULT_SETUP, people: [{ name: "Sunny", dinnerPortion: 1, lunches: 1.5 }] })).toBeNull();
  });
});
