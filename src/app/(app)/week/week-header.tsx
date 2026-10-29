import Link from "next/link";
import { addDays, formatWeek } from "@/lib/plan/dates";

const TABS = [
  { path: "/week", label: "Dinners" },
  { path: "/week/shopping", label: "Shopping" },
  { path: "/week/prep", label: "Sunday prep" },
] as const;

export type WeekTab = (typeof TABS)[number]["path"];

/** The week's dates with arrows to the weeks around it, and tabs for its parts. */
export function WeekHeader({ weekStart, comingWeek, tab }: { weekStart: string; comingWeek: string; tab: WeekTab }) {
  const relative =
    weekStart === comingWeek
      ? "Coming week"
      : weekStart === addDays(comingWeek, -7)
        ? "Last week"
        : weekStart < comingWeek
          ? "Earlier week"
          : "Later week";
  const arrow = "rounded-full px-3 py-2 text-xl text-muted hover:bg-cream hover:text-ink";
  return (
    <>
      <header className="flex items-center justify-between gap-2">
        <Link href={`${tab}?week=${addDays(weekStart, -7)}`} aria-label="Previous week" className={arrow}>
          ‹
        </Link>
        <div className="text-center">
          <p className="text-sm font-medium tracking-wide text-sage uppercase">{relative}</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{formatWeek(weekStart)}</h1>
        </div>
        <Link href={`${tab}?week=${addDays(weekStart, 7)}`} aria-label="Next week" className={arrow}>
          ›
        </Link>
      </header>
      <nav aria-label="Parts of the week" className="flex gap-1 rounded-full bg-cream p-1">
        {TABS.map((t) => (
          <Link
            key={t.path}
            href={`${t.path}?week=${weekStart}`}
            aria-current={t.path === tab ? "page" : undefined}
            className={`flex-1 rounded-full px-3 py-1.5 text-center text-sm ${
              t.path === tab ? "bg-paper font-medium shadow-sm" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </nav>
    </>
  );
}
