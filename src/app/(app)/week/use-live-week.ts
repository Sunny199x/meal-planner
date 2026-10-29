"use client";

import { loadWeekAction, type SavedWeek } from "@/lib/plan/actions";
import { useLiveData } from "../use-live-data";

/** A week's plan and ticks, kept in step with the other phone (see `useLiveData`). */
export function useLiveWeek(weekStart: string, initial: SavedWeek) {
  const { data, error, send } = useLiveData(
    weekStart,
    () => loadWeekAction(weekStart).then((r) => r.week ?? null),
    initial,
  );
  return { week: data, error, send };
}
