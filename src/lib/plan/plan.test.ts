import { describe, expect, it } from "vitest";
import { addDays, defaultWeekStart, formatWeek, readWeekStart, stockholmToday, weekday } from "./dates";
import { DEFAULT_SETUP, portionsNeeded, readSetup } from "./types";

describe("week dates", () => {
  it("uses Stockholm time, not the server's", () => {
    // 23:30 UTC on Sunday 1 November is already Monday 2 November in Stockholm.
    expect(stockholmToday(new Date("2026-11-01T23:30:00Z"))).toBe("2026-11-02");
    expect(stockholmToday(new Date("2026-11-01T22:30:00Z"))).toBe("2026-11-01");
  });

  it("plans the coming week, or this week on a Sunday (weeks run Sunday to Saturday)", () => {
    expect(weekday("2026-11-01")).toBe(0); // Sunday
    expect(weekday("2026-11-07")).toBe(6); // Saturday
    expect(defaultWeekStart("2026-10-29")).toBe("2026-11-01"); // Thursday
    expect(defaultWeekStart("2026-10-31")).toBe("2026-11-01"); // Saturday
    expect(defaultWeekStart("2026-11-01")).toBe("2026-11-01"); // Sunday: the week starting today
    expect(defaultWeekStart("2026-11-02")).toBe("2026-11-08"); // Monday
  });

  it("accepts only real Sundays from the address", () => {
    expect(readWeekStart("2026-11-01")).toBe("2026-11-01");
    expect(readWeekStart("2026-11-02")).toBeNull(); // a Monday, as weeks were named before
    expect(readWeekStart("2026-11-03")).toBeNull();
    expect(readWeekStart("2026-02-30")).toBeNull();
    expect(readWeekStart("next week")).toBeNull();
    expect(readWeekStart(undefined)).toBeNull();
  });

  it("names weeks readably", () => {
    expect(formatWeek("2026-11-01")).toBe("1–7 November");
    expect(formatWeek("2026-11-29")).toBe("29 November – 5 December");
    expect(addDays("2026-12-28", 7)).toBe("2027-01-04");
  });
});

describe("week setup", () => {
  it("defaults to five weekday dinners for Sunny and Victoria, with Sunny's lunches", () => {
    expect(DEFAULT_SETUP.people.map((p) => p.name)).toEqual(["Sunny", "Victoria"]);
    // Sunny's 4 lunch boxes are his dinner size, 1.5 portions each.
    expect(portionsNeeded(DEFAULT_SETUP)).toEqual({ perDinner: 2.5, dinners: 12.5, lunches: 6, total: 18.5 });
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
