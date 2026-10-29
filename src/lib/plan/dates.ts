// Weeks run Monday to Sunday and are named by their Monday ("2026-11-02").
// Dates are worked out in Stockholm time, whatever time zone the server uses.

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in Stockholm as YYYY-MM-DD. */
export function stockholmToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Stockholm" }).format(now);
}

function toUtc(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

export function addDays(date: string, days: number): string {
  const d = toUtc(date);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
export function weekday(date: string): number {
  return (toUtc(date).getUTCDay() + 6) % 7;
}

/** The week to plan: today's if it's Monday, otherwise the coming Monday's. */
export function defaultWeekStart(today: string): string {
  const day = weekday(today);
  return day === 0 ? today : addDays(today, 7 - day);
}

/** A valid Monday from the address, or null. */
export function readWeekStart(value: unknown): string | null {
  if (typeof value !== "string" || !DATE.test(value)) return null;
  const parsed = toUtc(value);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) return null;
  return weekday(value) === 0 ? value : null;
}

/** "2–8 November", or "30 November – 6 December" across months. */
export function formatWeek(weekStart: string): string {
  const start = toUtc(weekStart);
  const end = toUtc(addDays(weekStart, 6));
  const month = (d: Date) => d.toLocaleDateString("en-GB", { month: "long", timeZone: "UTC" });
  return start.getUTCMonth() === end.getUTCMonth()
    ? `${start.getUTCDate()}–${end.getUTCDate()} ${month(end)}`
    : `${start.getUTCDate()} ${month(start)} – ${end.getUTCDate()} ${month(end)}`;
}
