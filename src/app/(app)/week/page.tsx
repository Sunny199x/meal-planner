import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ErrorBox } from "@/components/ui";
import { describeDatabaseError, getDb } from "@/lib/db";
import type { WeekPlanRow } from "@/lib/db/schema";
import { addDays, defaultWeekStart, formatWeek, readWeekStart, stockholmToday } from "@/lib/plan/dates";
import { getPlan, setupForNewWeek } from "@/lib/plan/store";
import type { WeekSetup } from "@/lib/plan/types";
import { WeekSetupPanel } from "./week-setup";

export default function WeekPage({ searchParams }: PageProps<"/week">) {
  return (
    <div className="space-y-4">
      <Suspense fallback={<p className="text-muted">Loading the week…</p>}>
        <Week searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Week({ searchParams }: Pick<PageProps<"/week">, "searchParams">) {
  const { week } = await searchParams;
  await connection();
  const comingWeek = defaultWeekStart(stockholmToday());
  const weekStart = readWeekStart(Array.isArray(week) ? week[0] : week) ?? comingWeek;

  let plan: WeekPlanRow | null;
  let startingSetup: WeekSetup;
  try {
    const db = await getDb();
    plan = await getPlan(db, weekStart);
    startingSetup = plan?.setup ?? (await setupForNewWeek(db, weekStart));
  } catch (error) {
    return <ErrorBox>{describeDatabaseError(error)}</ErrorBox>;
  }

  const relative =
    weekStart === comingWeek
      ? "Coming week"
      : weekStart === addDays(comingWeek, -7)
        ? "Last week"
        : weekStart < comingWeek
          ? "Earlier week"
          : "Later week";

  return (
    <>
      <header className="flex items-center justify-between gap-2">
        <Link
          href={`/week?week=${addDays(weekStart, -7)}`}
          aria-label="Previous week"
          className="rounded-full px-3 py-2 text-xl text-muted hover:bg-cream hover:text-ink"
        >
          ‹
        </Link>
        <div className="text-center">
          <p className="text-sm font-medium tracking-wide text-sage uppercase">{relative}</p>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">{formatWeek(weekStart)}</h1>
        </div>
        <Link
          href={`/week?week=${addDays(weekStart, 7)}`}
          aria-label="Next week"
          className="rounded-full px-3 py-2 text-xl text-muted hover:bg-cream hover:text-ink"
        >
          ›
        </Link>
      </header>
      <WeekSetupPanel
        key={weekStart}
        weekStart={weekStart}
        savedSetup={plan?.setup ?? null}
        startingSetup={startingSetup}
      />
      {plan && (
        <p className="rounded-xl border border-dashed border-line px-4 py-3 text-sm text-muted">
          Choosing dinners with suggestions is the next step of this milestone and isn&apos;t built yet.
        </p>
      )}
    </>
  );
}
